// Dashboard page — premium home with greeting, AI Daily Insight, mood, streaks, weekly progress, recent activity, quick actions.
import { api } from "../api.js";
import { store } from "../store.js";
import { supabase, fetchAll, getProfile } from "../supabase.js";
import { el, moodClass, moodLabel, formatDate } from "../ui.js";

export async function renderDashboard(view) {
  view.innerHTML = "";

  const profile = await getProfile().catch(() => null);
  const reflections = await fetchAll("reflections", { order: "date", limit: 50 }).catch(() => []);
  const goals = await fetchAll("goals", { order: "created_at", limit: 20 }).catch(() => []);
  const journal = await fetchAll("journal_entries", { order: "date", limit: 10 }).catch(() => []);
  const moodLogs = await fetchAll("mood_logs", { order: "logged_at", limit: 30 }).catch(() => []);
  const tasks = await fetchAll("daily_tasks", { order: "scheduled_date", limit: 20 }).catch(() => []);

  const name = profile?.name || "";
  const greetingFor = (h) => h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  const displayNameFor = (h) => {
    const g = greetingFor(h);
    return name ? `${g}, ${name}` : g;
  };

  // Stats
  const moodScores = [...reflections.map((r) => r.mood_score), ...moodLogs.map((m) => m.score)].filter((n) => n > 0);
  const avgMood = moodScores.length ? (moodScores.reduce((a, b) => a + b, 0) / moodScores.length) : 0;
  const activeGoals = goals.filter((g) => g.status === "active").length;
  const completedTasks = tasks.filter((t) => t.completed).length;
  const totalTasks = tasks.length;
  const streak = profile?.streak_data?.current || 0;

  // Weekly progress data
  const weekData = getWeekData(moodScores, reflections, moodLogs);

  // Recent activity
  const recent = buildRecentActivity(reflections, journal, goals, tasks);

  // Greeting (updates in real time as daypart changes)
  const greetingEl = el("h2", { class: "dash-greeting", html: `${displayNameFor(new Date().getHours())} <span class="wave">\uD83D\uDC4B</span>` });
  view.append(
    el("div", {},
      greetingEl,
      el("p", { class: "dash-date", text: new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) })
    )
  );
  startGreetingTicker(greetingEl, displayNameFor);

  // AI Daily Insight + Mood score
  const dashGrid = el("div", { class: "dash-grid" });
  const insightCard = el("div", { class: "glass dash-insight-card" },
    el("div", { class: "di-orb" }),
    el("div", { class: "di-label" }, el("span", { html: "\u2728" }), el("span", { text: "AI Daily Insight" })),
    el("div", { class: "di-text", text: "Loading your daily insight..." }),
    el("div", { class: "di-suggestion", text: "" }),
    el("div", { class: "di-mood-prompt", text: "" })
  );
  const moodCard = renderMoodCard(avgMood);
  dashGrid.append(insightCard, moodCard);
  view.append(dashGrid);

  // Fetch daily insight
  loadDailyInsight(insightCard);

  // Stats row
  view.append(
    el("div", { class: "dash-stats-row" },
      renderStat("\uD83C\uDFAF", "Active Goals", String(activeGoals), "in progress"),
      renderStat("\u2705", "Tasks Done", `${completedTasks}/${totalTasks}`, totalTasks ? `${Math.round((completedTasks / totalTasks) * 100)}% complete` : "no tasks yet"),
      renderStat("\uD83D\uDD25", "Day Streak", String(streak), streak > 0 ? "keep it going!" : "start today"),
      renderStat("\uD83D\uDCD8", "Reflections", String(reflections.length), "saved")
    )
  );

  // Weekly progress chart
  view.append(
    el("div", { class: "glass dash-weekly" },
      el("h3", { text: "Weekly Mood Progress" }),
      renderWeekBars(weekData)
    )
  );

  // Recent activity
  view.append(
    el("div", { class: "glass dash-recent" },
      el("h3", { text: "Recent Activity" }),
      el("div", { class: "dash-recent-list" }, ...recent.slice(0, 5).map(renderRecentItem))
    )
  );

  // Quick actions
  view.append(
    el("div", { class: "dash-quick-actions" },
      renderQuickAction("\uD83D\uDCAC", "Talk to EchoMind", "Share what's on your mind", "analyze"),
      renderQuickAction("\uD83C\uDFAF", "Plan a Goal", "Build a smart roadmap", "goals"),
      renderQuickAction("\uD83D\uDCD3", "Journal", "Review your AI journal", "journal"),
      renderQuickAction("\uD83D\uDCCA", "Life Dashboard", "See your wellness trends", "progress")
    )
  );
}

async function loadDailyInsight(card) {
  const memoryContext = await buildMemoryContext();
  try {
    const daily = await api.dailyInsight(memoryContext);
    card.querySelector(".di-text").textContent = daily.insight || "";
    card.querySelector(".di-suggestion").textContent = daily.suggestion || "";
    card.querySelector(".di-mood-prompt").textContent = daily.mood_prompt || "";
  } catch {
    card.querySelector(".di-text").textContent = "Welcome back to EchoMind. Take a moment to check in with yourself today.";
    card.querySelector(".di-suggestion").textContent = "Try sharing a thought on the Analyze page, or plan a new goal.";
  }
}

function renderMoodCard(avgMood) {
  const score = Math.round(avgMood * 10) / 10;
  const pct = avgMood > 0 ? (avgMood / 10) : 0;
  const circumference = 2 * Math.PI * 52;
  const offset = circumference * (1 - pct);
  return el("div", { class: "glass dash-mood-card" },
    el("div", { class: "dash-mood-ring-wrap" },
      el("svg", { class: "dash-mood-ring-svg", width: "120", height: "120", viewBox: "0 0 120 120" },
        el("defs", {},
          el("linearGradient", { id: "moodGrad", x1: "0", y1: "0", x2: "1", y2: "1" },
            el("stop", { offset: "0%", "stop-color": "#5b8cff" }),
            el("stop", { offset: "100%", "stop-color": "#2dd4bf" })
          )
        ),
        el("circle", { class: "dash-mood-ring-bg", cx: "60", cy: "60", r: "52" }),
        el("circle", { class: "dash-mood-ring-fg", cx: "60", cy: "60", r: "52",
          "stroke-dasharray": String(circumference),
          "stroke-dashoffset": String(offset),
        })
      ),
      el("div", { class: "dash-mood-score" },
        el("span", { class: "num", text: score > 0 ? String(score) : "—" }),
        el("span", { class: "lbl", text: "Mood" })
      )
    ),
    el("div", { class: "dash-mood-label", text: avgMood > 0 ? moodLabel(avgMood) : "No data yet" })
  );
}

function renderStat(icon, label, value, sub) {
  return el("div", { class: "glass dash-stat" },
    el("div", { class: "ds-icon", text: icon }),
    el("div", { class: "ds-label", text: label }),
    el("div", { class: "ds-value", text: value }),
    el("div", { class: "ds-sub", text: sub })
  );
}

function renderWeekBars(weekData) {
  return el("div", { class: "dash-week-bars" },
    ...weekData.map((d) =>
      el("div", { class: "dash-week-bar" },
        el("div", { class: `bar${d.score < 4 ? " low" : ""}`, style: `height:${Math.max(d.score * 12, 4)}px` }),
        el("div", { class: "val", text: d.score > 0 ? String(d.score) : "—" }),
        el("div", { class: "day", text: d.day })
      )
    )
  );
}

function renderRecentItem(item) {
  return el("div", { class: "dash-recent-item" },
    el("div", { class: "ri-icon", text: item.icon }),
    el("div", { class: "ri-body" },
      el("div", { class: "ri-title", text: item.title }),
      el("div", { class: "ri-meta", text: item.meta })
    )
  );
}

function renderQuickAction(icon, title, desc, route) {
  return el("button", { class: "dash-quick-action", onclick: () => navigateTo(route) },
    el("div", { class: "qa-icon", text: icon }),
    el("div", { class: "qa-title", text: title }),
    el("div", { class: "qa-desc", text: desc })
  );
}

function navigateTo(route) {
  const btn = document.querySelector(`.nav-item[data-route="${route}"]`);
  if (btn) btn.click();
}

function getWeekData(moodScores, reflections, moodLogs) {
  const days = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dayKey = d.toISOString().slice(0, 10);
    const dayScores = [
      ...reflections.filter((r) => r.date && r.date.slice(0, 10) === dayKey).map((r) => r.mood_score),
      ...moodLogs.filter((m) => m.logged_at && m.logged_at.slice(0, 10) === dayKey).map((m) => m.score),
    ].filter((n) => n > 0);
    const avg = dayScores.length ? Math.round(dayScores.reduce((a, b) => a + b, 0) / dayScores.length) : 0;
    days.push({ day: d.toLocaleDateString(undefined, { weekday: "short" }), score: avg });
  }
  return days;
}

function buildRecentActivity(reflections, journal, goals, tasks) {
  const items = [];
  for (const r of reflections.slice(0, 5)) {
    items.push({ icon: "\uD83D\uDCAD", title: r.input_text?.slice(0, 60) || "Reflection", meta: formatDate(r.date) });
  }
  for (const j of journal.slice(0, 3)) {
    items.push({ icon: "\uD83D\uDCD3", title: j.raw_text?.slice(0, 60) || "Journal entry", meta: formatDate(j.date) });
  }
  for (const g of goals.filter((g) => g.status === "active").slice(0, 2)) {
    items.push({ icon: "\uD83C\uDFAF", title: g.title, meta: `Goal · due ${g.deadline || "no deadline"}` });
  }
  for (const t of tasks.filter((t) => t.completed).slice(0, 2)) {
    items.push({ icon: "\u2705", title: t.title, meta: "Task completed" });
  }
  return items.sort((a, b) => 0); // preserve insertion order
}

export async function buildMemoryContext() {
  try {
    const [reflections, goals, journal, moodLogs, profile] = await Promise.all([
      fetchAll("reflections", { order: "date", limit: 10 }).catch(() => []),
      fetchAll("goals", { order: "created_at", limit: 10 }).catch(() => []),
      fetchAll("journal_entries", { order: "date", limit: 5 }).catch(() => []),
      fetchAll("mood_logs", { order: "logged_at", limit: 10 }).catch(() => []),
      getProfile().catch(() => null),
    ]);

    const lines = [];
    if (profile?.name) lines.push(`User's name: ${profile.name}`);
    if (profile?.preferred_persona) lines.push(`Preferred persona: ${profile.preferred_persona}`);

    if (reflections.length) {
      lines.push(`Recent reflections:`);
      reflections.slice(0, 5).forEach((r) => {
        lines.push(`- Mood ${r.mood_score}/10, emotion: ${r.primary_emotion}. Summary: ${(r.reflection_summary || "").slice(0, 100)}`);
      });
    }
    if (goals.length) {
      lines.push(`Active goals:`);
      goals.filter((g) => g.status === "active").slice(0, 5).forEach((g) => {
        lines.push(`- ${g.title} (deadline: ${g.deadline || "none"}, priority: ${g.priority}/5)`);
      });
    }
    if (journal.length) {
      lines.push(`Recent journal emotions: ${journal.flatMap((j) => j.emotions || []).slice(0, 8).join(", ")}`);
    }
    if (moodLogs.length) {
      const avg = moodLogs.reduce((a, m) => a + m.score, 0) / moodLogs.length;
      lines.push(`Average mood from ${moodLogs.length} check-ins: ${avg.toFixed(1)}/10`);
    }
    return lines.join("\n") || "No prior data yet.";
  } catch {
    return "No prior data yet.";
  }
}

// Re-checks the daypart every minute and updates the greeting live,
// so a long-open dashboard flips from "Good morning" to "Good afternoon"
// (or afternoon to evening) without a page reload.
let greetingInterval = null;
function startGreetingTicker(greetingEl, displayNameFor) {
  if (greetingInterval) clearInterval(greetingInterval);
  let current = greetingForBucket(new Date().getHours());
  greetingInterval = setInterval(() => {
    const now = greetingForBucket(new Date().getHours());
    if (now !== current) {
      current = now;
      greetingEl.innerHTML = `${displayNameFor(new Date().getHours())} <span class="wave">\uD83D\uDC4B</span>`;
    }
  }, 60 * 1000);
}
function greetingForBucket(h) {
  return h < 12 ? "morning" : h < 18 ? "afternoon" : "evening";
}
