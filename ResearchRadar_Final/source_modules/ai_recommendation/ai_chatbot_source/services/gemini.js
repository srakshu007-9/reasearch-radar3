import { config } from '../config/env.js';

// Simple LRU-like memory cache to prevent duplicate embedding calls
const embeddingMemoryCache = new Map();
const MAX_CACHE_SIZE = 5000;

/**
 * Embed a single text string using Google Gemini Embedding Model (3072 dim)
 */
export async function getGeminiEmbedding(text, retries = 3) {
  if (!text || typeof text !== 'string') {
    throw new Error('Valid text string is required for embedding');
  }

  const cleanText = text.trim();
  if (embeddingMemoryCache.has(cleanText)) {
    return embeddingMemoryCache.get(cleanText);
  }

  const model = config.gemini.embeddingModel;
  const apiKey = config.gemini.apiKey;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`;

  let lastError = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'AI-Recommendation-RAG/1.0',
        },
        body: JSON.stringify({
          model: `models/${model}`,
          content: {
            parts: [{ text: cleanText }],
          },
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        // If rate limited, backoff
        if (response.status === 429 || response.status >= 500) {
          const waitTime = Math.pow(2, attempt) * 1000 + Math.random() * 500;
          console.warn(`[Gemini Embedding] Attempt ${attempt + 1} failed (${response.status}). Retrying in ${Math.round(waitTime)}ms...`);
          await new Promise((r) => setTimeout(r, waitTime));
          lastError = new Error(`Gemini API ${response.status}: ${errorBody}`);
          continue;
        }
        throw new Error(`Gemini Embedding Error (${response.status}): ${errorBody}`);
      }

      const data = await response.json();
      const values = data?.embedding?.values;

      if (!values || !Array.isArray(values) || values.length === 0) {
        throw new Error('Gemini API returned invalid or empty embedding vector');
      }

      // Cache vector
      if (embeddingMemoryCache.size >= MAX_CACHE_SIZE) {
        const firstKey = embeddingMemoryCache.keys().next().value;
        embeddingMemoryCache.delete(firstKey);
      }
      embeddingMemoryCache.set(cleanText, values);

      return values;
    } catch (err) {
      lastError = err;
      if (attempt < retries - 1) {
        const waitTime = Math.pow(2, attempt) * 1000;
        await new Promise((r) => setTimeout(r, waitTime));
      }
    }
  }

  throw lastError || new Error('Failed to generate Gemini embedding after retries');
}

/**
 * Batch embed multiple texts
 */
export async function getGeminiBatchEmbeddings(texts, batchSize = 10) {
  const results = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const chunk = texts.slice(i, i + batchSize);
    const promises = chunk.map((txt) => getGeminiEmbedding(txt));
    const chunkVectors = await Promise.all(promises);
    results.push(...chunkVectors);
  }
  return results;
}

/**
 * Health check for Gemini Embedding
 */
export async function checkGeminiHealth() {
  try {
    const start = Date.now();
    const vec = await getGeminiEmbedding('Health check test embedding string');
    const latency = Date.now() - start;
    return {
      status: 'ok',
      dimension: vec.length,
      model: config.gemini.embeddingModel,
      latencyMs: latency,
    };
  } catch (err) {
    return {
      status: 'error',
      error: err.message,
    };
  }
}

