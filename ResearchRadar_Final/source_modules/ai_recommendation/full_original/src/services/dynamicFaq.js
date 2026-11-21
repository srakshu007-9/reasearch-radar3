import { getDynamicFaqs, getRedisClient, hashQuery } from './redis.js';
import { executeRAG } from './ragEngine.js';

/**
 * Returns dynamic FAQs enriched with pre-warmed answers
 */
export async function getEnrichedDynamicFaqs(limit = 6) {
  const faqs = await getDynamicFaqs(limit);
  const client = getRedisClient();

  const enriched = await Promise.all(
    faqs.map(async (faq) => {
      let cachedAnswer = null;
      if (client) {
        try {
          const key = `cag:response:${hashQuery(faq.query)}`;
          const res = await client.get(key);
          if (res) {
            cachedAnswer = typeof res === 'string' ? JSON.parse(res) : res;
          }
        } catch {
          // ignore cache read error
        }
      }

      return {
        query: faq.query,
        frequency: faq.frequency,
        hasPrewarmedAnswer: Boolean(cachedAnswer),
        summarySnippet: cachedAnswer?.answer ? cachedAnswer.answer.slice(0, 150) + '...' : null,
      };
    })
  );

  return enriched;
}

/**
 * Background pre-warmer for top FAQs without cache
 */
export async function prewarmTopFaqs(limit = 3) {
  try {
    const faqs = await getDynamicFaqs(limit);
    for (const faq of faqs) {
      // Execute in background to warm CAG cache
      await executeRAG(faq.query, { sessionId: 'system-prewarmer' }).catch((err) => {
        console.warn(`[FAQ Prewarm Error for "${faq.query}"]`, err.message);
      });
    }
  } catch (err) {
    console.warn('[FAQ Prewarm Job Error]', err.message);
  }
}

