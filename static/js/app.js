// EchoMind AI — app entry, router, and shell wiring.
import { store } from "./store.js";
import { api } from "./api.js";
import { el, toast, openModal, closeModal } from "./ui.js";
import { personaById } from "./personas.js";
import { renderDashboard } from "./pages/dashboard.js";
import { renderAnalyze } from "./pages/analyze.js";
import { renderFocus } from "./pages/focus.js";
import { renderHistory } from "./pages/history.js";
import { renderProgress } from "./pages/progress.js";
import { renderGoals } from "./pages/goals.js";
import { renderJournal } from "./pages/journal.js";
import { renderAbout } from "./pages/about.js";

const PAGES = {
  dashboard: { title: "Dashboard", subtitle: "Your personalized growth companion.", render: renderDashboard, showPersona: false },
  analyze: { title: "Analyze", subtitle: "Reflect on your thoughts and let AI illuminate them.", render: renderAnalyze, showPersona: true },
  focus: { title: "Focus", subtitle: "Quick, sharp guidance — no deep dive.", render: renderFocus, showPersona: false },
  goals: { title: "Goals", subtitle: "Build smart roadmaps and track your progress.", render: renderGoals, showPersona: false },
  journal: { title: "Journal", subtitle: "AI-extracted insights from your conversations.", render: renderJournal, showPersona: false },
  history: { title: "History", subtitle: "Your saved reflections, searchable.", render: renderHistory, showPersona: false },
  progress: { title: "Life Dashboard", subtitle: "Your wellness, productivity, and growth at a glance.", render: renderProgress, showPersona: false },
  about: { title: "About", subtitle: "What EchoMind AI is and how it works.", render: renderAbout, showPersona: false },
};

function route(name) {
  const page = PAGES[name] || PAGES.analyze;
  document.querySelectorAll(".nav-item").forEach((b) => {
    b.classList.toggle("active", b.dataset.route === name);
  });
  document.getElementById("pageTitle").textContent = page.title;
  document.getElementById("pageSubtitle").textContent = page.subtitle;
  const chip = document.getElementById("personaChip");
  chip.hidden = !page.showPersona;
  if (page.showPersona) {
    const p = personaById(store.getPersona());
    chip.textContent = `${p.emoji} ${p.name}`;
  }
  const view = document.getElementById("view");
  view.innerHTML = "";
  const result = page.render(view);
  if (result && typeof result.then === "function") {
    // async render — nothing extra needed, it fills the view itself
  }
  closeSidebar();
  document.querySelector(".main").scrollTo({ top: 0, behavior: "smooth" });
}

function setupNav() {
  document.querySelectorAll(".nav-item").forEach((b) => {
    b.addEventListener("click", () => route(b.dataset.route));
  });
}

function setupSidebar() {
  const toggle = document.getElementById("sidebarToggle");
  const sidebar = document.getElementById("sidebar");
  const scrim = document.getElementById("scrim");
  toggle.addEventListener("click", () => {
    sidebar.classList.toggle("open");
    scrim.classList.toggle("show");
  });
  scrim.addEventListener("click", closeSidebar);
}
function closeSidebar() {
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("scrim").classList.remove("show");
}

function setupKeyModal() {
  const pill = document.getElementById("keyPill");
  const cta = document.getElementById("keyPillCta");
  const dot = document.getElementById("keyDot");
  const label = document.getElementById("keyLabel");

  function refreshKey() {
    const has = !!store.getGroqKey();
    dot.classList.toggle("ok", has);
    label.textContent = has ? "API key set" : "Add API key";
    // Show the prominent CTA only when no key is set and server has none.
    const serverActive = dot.classList.contains("ok") && !has;
    cta.hidden = has || serverActive;
  }
  refreshKey();

  function openKeyModal() {
    document.getElementById("keyInput").value = store.getGroqKey();
    openModal("keyModal");
    setTimeout(() => document.getElementById("keyInput").focus(), 50);
  }
  pill.addEventListener("click", openKeyModal);
  cta.addEventListener("click", openKeyModal);

  document.getElementById("keySave").addEventListener("click", () => {
    const val = document.getElementById("keyInput").value.trim();
    if (val) {
      store.setGroqKey(val);
      toast("API key saved locally.", "success");
    } else {
      store.clearGroqKey();
      toast("API key cleared.", "");
    }
    refreshKey();
    closeModal("keyModal");
  });

  document.querySelectorAll("#keyModal [data-close]").forEach((b) => {
    b.addEventListener("click", () => closeModal("keyModal"));
  });
}

async function checkHealth() {
  const h = await api.health();
  const dot = document.getElementById("keyDot");
  const label = document.getElementById("keyLabel");
  const cta = document.getElementById("keyPillCta");
  const hasUserKey = !!store.getGroqKey();
  if (h && h.groq_configured && !hasUserKey) {
    dot.classList.add("ok");
    label.textContent = "Server key active";
    cta.hidden = true;
  } else if (!hasUserKey) {
    // No server key and no user key — prompt on first visit.
    cta.hidden = false;
    if (!store.getGroqKey()) {
      setTimeout(() => {
        if (!store.getGroqKey()) openModal("keyModal");
      }, 900);
    }
  }
}

function init() {
  setupNav();
  setupSidebar();
  setupKeyModal();
  route("dashboard");
  checkHealth();
}

document.addEventListener("DOMContentLoaded", init);
