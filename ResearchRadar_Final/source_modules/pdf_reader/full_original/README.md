# ResearchRadar – Similar Paper Discovery + AI PDF Research Reader

## Run the project
1. Install Node.js (LTS).
2. Open this folder in VS Code / PowerShell.
3. Run `npm install`.
4. Copy `.env.example` to `.env` and add an API key, model name, and API base URL for an OpenAI-compatible AI provider.
5. Run `npm run dev`.
6. Open the local URL printed by Vite. The command starts both the React website and the local AI server.

## AI provider configuration
The PDF reader sends extracted text to the local Node.js server. The server calls the configured OpenAI-compatible chat-completions API. The API key stays in the server `.env` file and is never sent to the browser.

Set these values in `.env`:
- `AI_BASE_URL`: provider API base URL (default example is OpenAI).
- `AI_API_KEY`: secret API key from your chosen provider.
- `AI_MODEL`: model name enabled for your account.
- `AI_MAX_CHARS`: maximum PDF text characters sent for analysis (default 85000).

Do not commit `.env` or share your API key. The project uses the uploaded PDF text only; it does not search scraped paper records to create the summary.

## PDF Research Reader
- Reads text from the actual uploaded PDF using PDF.js, sorting text runs by page position to reduce scrambled lines.
- Uses OCR on image-only PDFs (English, up to 12 pages).
- Uses embedded PDF metadata and first-page content as preliminary title/author hints.
- Sends the extracted PDF text to the configured AI model to verify title, author names, abstract, document type, and section structure.
- Generates four short, simple-English sections: About the Paper, Problem Statement, Working Methodology, and Key Findings.
- The analysis prompt excludes the bibliography/references and instructs the model not to invent missing details. It also detects non-research documents such as course syllabi and avoids presenting course outcomes as research findings.
- If the AI service is not configured or fails, the UI clearly labels the fallback as unverified text extraction rather than presenting it as an AI-understood summary.
- Title, author, and abstract fields remain editable before saving.

## My Research Library
- Saves the uploaded PDF and its extracted/AI-analyzed details in browser IndexedDB.
- Search saved papers, view details, reopen the PDF, and delete a saved paper.
- Data is local to the browser/device. Clearing browser site data may remove it.

## Limitations
- Metadata quality depends on the PDF's text/layout and the information present in the document. Always verify extracted title and author names.
- Scanned documents can contain OCR errors. OCR is currently English-only and limited to the first 12 pages.
- AI analysis requires an active API key and a model available from your provider. Large papers are capped by `AI_MAX_CHARS`; later pages may not reach the model if the cap is exceeded.
- This frontend demo still stores papers locally; it does not provide a cloud account or shared library.

## Main technologies
React, Vite, PDF.js, Tesseract.js, Express, an OpenAI-compatible AI API, and IndexedDB.
