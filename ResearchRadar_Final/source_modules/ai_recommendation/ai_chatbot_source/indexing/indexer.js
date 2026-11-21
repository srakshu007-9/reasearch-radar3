import fs from 'fs';
import readline from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/env.js';
import { ensureCollection, upsertPoints, getCollectionStats } from '../services/qdrant.js';
import { getGeminiEmbedding } from '../services/gemini.js';
import { chunkAcademicPaper } from '../chunking/semanticChunker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');

/**
 * Reads N papers from a JSONL file
 */
export async function readPapersFromJSONL(filePath, maxCount = 25) {
  if (!fs.existsSync(filePath)) {
    console.warn(`[Indexer] File not found: ${filePath}`);
    return [];
  }

  const papers = [];
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (!line || !line.trim()) continue;
    try {
      const parsed = JSON.parse(line.trim());
      papers.push(parsed);
      if (papers.length >= maxCount) break;
    } catch {
      // skip corrupted line
    }
  }

  return papers;
}

/**
 * Indexes a list of paper records into Qdrant using Gemini embeddings
 */
export async function indexPapers(papers, { onProgress } = {}) {
  await ensureCollection();

  console.log(`[Indexer] Preparing chunks for ${papers.length} papers...`);
  const allChunks = [];

  for (const paper of papers) {
    const chunks = chunkAcademicPaper(paper);
    allChunks.push(...chunks);
  }

  console.log(`[Indexer] Generated ${allChunks.length} zero-loss chunks. Generating Gemini embeddings...`);

  const points = [];
  let processed = 0;

  for (const chunk of allChunks) {
    try {
      const vector = await getGeminiEmbedding(chunk.textForEmbedding);
      points.push({
        id: chunk.pointId,
        vector,
        payload: chunk.payload,
      });

      processed++;
      if (onProgress && processed % 5 === 0) {
        onProgress(processed, allChunks.length);
      }
      // Small pause to be gentle on embedding rate limits
      await new Promise((r) => setTimeout(r, 120));
    } catch (err) {
      console.warn(`[Indexer] Error embedding chunk ${chunk.pointId}:`, err.message);
    }
  }

  console.log(`[Indexer] Upserting ${points.length} points to Qdrant...`);
  // Upsert in batches of 20
  for (let i = 0; i < points.length; i += 20) {
    const batch = points.slice(i, i + 20);
    await upsertPoints(batch);
  }

  console.log(`[Indexer] Successfully indexed ${points.length} chunks into Qdrant!`);
  return {
    papersCount: papers.length,
    chunksCount: allChunks.length,
    indexedPoints: points.length,
  };
}

/**
 * Seeds the knowledge base with a curated sample from all 4 datasets
 * if the collection is newly initialized or below threshold
 */
export async function seedSampleKnowledgeBase(countPerSource = 20) {
  await ensureCollection();
  const stats = await getCollectionStats();

  if (stats.pointsCount >= 40) {
    console.log(`[Seed Knowledge Base] Qdrant already has ${stats.pointsCount} points. Skipping automatic seed.`);
    return stats;
  }

  console.log(`[Seed Knowledge Base] Seeding ${countPerSource} papers from each source into Qdrant...`);
  const sources = [
    { file: 'arxiv_papers.jsonl', name: 'arXiv' },
    { file: 'crossref_papers.jsonl', name: 'CrossRef' },
    { file: 'openalex_papers.jsonl', name: 'OpenAlex' },
    { file: 'pubmed_papers.jsonl', name: 'PubMed' },
  ];

  const allPapers = [];
  for (const src of sources) {
    const p = path.join(DATA_DIR, src.file);
    const loaded = await readPapersFromJSONL(p, countPerSource);
    console.log(`[Seed] Loaded ${loaded.length} papers from ${src.file}`);
    allPapers.push(...loaded);
  }

  const result = await indexPapers(allPapers, {
    onProgress: (done, total) => {
      console.log(`[Seed Progress] Embedded ${done}/${total} chunks...`);
    },
  });

  return result;
}

