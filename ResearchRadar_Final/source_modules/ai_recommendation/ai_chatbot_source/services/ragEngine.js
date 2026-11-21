import { config } from '../config/env.js';
import { getGeminiEmbedding } from './gemini.js';
import { searchPoints } from './qdrant.js';
import { generateGroqCompletion, streamGroqCompletion } from './groq.js';
import {
  getCAGCache,
  setCAGCache,
  getSessionMemory,
  appendTurnToSession,
  trackFaqFrequency,
} from './redis.js';

/**
 * Contextual Query Rewriter for MAG (Memory-Augmented Generation)
 * Resolves pronouns and referential terms into standalone search queries
 */
async function contextualizeQuery(query, sessionMemory) {
  if (!config.rag.magEnabled || !sessionMemory.history || sessionMemory.history.length === 0) {
    return query;
  }

  // Check if query is referential or short
  const needsContext =
    /\b(it|they|them|he|she|this|that|these|those|former|latter|first|second|third|previous|above|the paper|the author|the authors)\b/i.test(query) ||
    query.length < 35;

  if (!needsContext) return query;

  try {
    const recent = sessionMemory.history.slice(-4);
    const rewriteRes = await generateGroqCompletion([
      {
        role: 'system',
        content:
          'Given the conversation history, rewrite the user query into a single, complete, standalone academic search query that incorporates explicit paper titles, authors, and topics from previous turns. Output ONLY the rewritten search query with NO quotes, NO explanations, and NO prefixes.',
      },
      ...recent.map((t) => ({ role: t.role, content: t.content })),
      { role: 'user', content: query },
    ], { maxTokens: 80, temperature: 0.1 });

    const rewritten = rewriteRes.content.trim().replace(/^["']|["']$/g, '');
    return rewritten.length > 5 ? rewritten : query;
  } catch (err) {
    console.warn('[MAG Query Contextualization Warning]', err.message);
    return query;
  }
}

/**
 * Builds the LLM prompt messages from context, history, and current question
 */
function constructPromptMessages(query, retrievedSources, sessionMemory) {
  const messages = [];

  // 1. If MAG history exists, inject past turns
  if (sessionMemory.summary) {
    messages.push({
      role: 'system',
      content: `Ongoing Session Context Summary:\n${sessionMemory.summary}`,
    });
  }

  if (sessionMemory.history && sessionMemory.history.length > 0) {
    for (const turn of sessionMemory.history) {
      if (turn.role === 'user' || turn.role === 'assistant') {
        messages.push({
          role: turn.role,
          content: turn.content,
        });
      }
    }
  }

  // 2. Format Retrieved Context from Qdrant
  let contextBlock = '';
  if (retrievedSources.length > 0) {
    contextBlock = retrievedSources
      .map((src, i) => {
        const title = src.title || 'Untitled';
        const authors = src.authors?.length ? src.authors.join(', ') : 'Unknown Authors';
        const year = src.publicationYear || src.publicationDate || 'n.d.';
        const sourceName = src.source || 'Academic Database';
        const url = src.url || (src.doi ? `https://doi.org/${src.doi}` : '');
        const score = (src.score * 100).toFixed(1);

        return `### Document [${i + 1}]: ${title}
- Relevance Match: ${score}%
- Authors: ${authors}
- Published: ${year} (${sourceName})
${url ? `- Link: ${url}` : ''}
${src.doi ? `- DOI: ${src.doi}` : ''}
- Content:
${src.chunkText || src.abstract}
`;
      })
      .join('\n---\n\n');
  } else {
    contextBlock = 'No directly matching academic papers found in the primary vector index for this specific query.';
  }

  // 3. User Query with Context Injection
  const userContent = `RETRIEVED ACADEMIC CONTEXT:
${contextBlock}

USER QUERY:
${query}

Please provide a direct, insightful, and clearly structured answer following the system guidelines. If citing the papers above, cite them with author, year, and markdown links to their URLs/DOIs.`;

  messages.push({
    role: 'user',
    content: userContent,
  });

  return messages;
}

/**
 * Execute standard RAG pipeline (non-streaming)
 */
export async function executeRAG(query, { sessionId = 'default-session', bypassCache = false } = {}) {
  const startTime = Date.now();

  // 1. Track query frequency for Dynamic FAQ
  trackFaqFrequency(query).catch(() => {});

  // 2. Check CAG (Cache-Augmented Generation)
  if (!bypassCache) {
    const cached = await getCAGCache(query);
    if (cached) {
      return {
        ...cached,
        latencyMs: Date.now() - startTime,
        fromCache: true,
      };
    }
  }

  // 3. Retrieve MAG (Memory-Augmented Generation) session context
  const sessionMemory = await getSessionMemory(sessionId);

  // 4. Contextualize Query for Vector Search (MAG)
  const vectorSearchQuery = await contextualizeQuery(query, sessionMemory);

  // 5. Generate Embedding via Gemini (3072 dims)
  const queryVector = await getGeminiEmbedding(vectorSearchQuery);

  // 6. Vector Search in Qdrant
  const retrievedSources = await searchPoints(queryVector, {
    limit: config.rag.topK,
    scoreThreshold: config.rag.similarityThreshold,
  });

  // Deduplicate sources by paper title or ID
  const uniqueSources = [];
  const seenIds = new Set();
  for (const s of retrievedSources) {
    const idKey = s.doi || s.title;
    if (!seenIds.has(idKey)) {
      seenIds.add(idKey);
      uniqueSources.push(s);
    }
  }

  // 6. Construct prompt
  const messages = constructPromptMessages(query, uniqueSources, sessionMemory);

  // 7. Generate Response via Groq
  const completion = await generateGroqCompletion(messages);
  const responseText = completion.content;
  const totalLatency = Date.now() - startTime;

  const result = {
    answer: responseText,
    sources: uniqueSources.map((s) => ({
      title: s.title,
      authors: s.authors,
      source: s.source,
      year: s.publicationYear,
      doi: s.doi,
      url: s.url,
      score: s.score,
      snippet: (s.abstract || s.chunkText).slice(0, 250) + '...',
    })),
    model: completion.model,
    sessionId,
    latencyMs: totalLatency,
    fromCache: false,
  };

  // 8. Update Redis CAG & MAG
  await Promise.allSettled([
    setCAGCache(query, result),
    appendTurnToSession(sessionId, query, responseText, uniqueSources),
  ]);

  return result;
}

/**
 * Execute streaming RAG pipeline with Server-Sent Events
 */
export async function executeRAGStream(query, { sessionId = 'default-session', bypassCache = false, onChunk, onSources } = {}) {
  const startTime = Date.now();

  // 1. Dynamic FAQ tracking
  trackFaqFrequency(query).catch(() => {});

  // 2. CAG Check
  if (!bypassCache) {
    const cached = await getCAGCache(query);
    if (cached) {
      if (onSources) onSources(cached.sources || []);
      // Stream cached content in fast simulated chunks for smooth UI animation
      const words = cached.answer.split(' ');
      for (const w of words) {
        onChunk(w + ' ');
        await new Promise((r) => setTimeout(r, 8));
      }
      return {
        ...cached,
        latencyMs: Date.now() - startTime,
        fromCache: true,
      };
    }
  }

  // 3. MAG Session Memory
  const sessionMemory = await getSessionMemory(sessionId);

  // 4. Contextualize Query for Vector Search (MAG)
  const vectorSearchQuery = await contextualizeQuery(query, sessionMemory);

  // 5. Gemini Embedding
  const queryVector = await getGeminiEmbedding(vectorSearchQuery);

  // 6. Qdrant Search
  const retrievedSources = await searchPoints(queryVector, {
    limit: config.rag.topK,
    scoreThreshold: config.rag.similarityThreshold,
  });

  const uniqueSources = [];
  const seenIds = new Set();
  for (const s of retrievedSources) {
    const idKey = s.doi || s.title;
    if (!seenIds.has(idKey)) {
      seenIds.add(idKey);
      uniqueSources.push(s);
    }
  }

  // Notify client of retrieved sources immediately
  const formattedSources = uniqueSources.map((s) => ({
    title: s.title,
    authors: s.authors,
    source: s.source,
    year: s.publicationYear,
    doi: s.doi,
    url: s.url,
    score: s.score,
    snippet: (s.abstract || s.chunkText).slice(0, 250) + '...',
  }));

  if (onSources) {
    onSources(formattedSources);
  }

  // 6. Prompt
  const messages = constructPromptMessages(query, uniqueSources, sessionMemory);

  // 7. Stream from Groq
  const fullAnswer = await streamGroqCompletion(messages, onChunk);
  const totalLatency = Date.now() - startTime;

  const result = {
    answer: fullAnswer,
    sources: formattedSources,
    model: config.groq.model,
    sessionId,
    latencyMs: totalLatency,
    fromCache: false,
  };

  // 8. Update Redis CAG & MAG
  await Promise.allSettled([
    setCAGCache(query, result),
    appendTurnToSession(sessionId, query, fullAnswer, uniqueSources),
  ]);

  return result;
}
