import { config } from '../config/env.js';

const SYSTEM_PROMPT = `You are an elite AI Research Assistant specializing in academic literature, computer science, and scientific discovery.

CRITICAL INSTRUCTIONS:
1. Deliver direct, crystal clear, authoritative, and easy-to-understand explanations like ChatGPT.
2. NEVER include artificial prefixes, placeholders, or meta tags such as "###response", "Response:", "[Answer]:", or raw debugging text. Start directly with the answer.
3. Structure your response logically using clean Markdown:
   - Begin with a direct, comprehensive overview.
   - Use concise bullet points for key findings, technical mechanisms, or comparative advantages.
   - Highlight core terms in **bold**.
   - Reference cited papers naturally with hyperlinked markdown titles (e.g., [Title](url)) and author/year citations.
4. Base your technical assertions firmly on the retrieved context whenever provided. If the context does not contain specific information, state what is known from the papers and clearly qualify any broader consensus knowledge without hallucinating.
5. If conversational context or follow-ups are provided, synthesize seamlessly without repeating previous answers verbatim.`;

/**
 * Generate a complete (non-streaming) completion from Groq
 */
export async function generateGroqCompletion(messages, options = {}) {
  const model = options.model || config.groq.model;
  const apiKey = config.groq.apiKey;
  const url = 'https://api.groq.com/openai/v1/chat/completions';

  const payload = {
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages,
    ],
    temperature: options.temperature ?? config.groq.temperature,
    max_tokens: options.maxTokens ?? config.groq.maxTokens,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'AI-Recommendation-RAG/1.0',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      // If primary model failed, try fallback model
      if (model !== config.groq.fallbackModel) {
        console.warn(`[Groq Primary Model ${model} failed]. Retrying with fallback ${config.groq.fallbackModel}...`);
        return generateGroqCompletion(messages, { ...options, model: config.groq.fallbackModel });
      }
      throw new Error(`Groq API Error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    let text = data.choices?.[0]?.message?.content || '';

    // Strip any unexpected prefix if the LLM hallucinated one
    text = cleanOutputText(text);

    return {
      content: text,
      model: data.model,
      usage: data.usage,
    };
  } catch (err) {
    console.error('[Groq Completion Error]', err);
    throw err;
  }
}

/**
 * Stream completion from Groq using Server-Sent Events (SSE)
 */
export async function streamGroqCompletion(messages, onChunk, options = {}) {
  const model = options.model || config.groq.model;
  const apiKey = config.groq.apiKey;
  const url = 'https://api.groq.com/openai/v1/chat/completions';

  const payload = {
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages,
    ],
    temperature: options.temperature ?? config.groq.temperature,
    max_tokens: options.maxTokens ?? config.groq.maxTokens,
    stream: true,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'AI-Recommendation-RAG/1.0',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq Streaming Error (${response.status}): ${errText}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let fullText = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === 'data: [DONE]') continue;
      if (trimmed.startsWith('data: ')) {
        try {
          const json = JSON.parse(trimmed.slice(6));
          const delta = json.choices?.[0]?.delta?.content || '';
          if (delta) {
            fullText += delta;
            onChunk(delta);
          }
        } catch {
          // ignore incomplete SSE chunk
        }
      }
    }
  }

  return cleanOutputText(fullText);
}

/**
 * Removes undesirable prefixes like "###response" or "Response:"
 */
export function cleanOutputText(text) {
  if (!text) return '';
  return text
    .replace(/^#+\s*response\s*:?/i, '')
    .replace(/^response\s*:\s*/i, '')
    .replace(/^\[answer\]\s*:?/i, '')
    .trim();
}

/**
 * Health check for Groq
 */
export async function checkGroqHealth() {
  try {
    const start = Date.now();
    const res = await generateGroqCompletion([
      { role: 'user', content: 'Ping test. Reply with one word: pong.' },
    ]);
    const latency = Date.now() - start;
    return {
      status: 'ok',
      model: res.model,
      reply: res.content.slice(0, 30),
      latencyMs: latency,
    };
  } catch (err) {
    return {
      status: 'error',
      error: err.message,
    };
  }
}

