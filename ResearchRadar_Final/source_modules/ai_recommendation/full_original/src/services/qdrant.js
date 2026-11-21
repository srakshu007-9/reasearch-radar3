import { QdrantClient } from '@qdrant/js-client-rest';
import { config } from '../config/env.js';

let clientInstance = null;

export function getQdrantClient() {
  if (!clientInstance) {
    clientInstance = new QdrantClient({
      url: config.qdrant.url,
      apiKey: config.qdrant.apiKey,
      checkCompatibility: false,
    });
  }
  return clientInstance;
}

/**
 * Ensures the target vector collection exists with 3072 dimensions and Cosine distance
 */
export async function ensureCollection(collectionName = config.qdrant.collectionName) {
  const client = getQdrantClient();

  try {
    const collectionsRes = await client.getCollections();
    const existing = collectionsRes.collections.map((c) => c.name);

    if (!existing.includes(collectionName)) {
      console.log(`[Qdrant] Collection "${collectionName}" does not exist. Creating with 3072 dims...`);
      await client.createCollection(collectionName, {
        vectors: {
          size: config.gemini.dimension, // 3072
          distance: 'Cosine',
        },
        optimizers_config: {
          default_segment_number: 2,
        },
      });

      console.log(`[Qdrant] Creating payload indexes on "${collectionName}"...`);
      await Promise.allSettled([
        client.createPayloadIndex(collectionName, {
          field_name: 'source',
          field_schema: 'keyword',
        }),
        client.createPayloadIndex(collectionName, {
          field_name: 'publication_year',
          field_schema: 'integer',
        }),
        client.createPayloadIndex(collectionName, {
          field_name: 'categories',
          field_schema: 'keyword',
        }),
      ]);
      console.log(`[Qdrant] Collection "${collectionName}" successfully created and indexed.`);
    } else {
      console.log(`[Qdrant] Collection "${collectionName}" exists.`);
    }

    return true;
  } catch (err) {
    console.error(`[Qdrant Init Error] Failed to ensure collection "${collectionName}":`, err.message);
    throw err;
  }
}

/**
 * Upsert points into Qdrant in batches
 */
export async function upsertPoints(points, collectionName = config.qdrant.collectionName) {
  if (!points || points.length === 0) return { status: 'empty' };
  const client = getQdrantClient();

  try {
    const result = await client.upsert(collectionName, {
      wait: true,
      points,
    });
    return result;
  } catch (err) {
    console.error(`[Qdrant Upsert Error]`, err.message);
    throw err;
  }
}

/**
 * Vector similarity search using Qdrant client.query or search
 */
export async function searchPoints(
  queryVector,
  {
    limit = config.rag.topK,
    scoreThreshold = config.rag.similarityThreshold,
    filter = null,
    collectionName = config.qdrant.collectionName,
  } = {}
) {
  const client = getQdrantClient();

  try {
    // client.query universally queries points with query: vector
    const response = await client.query(collectionName, {
      query: queryVector,
      limit,
      score_threshold: scoreThreshold,
      with_payload: true,
      filter: filter || undefined,
    });

    const points = response.points || [];

    return points.map((pt) => ({
      id: pt.id,
      score: pt.score,
      title: pt.payload?.title || 'Untitled Research Paper',
      abstract: pt.payload?.abstract || '',
      chunkText: pt.payload?.chunk_text || pt.payload?.abstract || '',
      authors: pt.payload?.authors || [],
      source: pt.payload?.source || 'Academic Database',
      publicationDate: pt.payload?.publication_date || '',
      publicationYear: pt.payload?.publication_year || null,
      doi: pt.payload?.doi || '',
      url: pt.payload?.url || pt.payload?.paper_url || pt.payload?.landing_page_url || '',
      pdfUrl: pt.payload?.pdf_url || '',
      categories: pt.payload?.categories || pt.payload?.topics || [],
      chunkIndex: pt.payload?.chunk_index ?? 0,
      totalChunks: pt.payload?.total_chunks ?? 1,
    }));
  } catch (err) {
    console.error(`[Qdrant Search Error]`, err.message);
    // If collection is empty or not yet filled, return empty array gracefully
    return [];
  }
}

/**
 * Get collection statistics
 */
export async function getCollectionStats(collectionName = config.qdrant.collectionName) {
  const client = getQdrantClient();
  try {
    const info = await client.getCollection(collectionName);
    return {
      name: collectionName,
      status: info.status,
      pointsCount: info.points_count || 0,
      indexedVectorsCount: info.indexed_vectors_count || 0,
      vectorsCount: info.vectors_count || 0,
      segmentsCount: info.segments_count || 0,
    };
  } catch (err) {
    return {
      name: collectionName,
      status: 'unavailable',
      error: err.message,
    };
  }
}

/**
 * Health check for Qdrant
 */
export async function checkQdrantHealth() {
  const client = getQdrantClient();
  try {
    const start = Date.now();
    const collectionsRes = await client.getCollections();
    const latency = Date.now() - start;
    return {
      status: 'ok',
      collectionsCount: collectionsRes.collections?.length || 0,
      latencyMs: latency,
    };
  } catch (err) {
    return {
      status: 'error',
      error: err.message,
    };
  }
}

