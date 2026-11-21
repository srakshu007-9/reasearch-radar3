import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Search, Filter, ArrowUpRight, BookOpen, Quote, ExternalLink,
  ChevronLeft, ChevronRight, SlidersHorizontal, X, FileText, AlertCircle, RefreshCw
} from 'lucide-react';
import { searchPapers, getFilters } from '../services/paperService';

export default function ExplorePapers() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Search input state
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');
  const [selectedSource, setSelectedSource] = useState(searchParams.get('source') || '');
  const [selectedType, setSelectedType] = useState(searchParams.get('paper_type') || '');
  const [yearFrom, setYearFrom] = useState(searchParams.get('year_from') || '');
  const [yearTo, setYearTo] = useState(searchParams.get('year_to') || '');
  const [sortOption, setSortOption] = useState(searchParams.get('sort') || 'newest');
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '1', 10));

  // Data states
  const [papers, setPapers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, total_pages: 0 });
  const [filterOptions, setFilterOptions] = useState({ sources: [], paper_types: [], year_range: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Fetch filter options once
  useEffect(() => {
    getFilters()
      .then((res) => {
        if (res.success) {
          setFilterOptions(res.data);
        }
      })
      .catch((err) => console.error('Filter options fetch error:', err));
  }, []);

  // Fetch papers based on current query parameters
  const fetchPapersList = useCallback(() => {
    setLoading(true);
    setError(null);

    const params = {
      page: currentPage,
      limit: 20,
      sort: sortOption,
    };

    const q = searchParams.get('q');
    if (q) params.q = q;

    const source = searchParams.get('source');
    if (source) params.source = source;

    const pType = searchParams.get('paper_type');
    if (pType) params.paper_type = pType;

    const yFrom = searchParams.get('year_from');
    if (yFrom) params.year_from = yFrom;

    const yTo = searchParams.get('year_to');
    if (yTo) params.year_to = yTo;

    searchPapers(params)
      .then((res) => {
        if (res.success) {
          setPapers(res.data);
          setPagination(res.pagination);
        } else {
          setError(res.error || 'Failed to retrieve research papers.');
        }
      })
      .catch((err) => {
        setError(err.message || 'Error connecting to the ResearchHub backend server.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [searchParams, currentPage, sortOption]);

  useEffect(() => {
    fetchPapersList();
  }, [fetchPapersList]);

  // Handle Search Submission
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const newParams = new URLSearchParams(searchParams);
    if (searchInput.trim()) {
      newParams.set('q', searchInput.trim());
    } else {
      newParams.delete('q');
    }
    newParams.set('page', '1');
    setCurrentPage(1);
    setSearchParams(newParams);
  };

  // Apply filters
  const applyFilters = () => {
    const newParams = new URLSearchParams(searchParams);
    if (selectedSource) newParams.set('source', selectedSource);
    else newParams.delete('source');

    if (selectedType) newParams.set('paper_type', selectedType);
    else newParams.delete('paper_type');

    if (yearFrom) newParams.set('year_from', yearFrom);
    else newParams.delete('year_from');

    if (yearTo) newParams.set('year_to', yearTo);
    else newParams.delete('year_to');

    newParams.set('sort', sortOption);
    newParams.set('page', '1');
    setCurrentPage(1);
    setSearchParams(newParams);
    setMobileFilterOpen(false);
  };

  // Reset filters
  const resetFilters = () => {
    setSelectedSource('');
    setSelectedType('');
    setYearFrom('');
    setYearTo('');
    setSortOption('newest');
    const newParams = new URLSearchParams();
    const q = searchParams.get('q');
    if (q) newParams.set('q', q);
    newParams.set('page', '1');
    setCurrentPage(1);
    setSearchParams(newParams);
    setMobileFilterOpen(false);
  };

  // Page change
  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.total_pages) return;
    setCurrentPage(newPage);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', String(newPage));
    setSearchParams(newParams);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getSourceBadgeClass = (source) => {
    const s = String(source).toLowerCase();
    if (s.includes('arxiv')) return 'source-badge arxiv';
    if (s.includes('openalex')) return 'source-badge openalex';
    if (s.includes('crossref')) return 'source-badge crossref';
    if (s.includes('pubmed')) return 'source-badge pubmed';
    return 'source-badge default';
  };

  return (
    <div className="explore-page">
      {/* TOP SEARCH BAR */}
      <form className="explore-search-bar" onSubmit={handleSearchSubmit}>
        <Search size={18} color="#6d8e87" />
        <input
          type="text"
          placeholder="Search paper title, abstract, authors, keywords or DOI..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <button type="submit">
          Search Papers
        </button>
        <button
          type="button"
          className="filter-toggle-mobile"
          onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
          style={{ background: '#eaf4ee', color: '#285b58', border: '1px solid #d0e2da' }}
        >
          <SlidersHorizontal size={14} /> Filters
        </button>
      </form>

      <div className="explore-layout">
        {/* SIDEBAR FILTER PANEL */}
        <aside className={`filter-panel ${mobileFilterOpen ? 'mobile-open' : ''}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3>Search Filters</h3>
            {mobileFilterOpen && (
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                style={{ border: 0, background: 'none', cursor: 'pointer', color: '#7a9690' }}
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Source Filter */}
          <div className="filter-section">
            <span className="filter-section-title">Academic Source</span>
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
            >
              <option value="">All Sources</option>
              {filterOptions.sources?.map((src) => (
                <option key={src} value={src}>
                  {src.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Paper Type Filter */}
          <div className="filter-section">
            <span className="filter-section-title">Document Type</span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              <option value="">All Types</option>
              {filterOptions.paper_types?.map((type) => (
                <option key={type} value={type}>
                  {type.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </option>
              ))}
            </select>
          </div>

          {/* Year Range */}
          <div className="filter-section">
            <span className="filter-section-title">Publication Year</span>
            <div className="year-range">
              <input
                type="number"
                placeholder="From (e.g. 2018)"
                value={yearFrom}
                onChange={(e) => setYearFrom(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 8px',
                  borderRadius: '5px',
                  border: '1px solid #d5e4de',
                  fontSize: '10px'
                }}
              />
              <input
                type="number"
                placeholder="To (e.g. 2026)"
                value={yearTo}
                onChange={(e) => setYearTo(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 8px',
                  borderRadius: '5px',
                  border: '1px solid #d5e4de',
                  fontSize: '10px'
                }}
              />
            </div>
          </div>

          {/* Sort By */}
          <div className="filter-section">
            <span className="filter-section-title">Sort By</span>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="most_cited">Most Cited</option>
            </select>
          </div>

          <button type="button" className="filter-apply-btn" onClick={applyFilters}>
            Apply Filters
          </button>
          <button type="button" className="filter-reset-btn" onClick={resetFilters}>
            Reset Filters
          </button>
        </aside>

        {/* PAPERS MAIN CONTENT */}
        <main className="papers-main">
          {/* Header */}
          <div className="papers-header">
            <div>
              <h2>
                {searchParams.get('q') ? (
                  <>Results for “<em>{searchParams.get('q')}</em>”</>
                ) : (
                  'All Academic Papers'
                )}
              </h2>
              <span className="papers-count">
                Showing {papers.length} of {pagination.total.toLocaleString()} records found
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '10px', color: '#7a9690' }}>Sort:</span>
              <select
                value={sortOption}
                onChange={(e) => {
                  setSortOption(e.target.value);
                  const newParams = new URLSearchParams(searchParams);
                  newParams.set('sort', e.target.value);
                  newParams.set('page', '1');
                  setCurrentPage(1);
                  setSearchParams(newParams);
                }}
                style={{
                  border: '1px solid #d5e4de',
                  borderRadius: '5px',
                  background: '#fff',
                  padding: '5px 8px',
                  fontSize: '10px',
                  color: '#4e6e67'
                }}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="most_cited">Most Cited</option>
              </select>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="error-banner">
              <AlertCircle size={16} />
              <span>{error}</span>
              <button type="button" onClick={fetchPapersList}>
                <RefreshCw size={12} style={{ marginRight: '4px', display: 'inline' }} /> Retry
              </button>
            </div>
          )}

          {/* Loading Spinner */}
          {loading ? (
            <div className="loading-spinner">
              <div className="spinner"></div>
              <span>Searching MySQL database...</span>
            </div>
          ) : papers.length === 0 ? (
            /* Empty State */
            <div className="empty" style={{ margin: '30px 0' }}>
              <Search size={32} color="#7a9690" />
              <b>No research papers found</b>
              <span>Try broadening your search query or removing active filters.</span>
              <button type="button" onClick={resetFilters}>
                Clear All Filters
              </button>
            </div>
          ) : (
            /* Papers Cards List */
            <div className="paper-cards-list">
              {papers.map((paper) => {
                const authorsList = Array.isArray(paper.authors) ? paper.authors : [];
                const authorsDisplay = authorsList.length > 0
                  ? authorsList.slice(0, 4).join(', ') + (authorsList.length > 4 ? ` et al.` : '')
                  : 'Authors not specified';

                const sourcesList = Array.isArray(paper.sources) ? paper.sources : [];

                return (
                  <article className="paper-card-new" key={paper.id}>
                    {/* Sources Badges */}
                    <div className="sources-row">
                      {sourcesList.map((src) => (
                        <span key={src} className={getSourceBadgeClass(src)}>
                          {String(src).toUpperCase()}
                        </span>
                      ))}
                      {paper.paper_type && (
                        <span className="source-badge default">
                          {paper.paper_type}
                        </span>
                      )}
                    </div>

                    {/* Paper Title */}
                    <button
                      type="button"
                      className="paper-title-link"
                      onClick={() => navigate(`/papers/${paper.id}`)}
                    >
                      {paper.title}
                    </button>

                    {/* Authors */}
                    <p className="paper-authors">
                      {authorsDisplay}
                    </p>

                    {/* Abstract Preview */}
                    {paper.abstract && (
                      <p className="paper-abstract-preview">
                        {paper.abstract}
                      </p>
                    )}

                    {/* Footer Details */}
                    <div className="paper-card-footer">
                      <div className="paper-card-meta">
                        {paper.publication_year && (
                          <span className="paper-year">
                            Year: {paper.publication_year}
                          </span>
                        )}
                        {paper.journal && (
                          <span className="paper-doi" title={paper.journal}>
                            {paper.journal.length > 40 ? `${paper.journal.substring(0, 40)}...` : paper.journal}
                          </span>
                        )}
                        {paper.doi && (
                          <span className="paper-doi">
                            DOI: {paper.doi}
                          </span>
                        )}
                        {paper.citation_count > 0 && (
                          <span className="paper-citations">
                            <Quote size={11} /> {paper.citation_count.toLocaleString()} citations
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        className="view-details-btn"
                        onClick={() => navigate(`/papers/${paper.id}`)}
                      >
                        View Details <ArrowUpRight size={12} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {!loading && pagination.total_pages > 1 && (
            <div className="paper-pagination">
              <button
                type="button"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
              >
                <ChevronLeft size={14} style={{ verticalAlign: 'middle' }} /> Previous
              </button>

              <span className="page-info">
                Page {pagination.page} of {pagination.total_pages.toLocaleString()}
              </span>

              <button
                type="button"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= pagination.total_pages}
              >
                Next <ChevronRight size={14} style={{ verticalAlign: 'middle' }} />
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

