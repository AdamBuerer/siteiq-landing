/**
 * Floating SiteIQ assistant widget.
 * Optional backend: set VITE_AI_CHAT_URL to a POST endpoint that accepts JSON
 * { message: string } (or { messages: [...] } if your API expects it — adjust sendMessage).
 * Response: JSON with .reply, .text, or .message string; or OpenAI-style .choices[0].message.content
 */

const WELCOME =
  'Hi — I can help you learn about SiteIQ, spatial intelligence, and our operational modules. What would you like to know?';

const FALLBACK_REPLY =
  'Thanks for reaching out. For detailed answers tailored to your facility, use **Talk to us** in the navigation. Meanwhile, explore Energy Intelligence, cleaning operations, and the command center on this page.';

export function initSiteChat() {
  const root = document.getElementById('siteiq-chat');
  const toggle = document.getElementById('siteiq-chat-toggle');
  const panel = document.getElementById('siteiq-chat-panel');
  const closeBtn = document.getElementById('siteiq-chat-close');
  const form = document.getElementById('siteiq-chat-form');
  const input = document.getElementById('siteiq-chat-input');
  const messagesEl = document.getElementById('siteiq-chat-messages');

  if (!root || !toggle || !panel || !form || !input || !messagesEl) return;

  const endpoint = import.meta.env.VITE_AI_CHAT_URL?.trim();
  let history = [];
  let openedOnce = false;

  function escapeHtml(s) {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatReplyHtml(text) {
    const safe = escapeHtml(text);
    return safe.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  }

  function appendRow(role, html) {
    const row = document.createElement('div');
    row.className = `siteiq-chat-msg siteiq-chat-msg--${role}`;
    row.innerHTML =
      role === 'user'
        ? `<div class="siteiq-chat-bubble siteiq-chat-bubble--user">${html}</div>`
        : `<div class="siteiq-chat-bubble siteiq-chat-bubble--bot">${html}</div>`;
    messagesEl.appendChild(row);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function appendTyping() {
    const id = 'siteiq-chat-typing';
    if (document.getElementById(id)) return;
    const row = document.createElement('div');
    row.id = id;
    row.className = 'siteiq-chat-msg siteiq-chat-msg--bot siteiq-chat-msg--typing';
    row.innerHTML =
      '<div class="siteiq-chat-bubble siteiq-chat-bubble--bot siteiq-chat-typing"><span></span><span></span><span></span></div>';
    messagesEl.appendChild(row);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function removeTyping() {
    document.getElementById('siteiq-chat-typing')?.remove();
  }

  function open() {
    panel.removeAttribute('hidden');
    toggle.setAttribute('aria-expanded', 'true');
    root.classList.add('siteiq-chat--open');
    if (!openedOnce) {
      openedOnce = true;
      appendRow('bot', formatReplyHtml(WELCOME));
    }
    window.requestAnimationFrame(() => {
      input.focus();
    });
  }

  function close() {
    panel.setAttribute('hidden', '');
    toggle.setAttribute('aria-expanded', 'false');
    root.classList.remove('siteiq-chat--open');
    toggle.focus();
  }

  function parseAssistantReply(data) {
    if (!data || typeof data !== 'object') return null;
    if (typeof data.reply === 'string') return data.reply;
    if (typeof data.message === 'string') return data.message;
    if (typeof data.text === 'string') return data.text;
    const c = data.choices?.[0]?.message?.content;
    if (typeof c === 'string') return c;
    return null;
  }

  async function sendMessage(text) {
    appendRow('user', escapeHtml(text).replace(/\n/g, '<br/>'));
    history.push({ role: 'user', content: text });

    if (!endpoint) {
      window.setTimeout(() => {
        appendRow('bot', formatReplyHtml(FALLBACK_REPLY));
        history.push({ role: 'assistant', content: FALLBACK_REPLY.replace(/\*\*/g, '') });
      }, 380);
      return;
    }

    appendTyping();
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ message: text, messages: history }),
      });
      removeTyping();
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      const reply = parseAssistantReply(data) || 'Thanks — we received your message.';
      appendRow('bot', formatReplyHtml(reply));
      history.push({ role: 'assistant', content: reply });
    } catch {
      removeTyping();
      appendRow(
        'bot',
        formatReplyHtml(
          'Sorry, the assistant is temporarily unavailable. Use **Talk to us** in the nav and we will follow up.',
        ),
      );
    }
  }

  toggle.addEventListener('click', () => {
    if (panel.hasAttribute('hidden')) open();
    else close();
  });

  closeBtn?.addEventListener('click', close);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && root.classList.contains('siteiq-chat--open')) {
      e.stopPropagation();
      close();
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    input.style.height = 'auto';
    void sendMessage(text);
  });

  function autoResize() {
    input.style.height = 'auto';
    const max = 120;
    input.style.height = `${Math.min(input.scrollHeight, max)}px`;
  }
  input.addEventListener('input', autoResize);

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });
}
