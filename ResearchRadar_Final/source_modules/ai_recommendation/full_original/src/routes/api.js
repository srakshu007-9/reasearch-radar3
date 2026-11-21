import express from 'express';
import { executeRAG, executeRAGStream } from '../services/ragEngine.js';
import { getEnrichedDynamicFaqs } from '../services/dynamicFaq.js';
import { clearSessionMemory, checkRedisHealth, getRedisClient } from '../services/redis.js';
import { checkQdrantHealth, getCollectionStats } from '../services/qdrant.js';
import { checkGroqHealth } from '../services/groq.js';
import { checkGeminiHealth } from '../services/gemini.js';
import { seedSampleKnowledgeBase } from '../indexing/indexer.js';

export const apiRouter = express.Router();

/**
 * Chat endpoint with SSE streaming or standard JSON response
 */
apiRouter.post('/chat', async (req, res) => {
  const { query, sessionId = 'default-session', stream = true, bypassCache = false } = req.body;

  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ error: 'Query string is required' });
  }

  const cleanQuery = query.trim();

  // Handle SSE Streaming (Default for ChatGPT-like experience)
  if (stream) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    try {
      await executeRAGStream(cleanQuery, {
        sessionId,
        bypassCache,
        onSources: (sources) => {
          res.write(`event: sources\ndata: ${JSON.stringify(sources)}\n\n`);
        },
        onChunk: (delta) => {
          res.write(`event: token\ndata: ${JSON.stringify({ delta })}\n\n`);
        },
      });

      res.write(`event: done\ndata: ${JSON.stringify({ status: 'completed' })}\n\n`);
      res.end();
    } catch (err) {
      console.error('[API Chat Streaming Error]', err);
      res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    }
  } else {
    // Non-streaming JSON response
    try {
      const result = await executeRAG(cleanQuery, { sessionId, bypassCache });
      return res.json(result);
    } catch (err) {
      console.error('[API Chat Error]', err);
      return res.status(500).json({ error: err.message || 'RAG generation failed' });
    }
  }
});

/**
 * Dynamic FAQ endpoint
 */
apiRouter.get('/faq/dynamic', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '6', 10);
    const faqs = await getEnrichedDynamicFaqs(limit);
    return res.json({ faqs });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * Clear session conversational memory
 */
apiRouter.post('/session/clear', async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required' });
  }

  try {
    await clearSessionMemory(sessionId);
    return res.json({ status: 'success', message: `Memory cleared for session ${sessionId}` });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * User feedback endpoint (thumbs up/down)
 */
apiRouter.post('/feedback', async (req, res) => {
  const { query, vote, comment, sessionId } = req.body;
  const client = getRedisClient();

  if (client) {
    try {
      const feedbackId = `feedback:${Date.now()}`;
      await client.hset(feedbackId, {
        query: query || '',
        vote: vote || 'neutral',
        comment: comment || '',
        sessionId: sessionId || '',
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('[Feedback save error]', err.message);
    }
  }

  return res.json({ status: 'received' });
});

/**
 * Comprehensive health & pre-flight diagnostics endpoint
 */
apiRouter.get('/health', async (req, res) => {
  const [qdrant, redis, groq, gemini, collectionStats] = await Promise.all([
    checkQdrantHealth(),
    checkRedisHealth(),
    checkGroqHealth(),
    checkGeminiHealth(),
    getCollectionStats(),
  ]);

  const allHealthy =
    qdrant.status === 'ok' &&
    redis.status === 'ok' &&
    groq.status === 'ok' &&
    gemini.status === 'ok';

  return res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    services: {
      qdrant,
      redis,
      groq,
      gemini,
    },
    collection: collectionStats,
  });
});

/**
 * Sample ingestion trigger
 */
apiRouter.post('/index/sample', async (req, res) => {
  try {
    const count = parseInt(req.body.count || '15', 10);
    const result = await seedSampleKnowledgeBase(count);
    return res.json({ status: 'success', result });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

