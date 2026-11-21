# ResearchHub — Academic Research Intelligence Platform

An integrated full-stack research intelligence platform that unifies academic papers across **arXiv**, **PubMed**, **OpenAlex**, and **Crossref**, backed by a production MySQL database and delivered through a responsive React (Vite) interface styled in a mint and teal academic theme.

---

## 🏛 Architecture Overview

```
ResearchHub/
├── backend/                  # Flask API and data ingestion pipeline
│   ├── app/                  # Flask application, models, and routes
│   ├── database/             # MySQL schema, connectivity, and importer
│   ├── processing/           # Cleaning, normalization, and deduplication
│   ├── scraper/              # arXiv, Crossref, OpenAlex, and PubMed collectors
│   ├── tests/                # Backend API tests
│   ├── .env                  # Local backend environment (Git-ignored)
│   ├── .env.example          # Backend environment template
│   ├── requirements.txt      # Python dependencies
│   └── run.py                # Flask API entry point
├── frontend/                 # React 18 + Vite frontend
│   ├── src/                  # Components, pages, services, and styles
│   ├── index.html            # Main HTML shell
│   ├── package.json          # Node dependencies and scripts
│   ├── vite.config.js        # Vite configuration
│   ├── .env                  # Frontend environment (Git-ignored)
│   └── .env.example          # Frontend environment template
├── venv/                     # Local Python environment (kept at project root)
├── .gitignore                # Git Exclusions
└── README.md                 # Complete Project Documentation
```

---

## 📊 Database Specifications

- **Database Name**: `researchhub`
- **Engine**: MySQL 8.0+ (InnoDB, `utf8mb4_unicode_ci`)
- **Total Canonical Papers**: `118,830`
- **Total Paper Sources**: `119,982`
- **Repository Breakdown**:
  - **arXiv**: ~30,000 papers
  - **PubMed**: ~30,000 papers
  - **OpenAlex**: ~30,000 papers
  - **Crossref**: ~29,983 papers
- **Year Span**: `1687` to `2026`

### Core Tables
1. **`papers`**: Stores deduplicated canonical papers (`id`, `canonical_id`, `title`, `abstract`, `doi`, `arxiv_ids`, `pmids`, `openalex_ids`, `authors`, `keywords`, `journal`, `publisher`, `publication_date`, `publication_year`, `paper_type`, `citation_count`, `sources`, `paper_url`, `pdf_url`).
2. **`paper_sources`**: Stores raw provenance records mapped by foreign key `paper_id` to `papers(id)`.

---

## ⚡ API Endpoints Specification

All backend endpoints are prefixed with `/api` and return standardized JSON:

| Method | Endpoint | Description | Query Parameters |
|---|---|---|---|
| `GET` | `/api/stats` | High-level repository statistics | None |
| `GET` | `/api/papers/filters` | Dynamic filter values from database | None |
| `GET` | `/api/papers` | Search & filter canonical papers | `q`, `author`, `source`, `paper_type`, `journal`, `year_from`, `year_to`, `sort`, `page`, `limit` |
| `GET` | `/api/papers/<id>` | Full details for a single paper | Path parameter: `id` (integer) |

### Sample Response Contract:
```json
{
  "success": true,
  "data": [
    {
      "id": 33739,
      "canonical_id": "RH-EBFBC9CBB0F9560C8DCF",
      "title": "A Survey of Large Language Models",
      "abstract": "The rapid evolution of large language models (LLMs)...",
      "authors": ["Wayne Xin Zhao", "Kun Zhou"],
      "doi": "10.1007/s11704-026-60308-3",
      "journal": "Frontiers of Computer Science",
      "keywords": ["Topic Modeling", "Natural Language Processing Techniques"],
      "publication_date": "2026-05-09",
      "publication_year": 2026,
      "paper_type": "article",
      "citation_count": 8704,
      "sources": ["openalex"],
      "paper_url": "https://doi.org/10.1007/s11704-026-60308-3",
      "pdf_url": "https://link.springer.com/content/pdf/10.1007/s11704-026-60308-3.pdf"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 766,
    "total_pages": 39
  }
}
```

---

## 🚀 Windows Setup and Execution Instructions

### Prerequisites
- Python 3.10+ (Python 3.13 recommended)
- Node.js 18+ & npm
- MySQL Server 8.0+ running locally on port 3306

---

### Step 1: Configure Environment (.env)
Ensure `backend/.env` exists:
```ini
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=researchhub
FLASK_DEBUG=False
```

And in `frontend/.env`:
```ini
VITE_API_BASE_URL=http://127.0.0.1:5000/api
```

---

### Step 2: Start the Backend (Terminal 1)
Open **Windows Command Prompt (CMD)**:
```cmd
cd /d "d:\document\intership\cybernout\month 1\ResearchHub"
call venv\Scripts\activate.bat
cd backend
pip install -r requirements.txt
python run.py
```
> The Flask API will start on **`http://127.0.0.1:5000`**.

---

### Step 3: Start the Frontend (Terminal 2)
Open a **second Windows Command Prompt (CMD)**:
```cmd
cd /d "d:\document\intership\cybernout\month 1\ResearchHub\frontend"
npm install
npm run dev
```
> The React interface will be live on **`http://localhost:5173`**.

---

### Step 4: Run Automated Tests (Terminal 3)
In Windows Command Prompt:
```cmd
cd /d "d:\document\intership\cybernout\month 1\ResearchHub\backend"
call ..\venv\Scripts\activate.bat
python -m unittest discover -s tests -p "test_*.py"
```

---

### Step 5: Build Frontend for Production
```cmd
cd /d "d:\document\intership\cybernout\month 1\ResearchHub\frontend"
npm run build
```
Build output will be bundled cleanly in `frontend/dist/`.

---

## 🔒 Security & Code Quality

- **SQL Injection Prevention**: All queries in `backend/app/models/paper.py` use parameterized queries (`%s`), never raw string formatting.
- **Input Validation**: `page`, `limit`, and `year` query parameters are strictly cast and validated with descriptive 400 Bad Request responses.
- **Credential Protection**: Database passwords and secrets are loaded exclusively through environment variables.
- **Safe JSON Parsing**: Malformed or null JSON fields in MySQL return resilient empty arrays without crashing requests.
- **Cross-Origin Security**: `flask-cors` is configured explicitly for development origins.

