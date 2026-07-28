// Focus page — quick, sharp guidance only.
import { api } from "../api.js";
import { store } from "../store.js";
import { VoiceInput } from "../voice.js";
import { el, toast } from "../ui.js";

let voice = null;

export function renderFocus(view) {
  view.innerHTML = "";
  view.append(
    el("div", { class: "focus-card glass" },
      el("div", { class: "welcome", style: "margin-bottom:18px" },
        el("h2", { text: "Focus Mode" }),
        el("p", { text: "Only want quick guidance? Drop what's on your mind and get the essentials — no deep dive." })
      ),
      el("div", { class: "input-wrap" },
        el("textarea", {
          class: "thought-input",
          id: "focusInput",
          placeholder: "What do you need to focus on right now? e.g. 'I have three deadlines this week and I don't know where to start.'",
          style: "min-height:110px",
        }),
        el("button", { class: "mic-btn", id: "focusMic", title: "Voice input", html: micIcon() })
      ),
      el("div", { style: "margin-top:14px;display:flex;justify-content:flex-end" },
        el("button", { class: "analyze-btn", id: "focusBtn", onclick: runFocus },
          el("span", { html: boltIcon() }), el("span", { text: "Get Focus" })
        )
      ),
      el("div", { id: "focusOutput" })
    )
  );

  setupVoice();
}

function micIcon() {
  return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>';
}
function boltIcon() {
  return '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h7l-1 8 10-12h-7z"/></svg>';
}

function setupVoice() {
  voice = new VoiceInput();
  const micBtn = document.getElementById("focusMic");
  const input = document.getElementById("focusInput");
  voice.onTranscript = (text) => { input.value = text; };
  voice.onStateChange = (l) => {
    micBtn.classList.toggle("listening", l);
    if (l) toast("Listening...", "");
    else toast("Voice captured.", "success");
  };
  voice.onError = (m) => toast(m, "error");
  micBtn.addEventListener("click", () => {
    if (!voice.supported) { toast("Voice input not supported.", "error"); return; }
    voice.toggle(navigator.language || "");
  });
}

async function runFocus() {
  const input = document.getElementById("focusInput");
  const text = input.value.trim();
  if (!text) { toast("Write what you want to focus on.", "error"); return; }
  if (voice && voice.listening) voice.stop();
  const out = document.getElementById("focusOutput");
  const btn = document.getElementById("focusBtn");
  btn.disabled = true;
  out.innerHTML = '<div class="loading glass" style="padding:22px"><div class="loading-bar"><div class="loading-bar-fill" style="width:40%"></div></div><p style="color:var(--text-3);font-size:14px">Finding your focus...</p></div>';
  try {
    const f = await api.focus(text);
    out.innerHTML = "";
    out.append(renderFocusResult(f));
  } catch (err) {
    out.innerHTML = `<div class="glass" style="padding:18px;border-left:3px solid var(--error);color:var(--text-2)">${err.message}</div>`;
  } finally {
    btn.disabled = false;
  }
}

function renderFocusResult(f) {
  return el("div", { class: "focus-result" },
    el("div", { class: "focus-item priority" },
      el("div", { class: "fi-label", html: '<span>\uD83C\uDFAF</span> Main Priority' }),
      el("div", { class: "fi-text", text: f.main_priority || "—" })
    ),
    el("div", { class: "focus-item" },
      el("div", { class: "fi-label", html: '<span>\u26A1</span> One Small Action' }),
      el("div", { class: "fi-text", text: f.small_action || "—" })
    ),
    el("div", { class: "focus-item" },
      el("div", { class: "fi-label", html: '<span>\u23F1\uFE0F</span> Estimated Time' }),
      el("div", { class: "fi-text", text: f.estimated_time || "—" })
    ),
    el("div", { class: "focus-item" },
      el("div", { class: "fi-label", html: '<span>\u2728</span> Why It Matters' }),
      el("div", { class: "fi-text", text: f.why_it_matters || "—" })
    ),
    el("div", { class: "focus-item motivate" },
      el("div", { class: "fi-label", html: '<span>\uD83D\uDD25</span> Motivation' }),
      el("div", { class: "fi-text", text: f.motivational_line || "—" })
    ),
  );
}
