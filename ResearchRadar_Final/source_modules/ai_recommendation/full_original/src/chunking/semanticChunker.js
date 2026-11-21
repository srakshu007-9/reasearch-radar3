import { v5 as uuidv5, v4 as uuidv4 } from 'uuid';

// Fixed namespace for deterministic point IDs based on paper ID + chunk index
const UUID_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

/**
 * Splits text recursively using semantic boundaries:
 * Paragraphs -> Sentences -> Clauses -> Words
 */
export function recursiveSplit(text, maxChars = 800, overlap = 150) {
  if (!text || text.trim().length === 0) return [];

  const cleaned = text.replace(/\r\n/g, '\n').trim();
  if (cleaned.length <= maxChars) {
    return [cleaned];
  }

  // 1. Try splitting by paragraphs
  const paragraphs = cleaned.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  let chunks = [];
  let current = '';

  for (const para of paragraphs) {
    if (para.length > maxChars) {
      // Split large paragraph by sentences
      const sentences = para.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [para];
      for (const sentence of sentences) {
        if ((current + ' ' + sentence).trim().length > maxChars) {
          if (current.trim().length > 0) {
            chunks.push(current.trim());
            // apply sliding window overlap
            const words = current.split(/\s+/);
            const overlapWords = words.slice(-Math.floor(overlap / 6)).join(' ');
            current = overlapWords + ' ' + sentence;
          } else {
            // Very long sentence, slice it
            chunks.push(sentence.trim());
            current = '';
          }
        } else {
          current = current ? current + ' ' + sentence : sentence;
        }
      }
    } else {
      if ((current + '\n\n' + para).trim().length > maxChars) {
        if (current.trim().length > 0) {
          chunks.push(current.trim());
          const words = current.split(/\s+/);
          const overlapWords = words.slice(-Math.floor(overlap / 6)).join(' ');
          current = overlapWords + '\n\n' + para;
        } else {
          current = para;
        }
      } else {
        current = current ? current + '\n\n' + para : para;
      }
    }
  }

  if (current.trim().length > 0) {
    chunks.push(current.trim());
  }

  return chunks;
}

/**
 * Transforms a raw paper JSON record into zero-loss semantic chunks with contextual headers
 */
export function chunkAcademicPaper(paper, options = {}) {
  const maxChars = options.maxChars || 850;
  const overlap = options.overlap || 150;

  const title = (paper.title || '').trim();
  const abstract = (paper.abstract || '').trim();
  const source = paper.source || 'Academic Literature';
  const authors = Array.isArray(paper.authors) ? paper.authors : [];
  // Safely extract publication date string and year across all schemas (arXiv, CrossRef, OpenAlex, PubMed)
  let publicationDate = '';
  let publicationYear = null;

  if (paper.publication_year) {
    const py = parseInt(paper.publication_year, 10);
    if (!isNaN(py)) publicationYear = py;
  }

  const rawPubDate = paper.publication_date || paper.published || paper.created;
  if (rawPubDate) {
    if (typeof rawPubDate === 'string') {
      publicationDate = rawPubDate;
      if (!publicationYear && rawPubDate.length >= 4) {
        const y = parseInt(rawPubDate.substring(0, 4), 10);
        if (!isNaN(y)) publicationYear = y;
      }
    } else if (typeof rawPubDate === 'object') {
      if (rawPubDate.year) {
        const y = parseInt(rawPubDate.year, 10);
        if (!isNaN(y)) publicationYear = y;
      }
      publicationDate = [rawPubDate.year, rawPubDate.month, rawPubDate.day].filter(Boolean).join('-');
    } else if (typeof rawPubDate === 'number') {
      publicationYear = rawPubDate;
      publicationDate = String(rawPubDate);
    }
  }
  const doi = paper.doi || '';
  const url = paper.url || paper.paper_url || paper.landing_page_url || '';
  const pdfUrl = paper.pdf_url || '';
  const categories = paper.categories || paper.topics || paper.subjects || paper.mesh_terms || [];

  // Construct paper unique identifier
  const rawId = paper.arxiv_id || paper.doi || paper.openalex_id || paper.pmid || paper.crossref_id || `${title.slice(0, 40)}-${publicationYear}`;

  // If abstract is missing or tiny, use title and available metadata
  const textToChunk = abstract.length > 20 ? abstract : `Title: ${title}. Research paper from ${source}.`;

  // Apply recursive semantic splitting
  const rawSplits = recursiveSplit(textToChunk, maxChars, overlap);
  const totalChunks = rawSplits.length;

  return rawSplits.map((chunkBody, idx) => {
    // Zero-data-loss contextual header enrichment
    const contextualHeader = [
      `[Paper Title: ${title}]`,
      authors.length > 0 ? `[Authors: ${authors.slice(0, 5).join(', ')}${authors.length > 5 ? ' et al.' : ''}]` : null,
      `[Source: ${source}${publicationYear ? ` | Year: ${publicationYear}` : ''}]`,
      categories.length > 0 ? `[Topics: ${categories.slice(0, 4).join(', ')}]` : null,
      doi ? `[DOI: ${doi}]` : url ? `[Link: ${url}]` : null,
      '---',
    ].filter(Boolean).join('\n');

    const fullChunkText = `${contextualHeader}\n${chunkBody}`;

    // Deterministic UUID for Qdrant point to avoid duplication
    const pointId = uuidv5(`${rawId}-chunk-${idx}`, UUID_NAMESPACE);

    return {
      pointId,
      textForEmbedding: fullChunkText,
      payload: {
        paper_id: rawId,
        chunk_index: idx,
        total_chunks: totalChunks,
        chunk_text: fullChunkText,
        title,
        abstract,
        authors,
        source,
        publication_date: publicationDate,
        publication_year: publicationYear,
        doi,
        url: url || (doi ? `https://doi.org/${doi}` : ''),
        pdf_url: pdfUrl,
        categories: Array.isArray(categories) ? categories.slice(0, 10) : [],
        indexed_at: new Date().toISOString(),
      },
    };
  });
}

