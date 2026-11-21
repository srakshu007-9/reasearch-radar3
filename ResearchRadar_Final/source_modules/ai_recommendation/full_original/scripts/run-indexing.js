import path from 'path';
import { fileURLToPath } from 'url';
import { ensureCollection, getCollectionStats } from '../src/services/qdrant.js';
import { readPapersFromJSONL, indexPapers } from '../src/indexing/indexer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');

// Parse CLI args (e.g., node scripts/run-indexing.js --count=30 --source=arxiv)
const args = process.argv.slice(2);
let count = 25;
let filterSource = null;

for (const arg of args) {
  if (arg.startsWith('--count=')) {
    count = parseInt(arg.split('=')[1], 10);
  } else if (arg.startsWith('--source=')) {
    filterSource = arg.split('=')[1].toLowerCase();
  }
}

async function runIndexingCli() {
  console.log('\n======================================================');
  console.log(`📚 Starting Academic Literature Ingestion Pipeline...`);
  console.log(`   Count per file: ${count}`);
  console.log(`   Source filter:  ${filterSource || 'All (arXiv, CrossRef, OpenAlex, PubMed)'}`);
  console.log('======================================================\n');

  await ensureCollection();
  const initialStats = await getCollectionStats();
  console.log(`[Status] Initial Points in Qdrant: ${initialStats.pointsCount}`);

  const sources = [
    { file: 'arxiv_papers.jsonl', name: 'arxiv' },
    { file: 'crossref_papers.jsonl', name: 'crossref' },
    { file: 'openalex_papers.jsonl', name: 'openalex' },
    { file: 'pubmed_papers.jsonl', name: 'pubmed' },
  ];

  const targetSources = filterSource
    ? sources.filter((s) => s.name === filterSource)
    : sources;

  let totalIngested = 0;

  for (const src of targetSources) {
    const filePath = path.join(DATA_DIR, src.file);
    console.log(`\n[Reading] Loading ${count} papers from ${src.file}...`);
    const papers = await readPapersFromJSONL(filePath, count);

    if (papers.length === 0) {
      console.warn(`[Warning] No papers loaded from ${src.file}`);
      continue;
    }

    console.log(`[Processing] Indexing ${papers.length} papers for ${src.name.toUpperCase()}...`);
    const result = await indexPapers(papers, {
      onProgress: (processed, total) => {
        const pct = Math.round((processed / total) * 100);
        process.stdout.write(`\r   Progress: [${pct}%] ${processed}/${total} chunks embedded...`);
      },
    });

    totalIngested += result.indexedPoints;
    console.log(`\n   ✅ Finished ${src.name}: ${result.indexedPoints} vectors upserted.`);
  }

  const finalStats = await getCollectionStats();
  console.log('\n======================================================');
  console.log(`🎉 Ingestion Batch Complete!`);
  console.log(`   Newly Upserted Vectors: ${totalIngested}`);
  console.log(`   Total Qdrant Points:    ${finalStats.pointsCount}`);
  console.log('======================================================\n');
}

runIndexingCli().catch((err) => {
  console.error('[Indexing CLI Error]', err);
  process.exit(1);
});

