import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowRight, ArrowUpRight, Search, FileText, CheckCircle2,
  Lightbulb, Globe2, Network, Bookmark, Sparkles, Activity, Database
} from 'lucide-react';
import { getStats } from '../services/paperService';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    getStats()
      .then((res) => {
        if (res.success) setStats(res.data);
      })
      .catch((err) => console.log('Could not load stats:', err));
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/explore?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/explore');
    }
  };

  const handleTopicClick = (topic) => {
    navigate(`/explore?q=${encodeURIComponent(topic)}`);
  };

  return (
    <div className="home">
      <main>
        {/* HERO SECTION */}
        <section className="hero">
          <div className="hero-text">
            <div className="eyebrow">
              <span /> ACADEMIC RESEARCH STARTS WITH WHAT ALREADY EXISTS
            </div>
            <h1>
              Before you begin,<br />
              know what's <em>been done.</em>
            </h1>
            <p className="hero-lead">
              Discover research papers related to your project topic — collected from
              arXiv, PubMed, OpenAlex, and Crossref, unified in one academic intelligence platform.
            </p>

            {/* LIVE WORKING SEARCH BAR */}
            <form className="hero-search-box" onSubmit={handleSearch}>
              <div className="hero-search-inner">
                <Search size={18} color="#73928b" />
                <input
                  type="text"
                  placeholder="Enter topic, keyword, title, or DOI (e.g., Deep Learning in Healthcare)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button type="submit">
                  Search Papers <ArrowRight size={14} />
                </button>
              </div>

              <div className="hero-popular-topics">
                <span>POPULAR TOPICS</span>
                {['Machine Learning', 'Quantum Computing', 'Genomics', 'Cybersecurity', 'Bioinformatics'].map((topic) => (
                  <button
                    type="button"
                    key={topic}
                    onClick={() => handleTopicClick(topic)}
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </form>

            {stats && (
              <div className="hero-stats-badge">
                <Database size={15} color="#285b58" />
                <span>
                  Indexing <strong>{stats.total_papers?.toLocaleString()}</strong> research papers across 4 major repositories
                </span>
              </div>
            )}

            <div className="hero-note">
              <span className="note-icon">
                <CheckCircle2 size={15} />
              </span>
              <span>Explore existing work. Identify research gaps. Accelerate literature review.</span>
            </div>
          </div>

          <div className="hero-visual">
            <div className="visual-glow"></div>
            <div className="visual-grid"></div>

            <div className="search-demo">
              <div className="demo-label">
                <span className="pulse"></span> LIVE REPOSITORY INDEX
                <span className="demo-live">DATABASE CONNECTED</span>
              </div>
              <div className="demo-query">
                <Search size={17} />
                <span>Academic Literature Intelligence</span>
                <ArrowRight size={16} />
              </div>
              <div className="match-label">
                SUPPORTED SOURCES <b>118,800+ Curated Records</b>
              </div>

              <div className="mini-paper">
                <div className="paper-symbol">
                  <FileText size={17} />
                </div>
                <div>
                  <b>arXiv Preprints</b>
                  <small>Computer Science · Physics · Mathematics</small>
                </div>
                <span className="match">{stats?.sources?.arxiv ? `${stats.sources.arxiv.toLocaleString()} papers` : '30,000 papers'}</span>
              </div>

              <div className="mini-paper">
                <div className="paper-symbol blue">
                  <FileText size={17} />
                </div>
                <div>
                  <b>OpenAlex Global Corpus</b>
                  <small>Multidisciplinary Scientific Literature</small>
                </div>
                <span className="match">{stats?.sources?.openalex ? `${stats.sources.openalex.toLocaleString()} papers` : '30,000 papers'}</span>
              </div>

              <div className="mini-paper">
                <div className="paper-symbol violet">
                  <FileText size={17} />
                </div>
                <div>
                  <b>Crossref DOIs & Citations</b>
                  <small>Peer-Reviewed Journal Articles & Books</small>
                </div>
                <span className="match">{stats?.sources?.crossref ? `${stats.sources.crossref.toLocaleString()} papers` : '30,000 papers'}</span>
              </div>

              <div className="mini-paper">
                <div className="paper-symbol" style={{ background: '#fce8e8', color: '#b91c1c' }}>
                  <FileText size={17} />
                </div>
                <div>
                  <b>PubMed Biomedical Literature</b>
                  <small>Life Sciences · Medicine · Healthcare</small>
                </div>
                <span className="match">{stats?.sources?.pubmed ? `${stats.sources.pubmed.toLocaleString()} papers` : '30,000 papers'}</span>
              </div>

              <div className="demo-footer">
                <span>
                  <Globe2 size={13} /> 4 Unified Sources
                </span>
                <span>
                  <Network size={13} /> Multi-Field Cross Search
                </span>
              </div>
            </div>

            <div className="float-note float-a">
              <span className="float-icon">
                <Network size={16} />
              </span>
              <div>
                <b>Unified Search</b>
                <small>4 Academic Sources</small>
              </div>
            </div>

            <div className="float-note float-b">
              <span className="float-icon mint">
                <Sparkles size={16} />
              </span>
              <div>
                <b>Deep Exploration</b>
                <small>Metadata & PDF Access</small>
              </div>
            </div>

            <span className="decor-star star1">✳</span>
            <span className="decor-star star2">✦</span>
          </div>
        </section>

        {/* SOURCE BAND */}
        <section className="source-band" id="sources">
          <span>INDEXED ACADEMIC REPOSITORIES</span>
          <div>
            <b>arXiv</b>
            <b>Crossref</b>
            <b>OpenAlex</b>
            <b>PubMed</b>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="how-section" id="how">
          <div className="eyebrow centered">A STREAMLINED WORKFLOW FOR SCHOLARS</div>
          <h2>
            From your research question to the<br />
            <em>literature that matters.</em>
          </h2>
          <p className="section-intro">
            No need to visit fragmented portals one by one. ResearchHub harmonizes metadata, authors,
            citations, and links across key academic sources.
          </p>

          <div className="steps">
            <article className="step">
              <div className="step-top">
                <span>01</span>
                <div><Lightbulb size={16} /></div>
              </div>
              <h3>Define your topic</h3>
              <p>Enter a title, research keywords, specific author name, or DOI identifier.</p>
            </article>

            <article className="step">
              <div className="step-top">
                <span>02</span>
                <div><Globe2 size={16} /></div>
              </div>
              <h3>Cross-Repository Search</h3>
              <p>Query over 118,000 canonical academic records indexed from 4 global sources.</p>
            </article>

            <article className="step">
              <div className="step-top">
                <span>03</span>
                <div><Network size={16} /></div>
              </div>
              <h3>Filter and Refine</h3>
              <p>Slice findings by publication year, repository, publication type, and citation ranking.</p>
            </article>

            <article className="step">
              <div className="step-top">
                <span>04</span>
                <div><Bookmark size={16} /></div>
              </div>
              <h3>Access Full Text</h3>
              <p>Inspect comprehensive abstracts, verified metadata, direct publisher URLs, and open PDFs.</p>
            </article>
          </div>
        </section>

        {/* WHY RESEARCHHUB */}
        <section className="why-section" id="why">
          <div className="why-copy">
            <div className="eyebrow pale">INTELLECTUAL RIGOR AT SCALE</div>
            <h2>
              Know the literature.<br />
              <em>Find your direction.</em>
            </h2>
            <p>
              Whether structuring a systematic review, preparing a grant proposal, or validating hypothesis novelty,
              ResearchHub provides an evidence-based foundation for your research.
            </p>
            <Link to="/explore" className="light-btn">
              Explore All Papers <ArrowUpRight size={16} />
            </Link>
          </div>

          <div className="why-art">
            <div className="circle-lines"></div>
            <div className="center-node">
              <Activity size={34} />
              <b>Research Topic</b>
            </div>
            <div className="node node1">
              <FileText />
              <span>Prior Works</span>
            </div>
            <div className="node node2">
              <FileText />
              <span>Cross-Citations</span>
            </div>
            <div className="node node3">
              <FileText />
              <span>Research Gap</span>
            </div>
            <div className="node node4">
              <FileText />
              <span>New Innovation</span>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="footer">
        <div className="brand">
          <span className="brand-icon">
            <Activity size={18} />
          </span>
          <span>
            research<span>hub</span>
          </span>
        </div>
        <span>Empowering researchers with unified academic discovery.</span>
        <span>© 2026 ResearchHub. All rights reserved.</span>
      </footer>
    </div>
  );
}

