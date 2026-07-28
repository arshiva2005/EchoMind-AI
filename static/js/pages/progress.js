// Life Dashboard page — emotional wellness, productivity, confidence, consistency, learning, achievements, streaks, trends.
import { store } from "../store.js";
import { el, moodClass, moodLabel } from "../ui.js";
import { fetchAll, getProfile, insertRow, updateRow } from "../supabase.js";
import { api } from "../api.js";
import { buildMemoryContext } from "./dashboard.js";

export async function renderProgress(view) {
  view.innerHTML = "";

  const [reflections, goals, journal, moodLogs, tasks, profile, insights] = await Promise.all([
    fetchAll("reflections", { order: "date", limit: 100 }).catch(() => []),
    fetchAll("goals", { order: "created_at", limit: 50 }).catch(() => []),
    fetchAll("journal_entries", { order: "date", limit: 50 }).catch(() => []),
    fetchAll("mood_logs", { order: "logged_at", limit: 100 }).catch(() => []),
    fetchAll("daily_tasks", { order: "scheduled_date", limit: 100 }).catch(() => []),
    getProfile().catch(() => null),
    fetchAll("insights", { order: "created_at", limit: 10 }).catch(() => []),
  ]);

  if (!reflections.length && !moodLogs.length && !goals.length) {
    view.append(el("div", { class: "empty-state" },
      el("div", { class: "emoji", text: "\uD83D\uDCCA" }),
      el("h3", { text: "No data yet" }),
      el("p", { text: "Start reflecting, planning goals, or having conversations to see your Life Dashboard come alive." })
    ));
    return;
  }

  // Proactive insight banners
  if (insights.length) {
    for (const ins of insights.filter((i) => !i.dismissed).slice(0, 3)) {
      view.append(renderInsightBanner(ins));
    }
  }

  // Generate insights button
  view.append(
    el("div", { class: "glass", style: "padding:16px 20px;margin-bottom:18px;display:flex;align-items:center;justify-content:space-between" },
      el("div", {},
        el("p", { style: "font-size:14px;color:var(--text)", text: "Proactive AI Insights" }),
        el("p", { style: "font-size:12.5px;color:var(--text-3);margin-top:4px", text: "Let EchoMind analyze your patterns and generate personalized insights." })
      ),
      el("button", { class: "btn btn-primary btn-sm", id: "genInsightsBtn", onclick: () => generateInsights(view) },
        el("span", { text: "Generate Insights" })
      )
    )
  );

  // Compute metrics
  const moodScores = [...reflections.map((r) => r.mood_score), ...moodLogs.map((m) => m.score)].filter((n) => n > 0);
  const avgMood = moodScores.length ? moodScores.reduce((a, b) => a + b, 0) / moodScores.length : 0;
  const completedTasks = tasks.filter((t) => t.completed).length;
  const totalTasks = tasks.length;
  const productivity = totalTasks ? (completedTasks / totalTasks) * 100 : 0;
  const activeGoals = goals.filter((g) => g.status === "active").length;
  const completedGoals = goals.filter((g) => g.status === "completed").length;
  const streak = profile?.streak_data?.current || 0;
  const longestStreak = profile?.streak_data?.longest || 0;

  // Confidence: based on mood trend (improving = higher)
  const recentMoods = moodScores.slice(0, 5);
  const olderMoods = moodScores.slice(5, 10);
  const recentAvg = recentMoods.length ? recentMoods.reduce((a, b) => a + b, 0) / recentMoods.length : 0;
  const olderAvg = olderMoods.length ? olderMoods.reduce((a, b) => a + b, 0) / olderMoods.length : 0;
  const confidence = Math.min(100, Math.max(0, 50 + (recentAvg - olderAvg) * 10 + avgMood * 3));

  // Consistency: how many days in last 7 had activity
  const consistency = calcConsistency(reflections, moodLogs, journal);

  // Learning progress: based on journal entries and goal milestones
  const allMilestones = await fetchAll("milestones", { order: "order_index" }).catch(() => []);
  const completedMs = allMilestones.filter((m) => m.completed).length;
  const learning = allMilestones.length ? (completedMs / allMilestones.length) * 100 : (journal.length > 0 ? Math.min(100, journal.length * 10) : 0);

  // Life metric cards
  view.append(
    el("div", { class: "life-grid" },
      renderLifeCard("\uD83C\uDF3F", "Emotional Wellness", avgMood > 0 ? `${avgMood.toFixed(1)}/10` : "—", avgMood / 10, moodLabel(avgMood)),
      renderLifeCard("\u26A1", "Productivity", `${Math.round(productivity)}%`, productivity / 100, `${completedTasks}/${totalTasks} tasks`),
      renderLifeCard("\uD83D\uDCAA", "Confidence", `${Math.round(confidence)}%`, confidence / 100, "mood trend based"),
      renderLifeCard("\uD83D\uDD04", "Consistency", `${consistency}/7`, consistency / 7, "days active this week"),
      renderLifeCard("\uD83D\uDCDA", "Learning", `${Math.round(learning)}%`, learning / 100, `${completedMs} milestones done`),
      renderLifeCard("\uD83D\uDD25", "Streak", `${streak} days`, Math.min(streak / 30, 1), `longest: ${longestStreak} days`)
    )
  );

  // Mood trend chart
  const trendScores = moodScores.slice().reverse();
  view.append(
    el("div", { class: "glass chart-card", style: "margin-bottom:14px" },
      el("h3", { text: "Mood Trend Over Time" }),
      renderMoodChart(trendScores)
    )
  );

  // Emotion distribution
  const emotions = countBy([
    ...reflections.map((r) => r.primary_emotion).filter(Boolean),
    ...journal.flatMap((j) => j.emotions || []),
    ...moodLogs.map((m) => m.emotion).filter(Boolean),
  ]);
  view.append(
    el("div", { class: "glass chart-card", style: "margin-bottom:14px" },
      el("h3", { text: "Emotion Distribution" }),
      renderBarChart(emotions)
    )
  );

  // Achievements
  view.append(
    el("div", { class: "glass", style: "padding:22px;margin-bottom:14px" },
      el("h3", { style: "font-size:15px;margin-bottom:14px", text: "Achievements" }),
      el("div", { class: "achievement-grid" },
        renderAchievement("\uD83C\uDF1F", "First Reflection", "Saved your first reflection", reflections.length > 0),
        renderAchievement("\uD83D\uDD25", "3-Day Streak", "Reflected 3 days in a row", streak >= 3),
        renderAchievement("\uD83C\uDFC6", "Goal Getter", "Completed a goal", completedGoals > 0),
        renderAchievement("\uD83D\uDCD3", "Journal Keeper", "5 journal entries", journal.length >= 5),
        renderAchievement("\uD83D\uDCAA", "Mood Tracker", "10 mood check-ins", moodLogs.length >= 10),
        renderAchievement("\uD83C\uDFC6", "Century Club", "100 reflections", reflections.length >= 100),
      )
    )
  );
}

function renderLifeCard(icon, label, value, pct, sub) {
  return el("div", { class: "glass life-card" },
    el("div", { class: "lc-icon", text: icon }),
    el("div", { class: "lc-label", text: label }),
    el("div", { class: "lc-value", text: value }),
    el("div", { class: "lc-bar" }, el("div", { class: "lc-bar-fill", style: `width:${Math.min(100, Math.max(0, pct * 100))}%` })),
    el("div", { class: "lc-sub", text: sub })
  );
}

function renderInsightBanner(insight) {
  return el("div", { class: `insight-banner ${insight.severity || "info"}` },
    el("div", { class: "ib-icon", text: insightIcon(insight.type) }),
    el("div", { class: "ib-body" },
      el("div", { class: "ib-title", text: insight.title || "" }),
      el("div", { class: "ib-text", text: insight.body || "" })
    ),
    el("button", { class: "ib-dismiss", onclick: async (e) => {
      e.target.closest(".insight-banner").style.display = "none";
      try { await updateRow("insights", insight.id, { dismissed: true }); } catch {}
    }, text: "\u00D7" })
  );
}

function insightIcon(type) {
  const icons = { weekly: "\uD83D\uDCCA", burnout: "\u26A0\uFE0F", pattern: "\uD83D\uDD0D", encouragement: "\u2728", checkin: "\uD83D\uDCAC" };
  return icons[type] || "\uD83D\uDCA1";
}

function renderAchievement(icon, title, desc, unlocked) {
  return el("div", { class: `achievement-badge${unlocked ? "" : " locked"}` },
    el("div", { class: "ab-icon", text: icon }),
    el("div", { class: "ab-title", text: title }),
    el("div", { class: "ab-desc", text: unlocked ? desc : "Locked" })
  );
}

function calcConsistency(reflections, moodLogs, journal) {
  const days = new Set();
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (reflections.some((r) => r.date?.slice(0, 10) === key)) days.add(key);
    if (moodLogs.some((m) => m.logged_at?.slice(0, 10) === key)) days.add(key);
    if (journal.some((j) => j.date?.slice(0, 10) === key)) days.add(key);
  }
  return days.size;
}

function countBy(arr) {
  const m = {};
  for (const k of arr) m[k] = (m[k] || 0) + 1;
  return m;
}

function renderMoodChart(values) {
  const w = 600, h = 180, pad = 24, max = 10;
  if (!values.length) return el("p", { text: "No mood data yet.", style: "color:var(--text-3)" });
  const step = values.length > 1 ? (w - pad * 2) / (values.length - 1) : 0;
  const pts = values.map((v, i) => [pad + i * step, h - pad - (v / max) * (h - pad * 2)]);
  const linePath = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${pts[pts.length - 1][0].toFixed(1)},${h - pad} L${pts[0][0].toFixed(1)},${h - pad} Z`;
  const svg = `<svg class="mood-chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
    <defs><linearGradient id="moodG2" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#5b8cff" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#5b8cff" stop-opacity="0"/>
    </linearGradient></defs>
    ${[2, 4, 6, 8, 10].map((g) => {
      const y = h - pad - (g / max) * (h - pad * 2);
      return `<line x1="${pad}" y1="${y}" x2="${w - pad}" y2="${y}" stroke="rgba(255,255,255,0.06)"/>`;
    }).join("")}
    <path d="${areaPath}" fill="url(#moodG2)"/>
    <path d="${linePath}" fill="none" stroke="#5b8cff" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    ${pts.map((p) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.5" fill="#7aa2ff"/>`).join("")}
  </svg>`;
  return el("div", { html: svg });
}

function renderBarChart(map) {
  const entries = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const max = Math.max(...entries.map((e) => e[1]), 1);
  return el("div", { class: "bar-chart" },
    ...entries.map(([key, count]) =>
      el("div", { class: "bar-row" },
        el("div", { class: "bar-label", text: key }),
        el("div", { class: "bar-track" }, el("div", { class: "bar-fill", style: `width:${(count / max) * 100}%` })),
        el("div", { class: "bar-count", text: String(count) })
      )
    )
  );
}

async function generateInsights(view) {
  const btn = document.getElementById("genInsightsBtn");
  if (btn) { btn.disabled = true; btn.textContent = "Analyzing..."; }
  try {
    const ctx = await buildMemoryContext();
    const insights = await api.insights(ctx);
    for (const ins of (insights || [])) {
      try {
        await insertRow("insights", {
          type: ins.type || "info",
          title: ins.title || "",
          body: ins.body || "",
          severity: ins.severity || "info",
        });
      } catch {}
    }
    toast("Insights generated!", "success");
    await renderProgress(view);
  } catch (err) {
    toast("Could not generate insights: " + err.message, "error");
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "Generate Insights"; }
  }
}
