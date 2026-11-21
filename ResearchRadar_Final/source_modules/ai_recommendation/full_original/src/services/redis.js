import { Redis } from '@upstash/redis';
import crypto from 'crypto';
import { config } from '../config/env.js';

let redisClient = null;

export function getRedisClient() {
  if (!redisClient) {
    try {
      redisClient = new Redis({
        url: config.redis.url,
        token: config.redis.token,
      });
    } catch (err) {
      console.error('[Redis Init Error]', err);
    }
  }
  return redisClient;
}

/**
 * Normalizes query text for consistent caching and FAQ clustering
 */
export function normalizeQuery(query) {
  if (!query) return '';
  return query
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/gi, '')
    .replace(/\s+/g, ' ');
}

export function hashQuery(query) {
  return crypto.createHash('sha256').update(normalizeQuery(query)).digest('hex').substring(0, 16);
}

// ==========================================
// CAG: Cache-Augmented Generation
// ==========================================

export async function getCAGCache(query) {
  if (!config.rag.cagEnabled) return null;
  const client = getRedisClient();
  if (!client) return null;

  try {
    const key = `cag:response:${hashQuery(query)}`;
    const cached = await client.get(key);
    if (!cached) return null;

    if (typeof cached === 'string') {
      try {
        return JSON.parse(cached);
      } catch {
        return cached;
      }
    }
    return cached;
  } catch (err) {
    console.warn('[CAG Cache Get Error]', err.message);
    return null;
  }
}

export async function setCAGCache(query, data, ttlSeconds = config.rag.cagTtlSeconds) {
  if (!config.rag.cagEnabled) return;
  const client = getRedisClient();
  if (!client) return;

  try {
    const key = `cag:response:${hashQuery(query)}`;
    const payload = {
      ...data,
      cachedAt: new Date().toISOString(),
      cag: true,
    };
    await client.set(key, JSON.stringify(payload), { ex: ttlSeconds });
  } catch (err) {
    console.warn('[CAG Cache Set Error]', err.message);
  }
}

// ==========================================
// MAG: Memory-Augmented Generation
// ==========================================

export async function getSessionMemory(sessionId, maxTurns = config.rag.magMaxTurns) {
  if (!config.rag.magEnabled || !sessionId) return { history: [], summary: '' };
  const client = getRedisClient();
  if (!client) return { history: [], summary: '' };

  try {
    const historyKey = `mag:session:${sessionId}:history`;
    const summaryKey = `mag:session:${sessionId}:summary`;

    const [rawHistory, summary] = await Promise.all([
      client.lrange(historyKey, -maxTurns * 2, -1),
      client.get(summaryKey),
    ]);

    const history = (rawHistory || []).map((item) => {
      if (typeof item === 'string') {
        try {
          return JSON.parse(item);
        } catch {
          return item;
        }
      }
      return item;
    });

    return {
      history,
      summary: summary || '',
    };
  } catch (err) {
    console.warn('[MAG Get Error]', err.message);
    return { history: [], summary: '' };
  }
}

export async function appendTurnToSession(sessionId, userMessage, assistantResponse, sources = []) {
  if (!config.rag.magEnabled || !sessionId) return;
  const client = getRedisClient();
  if (!client) return;

  try {
    const historyKey = `mag:session:${sessionId}:history`;
    const userTurn = JSON.stringify({
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
    });
    const assistantTurn = JSON.stringify({
      role: 'assistant',
      content: assistantResponse,
      sourcesCount: sources.length,
      timestamp: Date.now(),
    });

    await client.rpush(historyKey, userTurn, assistantTurn);
    // Keep max 30 turns (15 dialogue pairs)
    await client.ltrim(historyKey, -30, -1);
    // Set 7-day TTL on session
    await client.expire(historyKey, 60 * 60 * 24 * 7);
  } catch (err) {
    console.warn('[MAG Append Turn Error]', err.message);
  }
}

export async function updateSessionSummary(sessionId, summary) {
  if (!config.rag.magEnabled || !sessionId) return;
  const client = getRedisClient();
  if (!client) return;

  try {
    const summaryKey = `mag:session:${sessionId}:summary`;
    await client.set(summaryKey, summary, { ex: 60 * 60 * 24 * 7 });
  } catch (err) {
    console.warn('[MAG Update Summary Error]', err.message);
  }
}

export async function clearSessionMemory(sessionId) {
  if (!sessionId) return;
  const client = getRedisClient();
  if (!client) return;

  try {
    const historyKey = `mag:session:${sessionId}:history`;
    const summaryKey = `mag:session:${sessionId}:summary`;
    await client.del(historyKey, summaryKey);
  } catch (err) {
    console.warn('[MAG Clear Error]', err.message);
  }
}

// ==========================================
// Dynamic FAQ System
// ==========================================

export async function trackFaqFrequency(rawQuery) {
  const norm = normalizeQuery(rawQuery);
  if (!norm || norm.length < 5) return;

  const client = getRedisClient();
  if (!client) return;

  try {
    const setKey = 'faq:query_frequencies';
    // Increment score for this normalized query
    await client.zincrby(setKey, 1, norm);

    // Also store a map of normalized query -> human readable original sample
    const sampleKey = `faq:sample:${hashQuery(norm)}`;
    const exists = await client.get(sampleKey);
    if (!exists) {
      await client.set(sampleKey, rawQuery.trim(), { ex: 60 * 60 * 24 * 30 });
    }
  } catch (err) {
    console.warn('[FAQ Track Frequency Error]', err.message);
  }
}

export async function getDynamicFaqs(limit = 6) {
  const client = getRedisClient();
  if (!client) return getDefaultFaqs();

  try {
    const setKey = 'faq:query_frequencies';
    // Get top queries by frequency count using modern Upstash zrange with rev: true
    let topItems = null;
    try {
      topItems = await client.zrange(setKey, 0, limit - 1, { rev: true, withScores: true });
    } catch {
      topItems = await client.zrange(setKey, 0, limit - 1);
    }

    if (!topItems || topItems.length === 0) {
      return getDefaultFaqs();
    }

    const faqs = [];
    // topItems can be [{ member, score }] or [member, score, ...] depending on Upstash config
    if (typeof topItems[0] === 'object' && topItems[0] !== null && 'member' in topItems[0]) {
      for (const item of topItems) {
        const normQuery = item.member;
        const count = item.score || 1;
        const sampleKey = `faq:sample:${hashQuery(normQuery)}`;
        const readableQuery = (await client.get(sampleKey)) || normQuery;
        faqs.push({
          query: readableQuery,
          normalized: normQuery,
          frequency: count,
        });
      }
    } else {
      for (let i = 0; i < topItems.length; i += 2) {
        const normQuery = topItems[i];
        const count = parseInt(topItems[i + 1] || '1', 10);
        const sampleKey = `faq:sample:${hashQuery(normQuery)}`;
        const readableQuery = (await client.get(sampleKey)) || normQuery;
        faqs.push({
          query: readableQuery,
          normalized: normQuery,
          frequency: count,
        });
      }
    }

    return faqs.length > 0 ? faqs : getDefaultFaqs();
  } catch (err) {
    console.warn('[Get Dynamic FAQs Error]', err.message);
    return getDefaultFaqs();
  }
}

export function getDefaultFaqs() {
  return [
    { query: 'What are the recent advances in large multimodal models?', frequency: 100 },
    { query: 'How does full reference image quality assessment work?', frequency: 85 },
    { query: 'What methods optimize structure and phonons in LiNbO3 crystals?', frequency: 72 },
    { query: 'How is potentiometric stripping analysis used for trace metals?', frequency: 65 },
    { query: 'What are the main findings in young open cluster NGC 6383?', frequency: 54 },
    { query: 'How does contrastive learning improve biomedical representation?', frequency: 48 },
  ];
}

// Health check
export async function checkRedisHealth() {
  const client = getRedisClient();
  if (!client) return { status: 'error', message: 'Client not initialized' };

  try {
    const start = Date.now();
    const pong = await client.ping();
    const latency = Date.now() - start;
    return { status: 'ok', response: pong, latencyMs: latency };
  } catch (err) {
    return { status: 'error', error: err.message };
  }
}
