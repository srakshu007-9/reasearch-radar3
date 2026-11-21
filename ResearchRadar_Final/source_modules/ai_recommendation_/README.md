# ScholarPulse AI — Autonomous Academic RAG Chatbot

> A production-grade, embeddable Retrieval-Augmented Generation (RAG) assistant designed for rigorous scientific literature exploration, cross-disciplinary synthesis, and institutional research discovery.

[![Vercel Deployment](https://img.shields.io/badge/Vercel-Production%20Ready-black?logo=vercel)](https://vercel.com)
[![Qdrant Vector DB](https://img.shields.io/badge/Qdrant-Cloud%20Vector%20DB-dc2626)](https://qdrant.tech)
[![Groq LPU](https://img.shields.io/badge/Groq-LPU%20Inference-f97316)](https://groq.com)
[![Google Gemini](https://img.shields.io/badge/Gemini-3072d%20Embeddings-2563eb)](https://ai.google.dev)
[![Upstash Redis](https://img.shields.io/badge/Upstash-CAG%20%26%20MAG%20Memory-00e699)](https://upstash.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 🌟 System Architecture & Algorithms

ScholarPulse AI integrates state-of-the-art information retrieval with high-speed LLM inference and layered conversational memory:

```
                                  [ User Query ]
                                        │
                                        ▼
                         ┌─────────────────────────────┐
                         │   CAG Check (Redis Cache)   │ ──(Cache Hit <70ms)──▶ Instant Response
                         └──────────────┬──────────────┘
                                        │ (Cache Miss)
                                        ▼
                         ┌─────────────────────────────┐
                         │ Contextual Query Rewriter   │ (Resolves follow-ups using MAG memory)
                         └──────────────┬──────────────┘
                                        │
                                        ▼
                         ┌─────────────────────────────┐
                         │ Gemini 3,072d Embeddings    │
                         └──────────────┬──────────────┘
                                        │
                                        ▼
                         ┌─────────────────────────────┐
                         │ Qdrant Vector Retrieval     │ (Cosine Similarity + Payload Filters)
                         └──────────────┬──────────────┘
                                        │
                                        ▼
                         ┌─────────────────────────────┐
                         │ Zero-Loss Context Assembly  │ (Title, Authors, Year, DOI, Source)
                         └──────────────┬──────────────┘
                                        │
                                        ▼
                         ┌─────────────────────────────┐
                         │ Groq LPU Synthesis (SSE)    │ ──▶ Real-time Streaming
                         └──────────────┬──────────────┘
                                        │
                                        ▼
                         ┌─────────────────────────────┐
                         │  Store CAG + Update FAQs    │
                         └─────────────────────────────┘
```

### Core Features

1. **Zero-Data-Loss Semantic Chunking**:
   - Preserves complete academic context headers on every vector: `[Paper Title]`, `[Authors]`, `[Source]`, `[Year]`, and `[DOI]`.
   - Guaranteed citation grounding with zero hallucinations.

2. **3,072-Dimensional Dense Vectors (Google Gemini)**:
   - High-fidelity embeddings using `gemini-embedding-001`.
   - In-memory LRU hashing to prevent redundant embedding calls.

3. **CAG (Cache-Augmented Generation)**:
   - SHA-256 normalized query caching in Upstash Redis.
   - Repeated queries return verified answers within sub-70ms without LLM latency or token costs.

4. **MAG (Memory-Augmented Generation)**:
   - Multi-turn conversational session tracking.
   - Intelligently rewrites referential follow-up questions (*"Who were the authors?"*) into standalone search queries.

5. **Dynamic Frequency-Ranked FAQs**:
   - Automatically ranks trending community queries in a Redis Sorted Set (`faq:query_frequencies`).
   - Top FAQs are dynamically served to the UI and pre-warmed into the cache.

6. **ChatGPT-Style Embeddable Widget**:
   - Drop-in `<script src="/widget.js"></script>` compatible with any existing website or framework.
   - Light theme palette: White (`#ffffff`), Current Blue (`#2563eb`), and Metallic Black (`#090d16`).
   - Clean scroll behavior that keeps the viewport at the start of responses for optimal reading.

---

## 🚀 Quick Start (Local Development)

### 1. Installation
```bash
git clone https://github.com/Kishor-bala/AI-recommendation.git
cd AI-recommendation
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in your credentials in `.env`:
- `QDRANT_URL` and `QDRANT_API_KEY`
- `GROQ_API_KEY`
- `GEMINI_API_KEY`
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the motion-design research portal.

### 4. Run Automated Test Suite
```bash
npm test
```
Executes all 8 end-to-end integration tests:
- Zero-loss chunker validation
- Gemini 3072d embedding generation
- Qdrant collection indexing and retrieval
- Redis CAG cache write & hit latency
- Redis MAG session memory tracking
- Dynamic FAQ frequency tracking
- Groq direct response generation
- Full RAG + CAG + MAG pipeline test

---

## ☁️ Deploying to Vercel

This repository is pre-configured for seamless zero-config deployment on Vercel as a Serverless Function with Edge CDN static asset delivery.

### Option A: Deploy via GitHub (Recommended)
1. Push your repository to GitHub.
2. Go to [Vercel Dashboard](https://vercel.com/new).
3. Import the `AI-recommendation` repository.
4. In **Project Settings ➔ Environment Variables**, add:
   - `QDRANT_URL`
   - `QDRANT_API_KEY`
   - `GROQ_API_KEY`
   - `GEMINI_API_KEY`
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
   - `REDIS_PASSWORD` (optional)
5. Click **Deploy**. Vercel will automatically build the static assets and deploy `/api` serverless endpoints.

### Option B: Deploy via Vercel CLI
```bash
npm i -g vercel
vercel
```

---

## 🔌 Integrating the Chatbot into Existing Webpages

Embed the assistant into any HTML page by pasting this snippet right before `</body>`:

```html
<!-- ScholarPulse AI Research Assistant -->
<script 
  src="https://your-deployment.vercel.app/widget.js" 
  data-api-url="https://your-deployment.vercel.app">
</script>
```

---

## 📡 REST API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/chat` | Main RAG inference with SSE streaming (`stream: true`) or JSON |
| `GET` | `/api/health` | Comprehensive pre-flight health diagnostics of all 4 services |
| `GET` | `/api/faq/dynamic` | Returns dynamic frequency-ranked FAQ questions |
| `POST` | `/api/session/clear` | Clears conversation memory for a session ID |
| `POST` | `/api/feedback` | Records user feedback (upvote/downvote) |

---

## 📄 License

MIT License &copy; 2026 ScholarPulse AI
