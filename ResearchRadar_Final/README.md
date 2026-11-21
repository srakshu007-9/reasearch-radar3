# ResearchRadar — integrated project

This package uses the selected `ResearchRadar_AI_PDF_Reader_Improved` React interface with the Flask/MySQL backend. The main discovery UI is wired to real backend endpoints; the original teammate source modules are retained under `source_modules/` for traceability and are not all separate runtime servers.

## Connected features

- **Login and signup:** React form calls `/api/auth/login` and `/api/auth/signup`; Flask stores password hashes in MySQL and maintains a session cookie.
- **Paper search:** `/api/papers` searches records in the `researchhub.papers` table. No hard-coded demo papers are used for workspace search results.
- **Saved papers:** `/api/saved` adds, lists and removes user-specific papers in MySQL.
- **AI recommendations:** `/api/recommendations?topic=...` retrieves candidate papers from MySQL and asks Groq to rank only those candidates.
- **AI Research Assistant:** `/api/assistant/chat` retrieves matching MySQL papers and asks Groq to answer with that context.
- **Paper collection:** `/api/collection/run` runs the collector for arXiv, OpenAlex, Crossref and PubMed. arXiv uses the preserved CyberNout OAI-PMH harvester through the adapter in `backend/collect_and_import.py`.
- **PDF Research Reader:** browser-side PDF.js text extraction and Tesseract OCR are retained. AI analysis now calls `/api/reader/analyze`, the actual Flask endpoint. The PDF library is stored locally in the browser IndexedDB, not in MySQL.
- **Help Desk:** in-app setup and troubleshooting guidance is included. A real support email/ticket service has not been configured because no team support address or ticket provider was supplied.

## Requirements

- Python 3.12 or 3.13 is recommended. Python 3.14 may work but some packages may not yet provide compatible wheels.
- Node.js 20 LTS or 22 LTS recommended. Node 24 is not required.
- MySQL Server 8.x.
- A Groq API key for AI assistant, recommendations and PDF AI analysis.
- Internet access for scholarly collection and Groq requests.

## 1. Database

Open MySQL Workbench and execute `backend/database/schema.sql`. It creates the `researchhub` database and required tables. Do not delete an existing database to run this script; it uses `CREATE TABLE IF NOT EXISTS`.

## 2. Backend configuration

Open a terminal in `backend`:

```powershell
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
Copy-Item .env.example .env
notepad .env
```

Set the values in `backend/.env`:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=YOUR_MYSQL_PASSWORD
DB_NAME=researchhub
SECRET_KEY=REPLACE_WITH_A_LONG_RANDOM_SECRET
FRONTEND_ORIGIN=http://127.0.0.1:5173,http://localhost:5173
GROQ_API_KEY=YOUR_GROQ_API_KEY
GROQ_MODEL=openai/gpt-oss-20b
COLLECTION_QUERY=artificial intelligence OR machine learning
COLLECTION_LIMIT_PER_SOURCE=100
```

Keep `.env` private. Do not upload it to GitHub or share your API key. Groq's current model list can change; if Groq returns a model error, check the active model IDs in Groq Console and update `GROQ_MODEL`.

Start the backend from the `backend` folder:

```powershell
python run.py
```

Check `http://127.0.0.1:5000/api/health`. The response should report `database: true` when MySQL credentials and schema are correct.

## 3. Frontend

Open a second terminal in `frontend`:

```powershell
npm install
npm run dev
```

Open `http://127.0.0.1:5173`. Vite proxies `/api` calls to Flask on port 5000. Run Flask and Vite in separate terminals.

## 4. First use

1. Create an account from the signup screen.
2. Open **Paper collection** and run collection. It can take several minutes depending on arXiv and the other scholarly services.
3. Open **Find similar papers** and search a topic that was collected.
4. Save a result and verify it appears in **Saved papers**.
5. Try **AI recommendations** and **AI Research Assistant** after confirming the Groq key works.
6. Open **PDF Research Reader**, upload a PDF, review extracted text and AI analysis, then save it to **My Research Library**.

## Important behaviour and limitations

- Search/recommendations operate on papers already imported into MySQL; they do not perform a live web search on each keystroke.
- Collection can fail partially if a source is unavailable or rate-limits requests. Check the collection output for per-source errors; successful sources can still import records.
- The collection route requires a logged-in user and runs synchronously; large collection settings can take a long time. Start with a low `COLLECTION_LIMIT_PER_SOURCE` (e.g. 10–25).
- PDF files and the browser PDF library are stored in the browser's IndexedDB. Clearing browser site data can remove those local PDF records.
- AI routes require a valid Groq API key, a model enabled for that key, network access and available quota.
- The Windows Code Integrity policy that blocked Rollup's native binary is a device policy issue. This source package cannot override that policy. If it blocks again, follow the policy details with your device administrator; do not disable enterprise security controls.

## Verification notes

Checks performed while preparing this archive:
- Python backend files compile without syntax errors.
- React JSX parses without syntax diagnostics using the installed TypeScript JSX parser.
- Frontend/backend endpoint names were checked for the PDF analysis path.
- ZIP integrity is checked after packaging.

Not verified in this environment:
- Live MySQL connection using your password.
- Live Groq calls using your private API key.
- Live arXiv/OpenAlex/Crossref/PubMed network collection.
- Full browser end-to-end acceptance tests or production deployment.

These require your machine's MySQL service, credentials, API key, Windows application-control policy and network access. The archive does not claim those external dependencies have been live-tested.


## CyberNout web discovery integration
The Explore Papers experience now follows the original CyberNout workflow: keyword search, academic-source filter, document-type filter, publication-year range, newest/oldest/most-cited sorting, source badges, abstract preview, DOI/citation metadata, details, save, source URL, PDF download and pagination. The four backend source scraper modules and data-processing modules are retained from the uploaded CyberNout project; ResearchRadar's integrated collection runner imports and stores records in the current ResearchRadar MySQL schema.
