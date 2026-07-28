// Smart Goal Planner page — build realistic roadmaps with milestones, daily tasks, and progress tracking.
import { api } from "../api.js";
import { store } from "../store.js";
import { el, toast, formatDate } from "../ui.js";
import { supabase, fetchAll, insertRow, updateRow, deleteRow } from "../supabase.js";

export async function renderGoals(view) {
  view.innerHTML = "";

  // Planner form
  const form = el("div", { class: "glass goal-planner-form" },
    el("h3", { style: "font-family:var(--display);font-size:18px;margin-bottom:14px", text: "Smart Goal Planner" }),
    el("p", { style: "color:var(--text-2);font-size:14px;margin-bottom:18px", text: "Tell me about your goal and I'll build a personalized roadmap with milestones and daily tasks." }),
    el("div", { class: "gp-field" },
      el("label", { class: "gp-label", text: "What do you want to achieve?" }),
      el("textarea", { class: "gp-input", id: "goalDesc", placeholder: "e.g. I want to learn Spanish well enough to have a conversation by my trip in 3 months", style: "min-height:80px;resize:vertical" })
    ),
    el("div", { class: "gp-row" },
      el("div", { class: "gp-field" },
        el("label", { class: "gp-label", text: "Deadline" }),
        el("input", { class: "gp-input", id: "goalDeadline", type: "date" })
      ),
      el("div", { class: "gp-field" },
        el("label", { class: "gp-label", text: "Hours per week available" }),
        el("input", { class: "gp-input", id: "goalHours", type: "number", min: "1", max: "80", value: "5" })
      )
    ),
    el("div", { class: "gp-field" },
      el("label", { class: "gp-label", text: "Priority (1-5)" }),
      el("input", { class: "gp-input", id: "goalPriority", type: "range", min: "1", max: "5", value: "3", style: "width:100%" })
    ),
    el("div", { style: "display:flex;justify-content:flex-end;margin-top:8px" },
      el("button", { class: "analyze-btn", id: "planBtn", onclick: planGoal },
        el("span", { html: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.6 5.2L19 9l-5.4 1.8L12 16l-1.6-5.2L5 9l5.4-1.8z"/></svg>' }),
        el("span", { text: "Build Roadmap" })
      )
    )
  );
  view.append(form);

  // Existing goals
  const goals = await fetchAll("goals", { order: "created_at", limit: 20 }).catch(() => []);
  const goalsList = el("div", { class: "goal-list", id: "goalsList" });
  if (goals.length) {
    view.append(el("h3", { style: "font-family:var(--display);font-size:17px;margin:20px 0 12px", text: "Your Goals" }));
    for (const g of goals) {
      goalsList.append(await renderGoalCard(g));
    }
    view.append(goalsList);
  }

  // Output area
  view.append(el("div", { id: "goalOutput" }));
}

async function planGoal() {
  const desc = document.getElementById("goalDesc").value.trim();
  if (!desc) { toast("Describe your goal first.", "error"); return; }
  const deadline = document.getElementById("goalDeadline").value || null;
  const hours = document.getElementById("goalHours").value || "5";
  const priority = document.getElementById("goalPriority").value || "3";

  const btn = document.getElementById("planBtn");
  const out = document.getElementById("goalOutput");
  btn.disabled = true;
  out.innerHTML = '<div class="glass" style="padding:22px"><div class="loading-bar"><div class="loading-bar-fill" style="width:50%"></div></div><p style="color:var(--text-3);font-size:14px;margin-top:12px">Building your personalized roadmap...</p></div>';

  try {
    const plan = await api.planGoal(desc, deadline, hours, priority);

    // Save goal to Supabase
    const goalRow = await insertRow("goals", {
      title: plan.goal_title || desc.slice(0, 80),
      description: plan.goal_summary || "",
      deadline: deadline || null,
      priority: parseInt(priority),
      available_hours_per_week: parseFloat(hours),
      status: "active",
    });

    // Save milestones
    const milestones = [];
    for (const m of (plan.milestones || [])) {
      const ms = await insertRow("milestones", {
        goal_id: goalRow.id,
        title: m.title || "",
        description: m.description || "",
        order_index: m.order_index || milestones.length,
        target_date: parseTargetDate(m.target_date, deadline),
        completed: false,
      });
      milestones.push(ms);
    }

    // Save daily tasks
    for (const t of (plan.daily_tasks || [])) {
      const msIdx = t.milestone_index ?? 0;
      await insertRow("daily_tasks", {
        goal_id: goalRow.id,
        milestone_id: milestones[msIdx]?.id || null,
        title: t.title || "",
        description: t.description || "",
        estimated_minutes: t.estimated_minutes || 30,
        scheduled_date: new Date().toISOString().slice(0, 10),
        completed: false,
      });
    }

    out.innerHTML = "";
    out.append(renderRoadmap(plan, goalRow.id));

    // Refresh goals list
    await refreshGoalsList();
    toast("Roadmap created and saved!", "success");
  } catch (err) {
    out.innerHTML = `<div class="glass" style="padding:18px;border-left:3px solid var(--error);color:var(--text-2)">${err.message}</div>`;
  } finally {
    btn.disabled = false;
  }
}

function renderRoadmap(plan, goalId) {
  const wrap = el("div", { class: "goal-roadmap" });
  wrap.append(
    el("div", { class: "glass goal-overview" },
      el("h3", { text: plan.goal_title || "Your Goal" }),
      el("p", { text: plan.goal_summary || "" }),
      el("div", { class: "go-meta" },
        el("span", { class: "go-meta-item", html: '\u23F1\uFE0F ' + (plan.estimated_total_weeks || "?") + ' weeks' }),
        el("span", { class: "go-meta-item", html: '\uD83C\uDFAF ' + (plan.milestones?.length || 0) + ' milestones' }),
        el("span", { class: "go-meta-item", html: '\u2705 ' + (plan.daily_tasks?.length || 0) + ' daily tasks' })
      ),
      plan.encouragement ? el("p", { style: "color:var(--accent-2);font-size:14px;margin-top:10px;font-style:italic", text: plan.encouragement }) : null
    )
  );

  // Milestones timeline
  if (plan.milestones?.length) {
    const timeline = el("div", { class: "glass", style: "padding:22px" },
      el("h3", { style: "font-size:15px;margin-bottom:16px", text: "Milestones" }),
      el("div", { class: "milestone-timeline" },
        ...plan.milestones.map((m, i) =>
          el("div", { class: "milestone-item" },
            el("div", { class: "milestone-dot", text: String(i + 1) }),
            el("div", { class: "milestone-body" },
              el("div", { class: "mb-title", text: m.title || "" }),
              el("div", { class: "mb-desc", text: m.description || "" }),
              m.target_date ? el("div", { class: "mb-date", text: `\uD83D\uDCC5 ${m.target_date}` }) : null
            )
          )
        )
      )
    );
    wrap.append(timeline);
  }

  // Daily tasks
  if (plan.daily_tasks?.length) {
    wrap.append(
      el("div", { class: "glass goal-tasks" },
        el("h3", { text: "Daily Tasks" }),
        ...plan.daily_tasks.map((t, i) =>
          el("div", { class: "task-item" },
            el("div", { class: "ti-check", dataset: { taskIndex: String(i) } }),
            el("div", { class: "ti-body" },
              el("div", { class: "ti-title", text: t.title || "" }),
              t.description ? el("div", { class: "ti-time", text: t.description }) : null
            ),
            el("div", { class: "ti-time", text: `${t.estimated_minutes || 30}m` })
          )
        )
      )
    );
  }

  // Obstacles & tips
  if (plan.potential_obstacles?.length || plan.success_tips?.length) {
    const card = el("div", { class: "glass", style: "padding:22px;display:flex;flex-direction:column;gap:16px" });
    if (plan.potential_obstacles?.length) {
      card.append(
        el("div", {},
          el("div", { style: "font-size:13px;color:var(--text-3);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px", text: "Potential Obstacles" }),
          ...plan.potential_obstacles.map((o) => el("p", { style: "font-size:13.5px;color:var(--text-2);padding-left:16px;position:relative;margin-bottom:4px", text: o }))
        )
      );
    }
    if (plan.success_tips?.length) {
      card.append(
        el("div", {},
          el("div", { style: "font-size:13px;color:var(--text-3);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px", text: "Success Tips" }),
          ...plan.success_tips.map((t) => el("p", { style: "font-size:13.5px;color:var(--text-2);padding-left:16px;position:relative;margin-bottom:4px", text: t }))
        )
      );
    }
    wrap.append(card);
  }

  return wrap;
}

async function renderGoalCard(goal) {
  const milestones = await fetchAll("milestones", { order: "order_index" }).catch(() => []);
  const goalMs = milestones.filter((m) => m.goal_id === goal.id);
  const tasks = await fetchAll("daily_tasks", { order: "scheduled_date" }).catch(() => []);
  const goalTasks = tasks.filter((t) => t.goal_id === goal.id);
  const completedTasks = goalTasks.filter((t) => t.completed).length;
  const pct = goalTasks.length ? Math.round((completedTasks / goalTasks.length) * 100) : 0;

  return el("div", { class: "glass goal-card", dataset: { goalId: goal.id } },
    el("div", { class: "gc-icon", text: "\uD83C\uDFAF" }),
    el("div", { class: "gc-body" },
      el("div", { class: "gc-title", text: goal.title }),
      el("div", { class: "gc-meta", text: `${goalMs.length} milestones · ${completedTasks}/${goalTasks.length} tasks · ${goal.deadline ? "due " + goal.deadline : "no deadline"}` })
    ),
    el("div", { class: "gc-progress" },
      el("div", { class: "pct", text: `${pct}%` })
    )
  );
}

async function refreshGoalsList() {
  const list = document.getElementById("goalsList");
  if (!list) return;
  list.innerHTML = "";
  const goals = await fetchAll("goals", { order: "created_at", limit: 20 }).catch(() => []);
  for (const g of goals) {
    list.append(await renderGoalCard(g));
  }
}

function parseTargetDate(targetDate, deadline) {
  if (!targetDate) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) return targetDate;
  const match = targetDate.match(/Week\s*(\d+)/i);
  if (match) {
    const d = new Date();
    d.setDate(d.getDate() + parseInt(match[1]) * 7);
    return d.toISOString().slice(0, 10);
  }
  return null;
}
