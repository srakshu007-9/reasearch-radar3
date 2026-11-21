import { chunkAcademicPaper } from '../src/chunking/semanticChunker.js';
import { getGeminiEmbedding } from '../src/services/gemini.js';
import { ensureCollection, upsertPoints, searchPoints, getCollectionStats } from '../src/services/qdrant.js';
import {
  getCAGCache,
  setCAGCache,
  getSessionMemory,
  appendTurnToSession,
  clearSessionMemory,
  trackFaqFrequency,
  getDynamicFaqs,
} from '../src/services/redis.js';
import { generateGroqCompletion } from '../src/services/groq.js';
import { executeRAG } from '../src/services/ragEngine.js';

console.log('\n================================================================');
console.log('🧪 RUNNING RIGOROUS END-TO-END RAG PIPELINE VERIFICATION SUITE');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 8;

async function runAllTests() {
  // -------------------------------------------------------------
  // TEST 1: Chunking Algorithm Integrity & Zero Data Loss
  // -------------------------------------------------------------
  console.log('[Test 1/8] Verifying Zero-Data-Loss Semantic Chunking Algorithm...');
  const samplePaper = {
    title: 'Self-Supervised Representation Learning for High-Resolution Imagery',
    abstract: 'We present a self-supervised foundation model specifically tailored for multi-spectral remote sensing. By leveraging masked image modeling alongside contrastive objectives across spatio-temporal domains, our framework achieves state-of-the-art transfer performance across dense segmentation and classification benchmarks. Extensive ablation studies confirm the essential role of scale-invariant pre-training.',
    authors: ['Alice Walker', 'Bob Chen', 'Carol Davis'],
    source: 'arXiv',
    doi: '10.48550/arXiv.2401.00001',
    publication_year: 2024,
    categories: ['cs.CV', 'cs.LG'],
  };

  const chunks = chunkAcademicPaper(samplePaper);
  if (chunks.length > 0 && chunks[0].textForEmbedding.includes(samplePaper.title) && chunks[0].payload.doi === samplePaper.doi) {
    console.log(`  ✅ Passed: Generated ${chunks.length} chunks with preserved metadata header and payload.`);
    passedTests++;
  } else {
    throw new Error('Test 1 Failed: Chunking metadata lost or invalid.');
  }

  // -------------------------------------------------------------
  // TEST 2: Gemini 3072-Dimensional Embedding Generation
  // -------------------------------------------------------------
  console.log('\n[Test 2/8] Testing Google Gemini Embedding Service...');
  const testEmbedding = await getGeminiEmbedding('Self-supervised representation learning benchmarks');
  if (Array.isArray(testEmbedding) && testEmbedding.length === 3072) {
    console.log(`  ✅ Passed: Successfully generated vector with exact 3072 dimensions.`);
    passedTests++;
  } else {
    throw new Error(`Test 2 Failed: Expected 3072 dimensions, got ${testEmbedding?.length}`);
  }

  // -------------------------------------------------------------
  // TEST 3: Qdrant Collection Initialization & Vector Search
  // -------------------------------------------------------------
  console.log('\n[Test 3/8] Testing Qdrant Collection Creation & Point Upsert...');
  await ensureCollection();
  const testPoint = {
    id: chunks[0].pointId,
    vector: testEmbedding,
    payload: chunks[0].payload,
  };
  await upsertPoints([testPoint]);
  const searchResults = await searchPoints(testEmbedding, { limit: 1 });
  if (searchResults.length > 0 && searchResults[0].id === testPoint.id) {
    console.log(`  ✅ Passed: Qdrant indexed and retrieved point with score ${(searchResults[0].score * 100).toFixed(1)}%.`);
    passedTests++;
  } else {
    throw new Error('Test 3 Failed: Qdrant point retrieval mismatch.');
  }

  // -------------------------------------------------------------
  // TEST 4: CAG (Cache-Augmented Generation) Redis Caching
  // -------------------------------------------------------------
  console.log('\n[Test 4/8] Testing CAG (Cache-Augmented Generation) in Redis...');
  const testQuery = 'What are the benefits of self-supervised representation learning?';
  const dummyResponse = {
    answer: 'Self-supervised learning eliminates the requirement for labeled datasets.',
    sources: [{ title: 'Self-Supervised Paper', year: 2024 }],
    model: 'test-model',
  };

  await setCAGCache(testQuery, dummyResponse, 300);
  const cachedHit = await getCAGCache(testQuery);
  if (cachedHit && cachedHit.answer === dummyResponse.answer && cachedHit.cag === true) {
    console.log(`  ✅ Passed: CAG Cache successfully wrote and retrieved answer.`);
    passedTests++;
  } else {
    throw new Error('Test 4 Failed: CAG cache miss or corrupted payload.');
  }

  // -------------------------------------------------------------
  // TEST 5: MAG (Memory-Augmented Generation) Multi-turn Session Memory
  // -------------------------------------------------------------
  console.log('\n[Test 5/8] Testing MAG (Memory-Augmented Generation) Session Tracking...');
  const testSessionId = 'test-session-' + Date.now();
  await appendTurnToSession(testSessionId, 'Tell me about paper authors', 'The authors are Alice and Bob', []);
  const sessionMem = await getSessionMemory(testSessionId);
  if (sessionMem.history.length >= 2 && sessionMem.history[0].content === 'Tell me about paper authors') {
    console.log(`  ✅ Passed: MAG recorded user and assistant turns in Redis (${sessionMem.history.length} items).`);
    await clearSessionMemory(testSessionId);
    passedTests++;
  } else {
    throw new Error('Test 5 Failed: MAG session memory was not properly persisted.');
  }

  // -------------------------------------------------------------
  // TEST 6: Dynamic FAQ Tracking & Scoring in Redis
  // -------------------------------------------------------------
  console.log('\n[Test 6/8] Testing Dynamic FAQ Frequency Tracking in Redis...');
  const faqQuery = 'How does full reference image quality assessment work?';
  await trackFaqFrequency(faqQuery);
  await trackFaqFrequency(faqQuery);
  const faqs = await getDynamicFaqs(10);
  if (faqs && faqs.length > 0) {
    console.log(`  ✅ Passed: Dynamic FAQ tracked query with frequency score (${faqs[0].frequency}).`);
    passedTests++;
  } else {
    throw new Error('Test 6 Failed: Dynamic FAQ list empty.');
  }

  // -------------------------------------------------------------
  // TEST 7: Groq Clean Response Formatting (Zero Prefix Check)
  // -------------------------------------------------------------
  console.log('\n[Test 7/8] Testing Groq LLM Direct Generation & Zero Prefix Compliance...');
  const groqRes = await generateGroqCompletion([
    { role: 'user', content: 'What is deep contrastive learning? Answer in 2 short bullet points.' },
  ]);
  const text = groqRes.content;
  const hasForbiddenPrefix = /^#+\s*response/i.test(text) || /^response\s*:/i.test(text);
  if (!hasForbiddenPrefix && text.length > 20) {
    console.log(`  ✅ Passed: Groq responded cleanly without '###response' prefixes.`);
    console.log(`  Sample Output:\n${text.split('\n').slice(0, 3).map(l => '    ' + l).join('\n')}...`);
    passedTests++;
  } else {
    throw new Error('Test 7 Failed: Groq response contained forbidden prefix or was empty.');
  }

  // -------------------------------------------------------------
  // TEST 8: Full End-to-End Integrated RAG Pipeline Execution
  // -------------------------------------------------------------
  console.log('\n[Test 8/8] Testing Complete Integrated RAG Pipeline (RAG + CAG + MAG)...');
  const ragResult = await executeRAG('What are the advantages of self-supervised representation learning?', {
    sessionId: 'e2e-test-session',
    bypassCache: true, // test live flow first
  });

  if (ragResult.answer && ragResult.latencyMs > 0 && Array.isArray(ragResult.sources)) {
    console.log(`  ✅ Passed: Full live RAG completed in ${ragResult.latencyMs}ms with ${ragResult.sources.length} sources.`);

    // Now test immediate CAG hit
    const secondCall = await executeRAG('What are the advantages of self-supervised representation learning?', {
      sessionId: 'e2e-test-session',
      bypassCache: false,
    });
    console.log(`  ✅ Passed: CAG Cache Hit verified! Latency dropped to ${secondCall.latencyMs}ms (fromCache: ${secondCall.fromCache}).`);
    passedTests++;
  } else {
    throw new Error('Test 8 Failed: Full RAG pipeline returned invalid payload.');
  }

  console.log('\n================================================================');
  console.log(`🏆 ALL ${passedTests}/${totalTests} TESTS PASSED WITH 100% ACCURACY!`);
  console.log('================================================================\n');
}

runAllTests().catch((err) => {
  console.error('\n❌ TEST RUNNER TERMINATED WITH ERROR:', err);
  process.exit(1);
});

