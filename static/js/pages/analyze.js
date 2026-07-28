// Analyze page — natural, ChatGPT-style emotionally intelligent companion.
import { api } from "../api.js";
import { store } from "../store.js";
import { VoiceInput } from "../voice.js";
import { renderMarkdown } from "../markdown.js";
import { PERSONAS, personaById } from "../personas.js";
import { el, toast } from "../ui.js";
import { insertRow } from "../supabase.js";
import { buildMemoryContext } from "./dashboard.js";

let voice = null;
let chatState = { turns: [], mode: "both", phase: "idle", sending: false };

const MODES = [
  { id: "vent",  label: "Vent",  emoji: "\uD83D\uDC99", hint: "I'll listen and hold space. No advice unless you ask." },
  { id: "solve", label: "Solve",  emoji: "\uD83E\uDDE0", hint: "I'll ask questions first, then build a plan with you." },
  { id: "both",  label: "Both",   emoji: "\uD83E\uDD1D", hint: "I'll listen first, then ask before sharing advice." },
];

export function renderAnalyze(view) {
  const personaId = store.getPersona();
  chatState = { turns: [], mode: "both", phase: "idle", sending: false };
  view.innerHTML = "";

  view.append(
    el("div", { class: "companion-welcome" },
      el("h2", { text: "Hi, I'm EchoMind \u2764\uFE0F" }),
      el("p", { text: "I'm your emotionally intelligent companion. Share what's on your mind and we'll talk through it together \u2014 like a real conversation, not an analysis." })
    ),
    el("div", { class: "companion-toolbar glass", style: "padding:12px 16px;margin-bottom:14px;display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between" },
      el("div", { class: "companion-modes", id: "modeRow", style: "display:flex;gap:8px;flex-wrap:wrap" },
        ...MODES.map((m) => el("button", {
          class: `mode-btn${m.id === chatState.mode ? " active" : ""}`,
          dataset: { mode: m.id },
          title: m.hint,
          onclick: selectMode,
        },
          el("span", { text: m.emoji }),
          el("span", { text: m.label })
        ))
      ),
      el("div", { style: "display:flex;gap:8px;align-items:center" },
        el("div", { class: "personas", id: "personaRow", style: "display:flex;gap:6px" },
          ...PERSONAS.map((p) => el("button", {
            class: `persona-btn${p.id === personaId ? " active" : ""}`,
            dataset: { persona: p.id },
            onclick: selectPersona,
          },
            el("span", { class: "persona-emoji", text: p.emoji }),
            el("span", { text: p.name })
          ))
        ),
        el("button", { class: "clear-chat-btn", id: "clearChatBtn", title: "Clear conversation", onclick: confirmClearChat },
          el("span", { html: trashIcon() }),
          el("span", { text: "Clear" })
        )
      )
    ),
    el("div", { id: "companionArea" },
      el("div", { class: "companion-chat" },
        el("div", { class: "companion-messages", id: "companionMessages" }),
        el("div", { class: "companion-quick-replies", id: "quickReplies" }),
        renderCompanionInput()
      )
    )
  );

  setupVoice();
  const input = document.getElementById("thoughtInput");
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendUserReply(); }
  });
  input.focus();
}

function micIcon() {
  return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>';
}
function sparkleIcon() {
  return '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.6 5.2L19 9l-5.4 1.8L12 16l-1.6-5.2L5 9l5.4-1.8z"/></svg>';
}
function trashIcon() {
  return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>';
}
function sendIcon() {
  return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';
}

function selectPersona(e) {
  const btn = e.currentTarget;
  document.querySelectorAll(".persona-btn").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  store.setPersona(btn.dataset.persona);
}

function selectMode(e) {
  const btn = e.currentTarget;
  document.querySelectorAll(".mode-btn").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  chatState.mode = btn.dataset.mode;
  toast(`Mode: ${MODES.find((m) => m.id === chatState.mode).label}`, "");
}

function setupVoice() {
  voice = new VoiceInput();
  const micBtn = document.getElementById("micBtn");
  const input = document.getElementById("thoughtInput");
  voice.onTranscript = (text) => { input.value = text; };
  voice.onStateChange = (l) => {
    micBtn.classList.toggle("listening", l);
    if (l) toast("Listening...", "");
    else toast("Voice captured.", "success");
  };
  voice.onError = (m) => toast(m, "error");
  micBtn.addEventListener("click", () => {
    if (!voice.supported) { toast("Voice not supported.", "error"); return; }
    voice.toggle(navigator.language || "");
  });
}

function renderCompanionInput() {
  const row = el("div", { class: "companion-input-row" },
    el("button", { class: "mic-btn", id: "micBtn", title: "Voice input", html: micIcon() }),
    el("textarea", {
      class: "companion-input", id: "thoughtInput",
      placeholder: "Type what's on your mind...",
      style: "min-height:48px;flex:1",
    }),
    el("button", { class: "analyze-btn", id: "companionSend", onclick: sendUserReply },
      el("span", { html: sendIcon() }),
      el("span", { text: "Send" })
    )
  );
  return row;
}

async function sendUserReply() {
  if (chatState.sending) return;
  const input = document.getElementById("thoughtInput");
  const text = input.value.trim();
  if (!text) return;
  if (voice && voice.listening) voice.stop();
  input.value = "";
  appendMessage("user", text);
  await sendCompanionMessage(text);
}

async function sendCompanionMessage(text) {
  chatState.sending = true;
  const messages = document.getElementById("companionMessages");
  const quickReplies = document.getElementById("quickReplies");
  quickReplies.innerHTML = "";

  const personaId = store.getPersona();
  const persona = personaById(personaId);
  const thinking = el("div", { class: "companion-msg ai" },
    el("div", { class: "cm-avatar", text: persona.emoji }),
    el("div", { class: "cm-bubble thinking-bubble" },
      el("span", { class: "dot" }), el("span", { class: "dot" }), el("span", { class: "dot" })
    )
  );
  messages.append(thinking);
  messages.scrollTop = messages.scrollHeight;

  const bubble = thinking.querySelector(".cm-bubble");
  let accumulated = "";
  let streaming = false;

  // The first chunk of the reply swaps the "thinking" dots for the live,
  // typing-effect text bubble — everything after streams in incrementally.
  function beginStreamingUI() {
    if (streaming) return;
    streaming = true;
    bubble.classList.remove("thinking-bubble");
    bubble.classList.add("md", "typing");
    bubble.innerHTML = "";
  }

  try {
    const memoryContext = await buildMemoryContext();
    const history = chatState.turns.slice(-10);

    const result = await new Promise((resolve, reject) => {
      api.companionStream(text, personaId, chatState.mode, history, memoryContext, {
        onDelta: (chunk) => {
          if (!chunk) return;
          beginStreamingUI();
          accumulated += chunk;
          bubble.innerHTML = renderMarkdown(accumulated);
          messages.scrollTop = messages.scrollHeight;
        },
        onDone: resolve,
        onError: reject,
      });
    });

    beginStreamingUI();
    bubble.classList.remove("typing");
    const replyText = (result && result.reply) || accumulated || "I'm here for you.";
    bubble.innerHTML = renderMarkdown(replyText);
    messages.scrollTop = messages.scrollHeight;

    chatState.turns.push({ role: "user", content: text });
    chatState.turns.push({ role: "assistant", content: replyText });

    if (result?.conversation_phase) chatState.phase = result.conversation_phase;

    if (result?.suggested_quick_replies && result.suggested_quick_replies.length) {
      quickReplies.append(...result.suggested_quick_replies.map((q) =>
        el("button", { class: "quick-reply-chip", text: q, onclick: () => {
          document.getElementById("thoughtInput").value = q;
          sendUserReply();
        } })
      ));
    }

    if (result?.mood_score && result?.emotion_detected) {
      insertRow("mood_logs", {
        score: result.mood_score,
        emotion: result.emotion_detected,
        source: "conversation",
      }).catch(() => {});
    }

    if (result?.extracted_memory) {
      const em = result.extracted_memory;
      insertRow("conversations", {
        persona: personaId,
        mode: chatState.mode,
        turns: chatState.turns.slice(-6),
        summary: replyText.slice(0, 200),
        extracted_emotions: em.emotions || [],
        key_topics: em.key_topics || [],
      }).catch(() => {});
    }
  } catch (err) {
    bubble.classList.remove("thinking-bubble", "typing");
    bubble.classList.add("md");
    bubble.innerHTML = renderMarkdown(`Sorry, I ran into an issue: ${err.message}`);
    messages.scrollTop = messages.scrollHeight;
  } finally {
    chatState.sending = false;
  }
}

function appendMessage(role, text, avatar = "\u2764\uFE0F", metadata = null) {
  const messages = document.getElementById("companionMessages");
  if (!messages) return;
  const msg = el("div", { class: `companion-msg ${role}` },
    el("div", { class: "cm-avatar", text: avatar }),
    el("div", { class: "cm-bubble" + (role === "ai" ? " md" : ""), html: role === "ai" ? renderMarkdown(text) : null, text: role === "user" ? text : null })
  );
  messages.append(msg);
  messages.scrollTop = messages.scrollHeight;
}

function confirmClearChat() {
  if (chatState.turns.length === 0) { toast("Conversation is already empty.", ""); return; }
  const area = document.getElementById("companionArea");
  const modal = el("div", { class: "clear-modal-overlay" },
    el("div", { class: "clear-modal glass" },
      el("h3", { text: "Clear conversation?" }),
      el("p", { text: "This will permanently delete all messages in this chat. This cannot be undone." }),
      el("div", { class: "clear-modal-actions" },
        el("button", { class: "btn-ghost", text: "Cancel", onclick: () => modal.remove() }),
        el("button", { class: "btn-danger", text: "Clear all", onclick: () => { doClearChat(); modal.remove(); } })
      )
    )
  );
  area.append(modal);
}

function doClearChat() {
  chatState.turns = [];
  chatState.phase = "idle";
  const messages = document.getElementById("companionMessages");
  const quickReplies = document.getElementById("quickReplies");
  if (messages) messages.innerHTML = "";
  if (quickReplies) quickReplies.innerHTML = "";
  toast("Conversation cleared.", "success");
  document.getElementById("thoughtInput")?.focus();
}
