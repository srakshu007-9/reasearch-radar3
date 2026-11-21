import { checkQdrantHealth } from '../src/services/qdrant.js';
import { checkRedisHealth } from '../src/services/redis.js';
import { checkGroqHealth } from '../src/services/groq.js';
import { checkGeminiHealth } from '../src/services/gemini.js';

console.log('\n======================================================');
console.log('🔍 Running Pre-Flight Database & API Diagnostics...');
console.log('======================================================\n');

async function runDiagnostics() {
  let allPassed = true;

  // 1. Qdrant
  try {
    const qdrant = await checkQdrantHealth();
    if (qdrant.status === 'ok') {
      console.log(`✅ [QDRANT VECTOR DB]   PASSED (${qdrant.latencyMs}ms) - Found ${qdrant.collectionsCount} collections`);
    } else {
      console.error(`❌ [QDRANT VECTOR DB]   FAILED:`, qdrant.error);
      allPassed = false;
    }
  } catch (err) {
    console.error(`❌ [QDRANT VECTOR DB]   EXCEPTION:`, err.message);
    allPassed = false;
  }

  // 2. Redis
  try {
    const redis = await checkRedisHealth();
    if (redis.status === 'ok') {
      console.log(`✅ [UPSTASH REDIS DB]   PASSED (${redis.latencyMs}ms) - Ping: ${redis.response}`);
    } else {
      console.error(`❌ [UPSTASH REDIS DB]   FAILED:`, redis.error);
      allPassed = false;
    }
  } catch (err) {
    console.error(`❌ [UPSTASH REDIS DB]   EXCEPTION:`, err.message);
    allPassed = false;
  }

  // 3. Groq
  try {
    const groq = await checkGroqHealth();
    if (groq.status === 'ok') {
      console.log(`✅ [GROQ INFERENCE]     PASSED (${groq.latencyMs}ms) - Model: ${groq.model}`);
    } else {
      console.error(`❌ [GROQ INFERENCE]     FAILED:`, groq.error);
      allPassed = false;
    }
  } catch (err) {
    console.error(`❌ [GROQ INFERENCE]     EXCEPTION:`, err.message);
    allPassed = false;
  }

  // 4. Gemini
  try {
    const gemini = await checkGeminiHealth();
    if (gemini.status === 'ok') {
      console.log(`✅ [GEMINI EMBEDDINGS]  PASSED (${gemini.latencyMs}ms) - Dim: ${gemini.dimension}d, Model: ${gemini.model}`);
    } else {
      console.error(`❌ [GEMINI EMBEDDINGS]  FAILED:`, gemini.error);
      allPassed = false;
    }
  } catch (err) {
    console.error(`❌ [GEMINI EMBEDDINGS]  EXCEPTION:`, err.message);
    allPassed = false;
  }

  console.log('\n======================================================');
  if (allPassed) {
    console.log('🎉 ALL 4 DATABASES & APIS ARE 100% OPERATIONAL!');
  } else {
    console.log('⚠️ ONE OR MORE CONNECTIONS FAILED. CHECK LOGS ABOVE.');
  }
  console.log('======================================================\n');

  process.exit(allPassed ? 0 : 1);
}

runDiagnostics();

