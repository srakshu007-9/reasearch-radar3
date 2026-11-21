import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Qdrant
  qdrant: {
    url: process.env.QDRANT_URL || 'https://4ea1042c-c350-4a42-8139-bd80f0d3647a.australia-southeast1-0.gcp.cloud.qdrant.io',
    apiKey: process.env.QDRANT_API_KEY || '',
    collectionName: process.env.QDRANT_COLLECTION_NAME || 'academic_papers_rag',
  },

  // Groq
  groq: {
    apiKey: process.env.GROQ_API_KEY || '',
    model: process.env.GROQ_MODEL || 'qwen/qwen3.8-27b',
    fallbackModel: process.env.GROQ_FALLBACK_MODEL || 'openai/gpt-oss-120b',
    temperature: 0.3,
    maxTokens: 2048,
  },

  // Gemini Embedding
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    embeddingModel: process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001',
    dimension: parseInt(process.env.EMBEDDING_DIMENSION || '3072', 10),
  },

  // Redis (Upstash REST)
  redis: {
    url: process.env.UPSTASH_REDIS_REST_URL || 'https://definite-lemming-161961.upstash.io',
    token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
    password: process.env.REDIS_PASSWORD || '',
  },

  // CAG & MAG Options
  rag: {
    cagEnabled: process.env.CAG_ENABLED !== 'false',
    cagTtlSeconds: parseInt(process.env.CAG_TTL_SECONDS || '86400', 10), // 24 hours
    magEnabled: process.env.MAG_ENABLED !== 'false',
    magMaxTurns: parseInt(process.env.MAG_MAX_TURNS || '10', 10),
    similarityThreshold: parseFloat(process.env.SIMILARITY_THRESHOLD || '0.25'),
    topK: parseInt(process.env.TOP_K_RETRIEVAL || '5', 10),
  },
};

// Quick validation
export function validateConfig() {
  const missing = [];
  if (!config.qdrant.apiKey) missing.push('QDRANT_API_KEY');
  if (!config.groq.apiKey) missing.push('GROQ_API_KEY');
  if (!config.gemini.apiKey) missing.push('GEMINI_API_KEY');
  if (!config.redis.token && !config.redis.url) missing.push('UPSTASH_REDIS_REST_TOKEN');

  if (missing.length > 0) {
    console.warn(`[Config Warning] Missing environment variables: ${missing.join(', ')}`);
  }
  return missing.length === 0;
}

