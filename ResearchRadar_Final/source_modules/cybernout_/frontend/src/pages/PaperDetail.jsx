import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, ExternalLink, FileDown, BookOpen, Quote,
  Calendar, Building, Tag, Globe2, AlertCircle, RefreshCw
} from 'lucide-react';
import { getPaperById } from '../services/paperService';

export default function PaperDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [paper, setPaper] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    getPaperById(id)
      .then((res) => {
        if (res.success && res.data) {
          setPaper(res.data);
        } else {
          setError(res.error || 'Paper not found in database.');
        }
      })
      .catch((err) => {
        setError(err.message || 'Error loading paper details.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  const getSourceBadgeClass = (source) => {
    const s = String(source).toLowerCase();
    if (s.includes('arxiv')) return 'source-badge arxiv';
    if (s.includes('openalex')) return 'source-badge openalex';
    if (s.includes('crossref')) return 'source-badge crossref';
    if (s.includes('pubmed')) return 'source-badge pubmed';
    return 'source-badge default';
  };

  const openAlexId = Array.isArray(paper?.openalex_ids)
    ? paper.openalex_ids.find(
        (id) => typeof id === 'string' && /^https:\/\/openalex\.org\/W[A-Za-z0-9]+$/i.test(id)
      )
    : null;
  const hasOpenAlexSource = Array.isArray(paper?.sources)
    && paper.sources.some((source) => String(source).toLowerCase() === 'openalex');
  const hasCrossrefSource = Array.isArray(paper?.sources)
    && paper.sources.some((source) => String(source).toLowerCase() === 'crossref');
  const crossrefQuery = paper?.doi || paper?.title;
  const repositoryUrl = hasOpenAlexSource && openAlexId
    ? openAlexId
    : hasCrossrefSource && crossrefQuery
      ? `https://search.crossref.org/?q=${encodeURIComponent(crossrefQuery)}`
      : paper?.paper_url;
  const repositoryLabel = hasOpenAlexSource && openAlexId
    ? 'Open OpenAlex Record'
    : hasCrossrefSource && crossrefQuery
      ? 'Open Crossref Record'
      : 'Open Repository Source';

  return (
    <div className="detail-page">
      <div className="detail-container">
        {/* Back navigation */}
        <button
          type="button"
          className="detail-back-btn"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={16} /> Back to Search Results
        </button>

        {loading ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
            <span>Fetching paper details from MySQL...</span>
          </div>
        ) : error ? (
          <div className="error-banner">
            <AlertCircle size={18} />
            <span>{error}</span>
            <button type="button" onClick={() => window.location.reload()}>
              <RefreshCw size={13} style={{ marginRight: '4px' }} /> Retry
            </button>
          </div>
        ) : !paper ? (
          <div className="empty">
            <b>Paper Not Found</b>
            <span>The requested research paper record does not exist in the database.</span>
            <Link to="/explore" className="primary-btn" style={{ marginTop: '12px' }}>
              Back to Explore
            </Link>
          </div>
        ) : (
          <article className="detail-card">
            {/* Sources and Type */}
            <div className="sources-row" style={{ marginBottom: '14px' }}>
              {Array.isArray(paper.sources) && paper.sources.map((src) => (
                <span key={src} className={getSourceBadgeClass(src)} style={{ fontSize: '10px', padding: '4px 9px' }}>
                  <Globe2 size={11} style={{ marginRight: '4px' }} />
                  {String(src).toUpperCase()}
                </span>
              ))}
              {paper.paper_type && (
                <span className="source-badge default" style={{ fontSize: '10px', padding: '4px 9px' }}>
                  {paper.paper_type.toUpperCase()}
                </span>
              )}
              {paper.citation_count > 0 && (
                <span className="citation-count-badge">
                  <Quote size={12} /> {paper.citation_count.toLocaleString()} citations
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="detail-title">{paper.title}</h1>

            {/* Authors */}
            {Array.isArray(paper.authors) && paper.authors.length > 0 && (
              <p className="detail-authors">
                <strong>Authors: </strong>
                {paper.authors.join(', ')}
              </p>
            )}

            {/* Meta Grid */}
            <div className="detail-meta-row">
              {paper.publication_date && (
                <div className="detail-meta-item">
                  <span className="detail-meta-label">Publication Date</span>
                  <span className="detail-meta-value">{paper.publication_date}</span>
                </div>
              )}

              {paper.publication_year && !paper.publication_date && (
                <div className="detail-meta-item">
                  <span className="detail-meta-label">Publication Year</span>
                  <span className="detail-meta-value">{paper.publication_year}</span>
                </div>
              )}

              {paper.doi && (
                <div className="detail-meta-item">
                  <span className="detail-meta-label">Digital Object Identifier (DOI)</span>
                  <span className="detail-meta-value">
                    <a
                      href={paper.doi.startsWith('http') ? paper.doi : `https://doi.org/${paper.doi}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {paper.doi}
                    </a>
                  </span>
                </div>
              )}

              {paper.journal && (
                <div className="detail-meta-item">
                  <span className="detail-meta-label">Journal / Venue</span>
                  <span className="detail-meta-value">{paper.journal}</span>
                </div>
              )}

              {paper.publisher && (
                <div className="detail-meta-item">
                  <span className="detail-meta-label">Publisher</span>
                  <span className="detail-meta-value">{paper.publisher}</span>
                </div>
              )}

              {paper.canonical_id && (
                <div className="detail-meta-item">
                  <span className="detail-meta-label">ResearchHub Canonical ID</span>
                  <span className="detail-meta-value" style={{ fontFamily: 'monospace', fontSize: '11px' }}>
                    {paper.canonical_id}
                  </span>
                </div>
              )}
            </div>

            {/* Abstract */}
            {paper.abstract ? (
              <div style={{ marginBottom: '24px' }}>
                <h2 className="detail-section-title">Abstract</h2>
                <p className="detail-abstract">{paper.abstract}</p>
              </div>
            ) : (
              <div style={{ marginBottom: '20px', color: '#8da49c', fontSize: '12px', fontStyle: 'italic' }}>
                Abstract not indexed for this record.
              </div>
            )}

            {/* Keywords */}
            {Array.isArray(paper.keywords) && paper.keywords.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h2 className="detail-section-title">Keywords & Subject Areas</h2>
                <div className="detail-keywords">
                  {paper.keywords.map((kw, idx) => (
                    <span key={idx} className="detail-keyword-tag">
                      <Tag size={10} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Action Links */}
            <div className="detail-links">
              {repositoryUrl && (
                <a
                  href={repositoryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="detail-link-btn"
                >
                  <ExternalLink size={14} /> {repositoryLabel}
                </a>
              )}

              {paper.pdf_url && (
                <a
                  href={paper.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="detail-link-btn secondary"
                >
                  <FileDown size={14} /> Download / View PDF
                </a>
              )}
            </div>
          </article>
        )}
      </div>
    </div>
  );
}

