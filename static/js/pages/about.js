// About page — what EchoMind AI is, purpose, features, tech, privacy, version.
import { el } from "../ui.js";

export function renderAbout(view) {
  view.innerHTML = "";
  view.append(
    el("div", { class: "about-wrap" },
      el("div", { class: "about-hero glass" },
        el("h2", { text: "EchoMind AI" }),
        el("p", { text: "A premium AI-powered personal growth companion. EchoMind listens first, understands context, remembers your journey, adapts over time, and guides you through interactive conversations instead of providing generic one-time answers." })
      ),
      el("div", { class: "about-section glass" },
        el("h3", { html: '<span>\uD83C\uDFAF</span> Purpose' }),
        el("p", { text: "Turn scattered thoughts into clarity. EchoMind listens to what's on your mind, reflects it back with empathy and structure, and helps you move from overthinking to a single, doable next step — all while remembering your journey and growing with you." })
      ),
      el("div", { class: "about-section glass" },
        el("h3", { html: '<span>\u2728</span> Features' }),
        el("div", { class: "about-features" },
          feature("Emotionally Intelligent Companion", "Never gives advice first. Asks how you want to be supported: vent, solve, or both."),
          feature("Interactive Conversations", "Quick reply chips, guided flows, emoji selectors, and mood sliders."),
          feature("Long-Term AI Memory", "Remembers goals, habits, moods, and previous conversations to personalize future interactions."),
          feature("6 AI Personalities", "Supportive Friend, Therapist, Logical Mentor, Career Coach, Productivity Coach, and Motivator."),
          feature("Smart Goal Planner", "Builds realistic roadmaps with milestones, daily tasks, and progress tracking."),
          feature("AI Journal", "Auto-extracts emotions, key events, lessons learned, and growth notes from conversations."),
          feature("Life Dashboard", "Emotional wellness, productivity, confidence, consistency, learning, achievements, and streaks."),
          feature("Proactive AI Insights", "Weekly insights, burnout detection, pattern recognition, and personalized check-ins."),
          feature("Premium Dashboard", "Personalized greeting, AI Daily Insight, mood score, focus statistics, and quick actions."),
          feature("Structured Analysis", "Mood, emotions, thought patterns, root causes, mind map and action plan."),
          feature("Voice Input", "Speak naturally with real-time multilingual speech-to-text."),
          feature("Focus Mode", "Quick guidance: priority, one action, time, why, motivation."),
          feature("Reflection History", "Saved with search, open and delete."),
          feature("Reflection Snapshot", "A beautiful summary card — save, copy or download as PNG."),
        )
      ),
      el("div", { class: "about-section glass" },
        el("h3", { html: '<span>\uD83D\uDD27</span> Technologies Used' }),
        el("p", { text: "EchoMind AI is built with a modular, production-ready architecture:" }),
        el("div", { class: "tech-tags" },
          ...["Vite", "Node.js", "HTML5", "CSS3", "Vanilla JavaScript", "Supabase", "Groq API", "Web Speech API", "SVG Charts", "Glassmorphism UI"].map((t) => el("span", { class: "tech-tag", text: t }))
        )
      ),
      el("div", { class: "about-section glass" },
        el("h3", { html: '<span>\uD83D\uDD12</span> Privacy Notice' }),
        el("p", { text: "Your reflections, goals, journal entries, and conversations are stored in a secure Supabase database. Your Groq API key (if you provide one) is stored locally in your browser and sent directly to Groq with each request. Thought text is sent to the Groq API for analysis and is not persisted on Groq's servers." })
      ),
      el("div", { class: "about-section glass" },
        el("h3", { html: '<span>\u2139\uFE0F</span> Version' }),
        el("p", { text: "EchoMind AI v2.0.0 — Premium AI Companion Edition" })
      )
    )
  );
}

function feature(title, desc) {
  return el("div", { class: "about-feature" },
    el("strong", { text: title }),
    el("span", { text: desc })
  );
}
