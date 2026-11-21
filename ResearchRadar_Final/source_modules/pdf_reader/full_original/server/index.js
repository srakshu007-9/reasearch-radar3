import express from 'express';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
app.use(express.json({ limit: '12mb' }));
const PORT = Number(process.env.API_PORT || 3001);

function removeReferences(text = '') {
  const lines = text.split(/\r?\n/);
  const heading = /^(?:\d+(?:\.\d+)*\.?\s*)?(references|bibliography|works cited|literature cited|reference list)\s*$/i;
  const index = lines.findIndex(line => heading.test(line.trim()));
  return lines.slice(0, index < 0 ? lines.length : index).join('\n').trim();
}

app.get('/api/health', (_req, res) => res.json({ ok: true, aiConfigured: Boolean(process.env.AI_API_KEY) }));

app.post('/api/analyze-paper', async (req, res) => {
  try {
    const { text = '', title = '', authors = '' } = req.body || {};
    if (typeof text !== 'string' || text.trim().length < 250) {
      return res.status(400).json({ error: 'Not enough readable text was extracted from this PDF.' });
    }
    const apiKey = process.env.AI_API_KEY;
    if (!apiKey) return res.status(503).json({ error: 'AI_API_KEY is missing. Configure the server .env file.' });

    const baseUrl = (process.env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
    const model = process.env.AI_MODEL;
    if (!model) return res.status(503).json({ error: 'AI_MODEL is missing. Set the model name in server .env.' });

    const paperText = removeReferences(text).slice(0, Number(process.env.AI_MAX_CHARS || 85000));
    const prompt = `You are an academic paper analyst. Analyze ONLY the uploaded PDF text below. Do not use web knowledge or invent details.\n\nFirst decide whether this document is actually a research paper. A course syllabus, lecture notes, textbook chapter, assignment, brochure, or report that is not a research paper must be classified as not a research paper.\n\nExtract title, author names, and abstract from the document. Correct obvious line-break/OCR spacing errors only when the intended text is unambiguous. If a field is absent or uncertain, return an empty string; do not guess.\n\nFor a research paper, write four short sections in simple English (2-4 sentences each):\n- about: the topic, aim, and scope of the paper.\n- problem: the specific problem or research gap the paper addresses.\n- methodology: what the researchers actually did, including system/model/data/steps when stated.\n- findings: actual results and conclusions. Do not invent numerical results.\n\nFor a non-research document, set isResearchPaper=false and explain that the uploaded file does not contain enough research-paper structure for these four research summary fields. Do not convert course outcomes or syllabus objectives into research findings.\n\nNever include references, bibliography entries, citation lists, or reference-site names as headings. Keep all summary content grounded in the supplied text. Return ONLY valid JSON with this exact shape:\n{"isResearchPaper":true,"title":"","authors":"","abstract":"","summary":{"about":"","problem":"","methodology":"","findings":""},"headings":[]}\n\nPDF filename metadata hint (not authoritative): title=${JSON.stringify(title)}, authors=${JSON.stringify(authors)}. Verify against the paper text.\n\nUPLOADED PDF TEXT START\n${paperText}\nUPLOADED PDF TEXT END`;

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'Return accurate structured JSON only. Never fabricate paper metadata, methodology, or findings.' },
          { role: 'user', content: prompt }
        ]
      })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = payload?.error?.message || `AI provider request failed (${response.status}).`;
      return res.status(502).json({ error: message });
    }
    const content = payload?.choices?.[0]?.message?.content;
    if (!content) return res.status(502).json({ error: 'The AI provider returned an empty response.' });
    let parsed;
    try { parsed = JSON.parse(content); }
    catch { return res.status(502).json({ error: 'The AI response was not valid JSON. Please try again.' }); }

    const summary = parsed.summary || {};
    const headings = Array.isArray(parsed.headings) ? parsed.headings : [];
    return res.json({
      isResearchPaper: parsed.isResearchPaper !== false,
      title: typeof parsed.title === 'string' && parsed.title.trim() ? parsed.title.trim() : title,
      authors: typeof parsed.authors === 'string' && parsed.authors.trim() ? parsed.authors.trim() : authors,
      abstract: typeof parsed.abstract === 'string' ? parsed.abstract.trim() : '',
      summary: {
        about: String(summary.about || 'The paper topic could not be confidently identified from the uploaded text.'),
        problem: String(summary.problem || 'The research problem could not be confidently identified from the uploaded text.'),
        methodology: String(summary.methodology || 'The methodology was not clearly described in the extracted text.'),
        findings: String(summary.findings || 'The paper findings were not clearly described in the extracted text.')
      },
      headings: headings.filter(h => typeof h === 'string').filter(h => !/references|bibliography|tutorialspoint|guru99|nptel|https?:|www\./i.test(h)).slice(0, 30)
    });
  } catch (error) {
    console.error('Paper analysis error:', error);
    return res.status(500).json({ error: 'The PDF analysis service encountered an unexpected error.' });
  }
});

app.listen(PORT, () => console.log(`ResearchRadar AI server running at http://localhost:${PORT}`));
