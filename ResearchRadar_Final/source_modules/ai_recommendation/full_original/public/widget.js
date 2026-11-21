/**
 * ChatGPT-Style Embeddable RAG Chatbot Widget
 * Integrates into ANY existing webpage with zero external dependencies.
 */
(function () {
  if (window.__RAG_CHATBOT_INITIALIZED__) return;
  window.__RAG_CHATBOT_INITIALIZED__ = true;

  // Determine host URL for API
  const scriptTag = document.currentScript || document.querySelector('script[src*="widget.js"]');
  const hostUrl = scriptTag?.getAttribute('data-api-url') || (scriptTag?.src ? new URL(scriptTag.src).origin : window.location.origin);

  // Generate or retrieve persistent sessionId
  let sessionId = localStorage.getItem('rag_chatbot_session_id');
  if (!sessionId) {
    sessionId = 'session_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    localStorage.setItem('rag_chatbot_session_id', sessionId);
  }

  // Load stylesheet
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `${hostUrl}/widget.css`;
  document.head.appendChild(link);

  // Icons
  const ICONS = {
    chat: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`,
    close: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
    sparkle: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M4.93 19.07l14.14-14.14"/></svg>`,
    send: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>`,
    clear: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>`,
    copy: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`,
    check: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
  };

  // Build DOM Structure
  const rootDiv = document.createElement('div');
  rootDiv.className = 'rag-chatbot-root';
  rootDiv.innerHTML = `
    <!-- Launcher Button -->
    <button class="rag-launcher" id="rag-launcher" aria-label="Open AI Research Assistant">
      <div id="rag-launcher-icon">${ICONS.chat}</div>
      <span class="rag-launcher-badge"></span>
    </button>

    <!-- Chat Modal Window -->
    <div class="rag-container" id="rag-container">
      <!-- Header -->
      <div class="rag-header">
        <div class="rag-header-left">
          <div class="rag-avatar-badge">${ICONS.sparkle}</div>
          <div>
            <div class="rag-header-title">ScholarPulse AI</div>
            <div class="rag-header-status">
              <span class="rag-status-dot"></span>
              <span>Online · Research Assistant</span>
            </div>
          </div>
        </div>
        <div class="rag-header-actions">
          <button class="rag-btn-icon" id="rag-btn-clear" title="Reset Conversation Memory">${ICONS.clear}</button>
          <button class="rag-btn-icon" id="rag-btn-close" title="Close">${ICONS.close}</button>
        </div>
      </div>

      <!-- Dynamic FAQ Bar -->
      <div class="rag-faq-bar" id="rag-faq-bar">
        <span class="rag-faq-label">Trending:</span>
        <div class="rag-faq-pill" data-query="What are the recent advances in large multimodal models?">Multimodal AI</div>
        <div class="rag-faq-pill" data-query="How does full reference image quality assessment work?">Image Quality Assessment</div>
        <div class="rag-faq-pill" data-query="What methods optimize structure and phonons in LiNbO3 crystals?">LiNbO3 Phonons</div>
      </div>

      <!-- Messages Area -->
      <div class="rag-messages" id="rag-messages">
        <!-- Welcome Hero State -->
        <div class="rag-welcome" id="rag-welcome">
          <div class="rag-welcome-icon">${ICONS.sparkle}</div>
          <div class="rag-welcome-title">Research Assistant</div>
          <div class="rag-welcome-desc">
            Explore scientific discoveries, methodologies, and cross-disciplinary findings with grounded academic citations.
          </div>
          <div class="rag-prompts-grid">
            <div class="rag-prompt-card" data-prompt="What are the recent advances in large multimodal models?">
              ⚡ <strong>Multimodal AI</strong>: Recent advances and cross-modal representations
            </div>
            <div class="rag-prompt-card" data-prompt="Explain full reference image quality assessment algorithms and statistical benchmarks.">
              🔬 <strong>Image Quality</strong>: Full reference algorithms and statistical evaluations
            </div>
            <div class="rag-prompt-card" data-prompt="How does potentiometric stripping analysis work for heavy metal trace detection?">
              🧪 <strong>Potentiometric Stripping</strong>: Trace analysis of cadmium, lead, and zinc
            </div>
          </div>
        </div>
      </div>

      <!-- Input Area -->
      <div class="rag-input-box">
        <div class="rag-input-wrapper">
          <textarea
            class="rag-textarea"
            id="rag-textarea"
            placeholder="Ask anything about research papers, methods, authors..."
            rows="1"
          ></textarea>
          <button class="rag-send-btn" id="rag-send-btn" disabled aria-label="Send">
            ${ICONS.send}
          </button>
        </div>
        <div class="rag-footer-disclaimer">
          ScholarPulse may produce inaccuracies. Verify citations independently.
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(rootDiv);

  // References
  const launcher = document.getElementById('rag-launcher');
  const launcherIcon = document.getElementById('rag-launcher-icon');
  const container = document.getElementById('rag-container');
  const btnClose = document.getElementById('rag-btn-close');
  const btnClear = document.getElementById('rag-btn-clear');
  const messagesBox = document.getElementById('rag-messages');
  const welcomeBox = document.getElementById('rag-welcome');
  const textarea = document.getElementById('rag-textarea');
  const sendBtn = document.getElementById('rag-send-btn');
  const faqBar = document.getElementById('rag-faq-bar');

  let isOpen = false;
  let isGenerating = false;

  // Toggle Chat Drawer
  function toggleChat(open) {
    isOpen = open !== undefined ? open : !isOpen;
    if (isOpen) {
      container.classList.add('rag-open');
      launcherIcon.innerHTML = ICONS.close;
      textarea.focus();
    } else {
      container.classList.remove('rag-open');
      launcherIcon.innerHTML = ICONS.chat;
    }
  }

  launcher.addEventListener('click', () => toggleChat());
  btnClose.addEventListener('click', () => toggleChat(false));

  // Reset Session
  btnClear.addEventListener('click', async () => {
    if (confirm('Reset conversation memory?')) {
      await fetch(`${hostUrl}/api/session/clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      }).catch(() => {});

      messagesBox.innerHTML = '';
      messagesBox.appendChild(welcomeBox);
      welcomeBox.style.display = 'block';
    }
  });

  // Auto-resize textarea (strictly no scrollbar or up/down arrows)
  textarea.addEventListener('input', () => {
    textarea.style.height = 'auto';
    textarea.style.overflowY = 'hidden';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    const hasText = textarea.value.trim().length > 0;
    sendBtn.disabled = !hasText || isGenerating;
    sendBtn.classList.toggle('rag-active', hasText && !isGenerating);
  });

  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!sendBtn.disabled) {
        handleUserSend(textarea.value);
      }
    }
  });

  sendBtn.addEventListener('click', () => {
    if (!sendBtn.disabled) {
      handleUserSend(textarea.value);
    }
  });

  // Quick Prompt cards and FAQ pills delegation
  rootDiv.addEventListener('click', (e) => {
    const promptCard = e.target.closest('.rag-prompt-card');
    if (promptCard) {
      const prompt = promptCard.getAttribute('data-prompt');
      if (prompt) handleUserSend(prompt);
      return;
    }
    const faqPill = e.target.closest('.rag-faq-pill');
    if (faqPill) {
      const query = faqPill.getAttribute('data-query');
      if (query) handleUserSend(query);
    }
  });

  // Fetch dynamic FAQs from server
  async function loadDynamicFaqs() {
    try {
      const res = await fetch(`${hostUrl}/api/faq/dynamic?limit=5`);
      if (res.ok) {
        const data = await res.json();
        if (data.faqs && data.faqs.length > 0) {
          faqBar.innerHTML = `<span class="rag-faq-label">Trending:</span>`;
          data.faqs.forEach((faq) => {
            const pill = document.createElement('div');
            pill.className = 'rag-faq-pill';
            pill.setAttribute('data-query', faq.query);
            // Short label
            const label = faq.query.length > 28 ? faq.query.slice(0, 26) + '...' : faq.query;
            pill.textContent = label;
            faqBar.appendChild(pill);
          });
        }
      }
    } catch {
      // retain default pills
    }
  }
  loadDynamicFaqs();

  // Simple Markdown Parser
  function renderMarkdown(md) {
    if (!md) return '';
    let html = md
      // Escape HTML
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // Headers
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // Bold
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      // Inline code
      .replace(/`([^`]+)`/gim, '<code>$1</code>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      // Unordered lists
      .replace(/^\s*[-*]\s+(.*)$/gim, '<li>$1</li>')
      // Newlines to breaks
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br/>');

    // Wrap list items in <ul>
    html = html.replace(/(<li>.*<\/li>)/gim, '<ul>$1</ul>');
    return `<p>${html}</p>`;
  }

  // Scroll to bottom smoothly
  function scrollToBottom() {
    messagesBox.scrollTop = messagesBox.scrollHeight;
  }

  // Handle User Message Submission
  async function handleUserSend(rawQuery) {
    const query = rawQuery.trim();
    if (!query || isGenerating) return;

    if (welcomeBox) welcomeBox.style.display = 'none';

    // Append User Message Row
    const userRow = document.createElement('div');
    userRow.className = 'rag-msg-row rag-user';
    userRow.innerHTML = `<div class="rag-msg-bubble">${query.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</div>`;
    messagesBox.appendChild(userRow);

    // Clear input
    textarea.value = '';
    textarea.style.height = 'auto';
    textarea.style.overflowY = 'hidden';
    sendBtn.disabled = true;
    sendBtn.classList.remove('rag-active');
    isGenerating = true;

    // Create Assistant Row with Typing Dots
    const assistantRow = document.createElement('div');
    assistantRow.className = 'rag-msg-row rag-assistant';
    assistantRow.innerHTML = `
      <div class="rag-typing" id="rag-current-typing">
        <span class="rag-dot"></span>
        <span class="rag-dot"></span>
        <span class="rag-dot"></span>
      </div>
      <div class="rag-msg-bubble" style="display:none;" id="rag-bubble-target"></div>
      <div class="rag-sources-box" style="display:none;" id="rag-sources-target"></div>
      <div class="rag-msg-meta" style="display:none;" id="rag-meta-target"></div>
    `;
    messagesBox.appendChild(assistantRow);

    // Scroll to the start of the interaction (user prompt and top of assistant reply)
    assistantRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    const typingIndicator = assistantRow.querySelector('#rag-current-typing');
    const bubbleTarget = assistantRow.querySelector('#rag-bubble-target');
    const sourcesTarget = assistantRow.querySelector('#rag-sources-target');
    const metaTarget = assistantRow.querySelector('#rag-meta-target');

    let fullAnswer = '';
    let sources = [];
    const reqStartTime = Date.now();

    try {
      // Connect to SSE Endpoint
      const response = await fetch(`${hostUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          sessionId,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let isFirstToken = true;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          if (line.startsWith('event: sources')) {
            const nextLine = lines[i + 1]?.trim() || '';
            if (nextLine.startsWith('data: ')) {
              try {
                sources = JSON.parse(nextLine.slice(6));
              } catch {}
            }
          } else if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            if (dataStr === '[DONE]') continue;

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.delta) {
                if (isFirstToken) {
                  typingIndicator.style.display = 'none';
                  bubbleTarget.style.display = 'block';
                  isFirstToken = false;
                  // Keep viewport at the start of response so user reads comfortably
                  assistantRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
                fullAnswer += parsed.delta;
                bubbleTarget.innerHTML = renderMarkdown(fullAnswer) + '<span class="rag-cursor"></span>';
                // Note: Intentionally NOT auto-scrolling to bottom so the user stays at the start of the response
              }
            } catch {}
          }
        }
      }

      // Finish streaming
      bubbleTarget.innerHTML = renderMarkdown(fullAnswer);

      // Render Sources if any
      if (sources && sources.length > 0) {
        sourcesTarget.style.display = 'block';
        sourcesTarget.innerHTML = `
          <button class="rag-sources-toggle" id="rag-toggle-${Date.now()}">
            <span>📚 Citing ${sources.length} research papers</span>
            <span>▾</span>
          </button>
          <div class="rag-sources-list">
            ${sources
              .map((s, idx) => {
                const title = s.title || 'Academic Paper';
                const link = s.url || (s.doi ? `https://doi.org/${s.doi}` : '#');
                const score = (s.score * 100).toFixed(0);
                const year = s.year ? `(${s.year})` : '';
                return `
                  <div class="rag-source-item">
                    <a href="${link}" target="_blank" rel="noopener noreferrer" class="rag-source-title">
                      ${idx + 1}. ${title}
                    </a>
                    <div class="rag-source-meta">
                      <span class="rag-badge-score">${score}% Match</span>
                      <span>${s.source || 'Journal'} ${year}</span>
                    </div>
                  </div>
                `;
              })
              .join('')}
          </div>
        `;
      }

      // Render Action Meta Footer
      metaTarget.style.display = 'flex';
      metaTarget.innerHTML = `
        <button class="rag-copy-btn" title="Copy response">
          ${ICONS.copy} <span>Copy response</span>
        </button>
      `;

      // Copy Action
      const copyBtn = metaTarget.querySelector('.rag-copy-btn');
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(fullAnswer);
        copyBtn.innerHTML = `${ICONS.check} <span>Copied!</span>`;
        setTimeout(() => {
          copyBtn.innerHTML = `${ICONS.copy} <span>Copy</span>`;
        }, 2000);
      });

      scrollToBottom();
    } catch (err) {
      typingIndicator.style.display = 'none';
      bubbleTarget.style.display = 'block';
      bubbleTarget.innerHTML = `<span style="color:#ef4444;">Error: ${err.message || 'Failed to generate response'}</span>`;
    } finally {
      isGenerating = false;
      sendBtn.disabled = textarea.value.trim().length === 0;
      sendBtn.classList.toggle('rag-active', !sendBtn.disabled);
    }
  }
})();

