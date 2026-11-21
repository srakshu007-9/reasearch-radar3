import app from './src/app.js';
import { config, validateConfig } from './src/config/env.js';
import { ensureCollection, getCollectionStats } from './src/services/qdrant.js';
import { seedSampleKnowledgeBase } from './src/indexing/indexer.js';
import { prewarmTopFaqs } from './src/services/dynamicFaq.js';

// Server Initialization
async function startServer() {
  console.log('\n==============================================================');
  console.log('🤖 Starting AI Recommendation RAG Chatbot System...');
  console.log('==============================================================');

  validateConfig();

  try {
    // 1. Ensure Qdrant collection is ready
    console.log('[Startup] Checking Qdrant vector database collection...');
    await ensureCollection();
    const stats = await getCollectionStats();
    console.log(`[Startup] Qdrant Collection "${stats.name}" ready (${stats.pointsCount} points indexed).`);

    // 2. If collection has no points, auto-seed sample papers
    if (stats.pointsCount < 20) {
      console.log('[Startup] Collection has fewer than 20 points. Initiating sample seeding...');
      seedSampleKnowledgeBase(10)
        .then(() => {
          console.log('[Startup] Initial knowledge base seeding completed.');
          prewarmTopFaqs(3);
        })
        .catch((err) => {
          console.warn('[Startup] Non-blocking seeding error:', err.message);
        });
    } else {
      prewarmTopFaqs(3).catch(() => {});
    }
  } catch (err) {
    console.warn('[Startup Warning] Initial database sync encountered:', err.message);
  }

  // Start HTTP Listener
  app.listen(config.port, () => {
    console.log('==============================================================');
    console.log(`🚀 RAG Server Active at:    http://localhost:${config.port}`);
    console.log(`📡 Health Check URL:        http://localhost:${config.port}/api/health`);
    console.log(`🔌 Embed Widget Script:     http://localhost:${config.port}/widget.js`);
    console.log(`🧠 Vector Engine:           Qdrant (${config.gemini.dimension}d Cosine)`);
    console.log(`⚡ LLM Inference:           Groq (${config.groq.model})`);
    console.log(`🧬 Embedding Model:         Gemini (${config.gemini.embeddingModel})`);
    console.log(`💾 Cache & Memory:          Upstash Redis (CAG + MAG + Dynamic FAQ)`);
    console.log('==============================================================\n');
  });
}

startServer().catch((err) => {
  console.error('[Fatal Server Startup Error]', err);
  process.exit(1);
});
