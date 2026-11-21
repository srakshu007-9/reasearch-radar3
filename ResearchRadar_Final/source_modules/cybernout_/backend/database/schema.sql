
CREATE DATABASE IF NOT EXISTS researchhub
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE researchhub;

-- =====================================================
-- TABLE 1: CANONICAL PAPERS
-- Stores one record per unique research paper.
-- =====================================================

CREATE TABLE IF NOT EXISTS papers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    canonical_id VARCHAR(50) NOT NULL UNIQUE,

    title TEXT NOT NULL,
    abstract LONGTEXT,

    doi VARCHAR(500),
    arxiv_ids JSON,
    pmids JSON,
    openalex_ids JSON,

    authors JSON,
    keywords JSON,

    journal VARCHAR(1000),
    publisher VARCHAR(500),

    publication_date DATE,
    publication_year INT,

    paper_type VARCHAR(150),

    citation_count BIGINT DEFAULT 0,

    sources JSON,

    paper_url TEXT,
    pdf_url TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_doi (doi(191)),
    INDEX idx_year (publication_year),
    INDEX idx_title (title(255))
) ENGINE=InnoDB;


-- =====================================================
-- TABLE 2: PAPER SOURCES
-- Stores each original record from each source.
-- Multiple source records can belong to one paper.
-- =====================================================

CREATE TABLE IF NOT EXISTS paper_sources (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    paper_id BIGINT NOT NULL,

    source VARCHAR(50) NOT NULL,
    source_record_id VARCHAR(255),

    doi VARCHAR(500),
    arxiv_id VARCHAR(255),
    pmid VARCHAR(100),
    openalex_id VARCHAR(255),
    crossref_id VARCHAR(255),

    source_url TEXT,
    pdf_url TEXT,

    source_metadata JSON,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_paper_sources_paper
        FOREIGN KEY (paper_id)
        REFERENCES papers(id)
        ON DELETE CASCADE,

    UNIQUE KEY unique_source_record (
        source,
        source_record_id
    ),

    INDEX idx_source (source),
    INDEX idx_source_doi (doi(191)),
    INDEX idx_source_pmid (pmid),
    INDEX idx_source_arxiv (arxiv_id),
    INDEX idx_source_openalex (openalex_id)
) ENGINE=InnoDB;
