// History page — saved reflections with search, open, delete.
import { store } from "../store.js";
import { el, toast, moodClass, formatDate } from "../ui.js";

export function renderHistory(view) {
  const all = store.getReflections();
  view.innerHTML = "";

  const tools = el("div", { class: "history-tools" },
    el("input", { class: "search-input", id: "historySearch", placeholder: "Search reflections by emotion, keyword, or summary..." }),
    el("button", { class: "btn btn-danger btn-sm", id: "clearAll", onclick: clearAll }, "Clear all")
  );

  const list = el("div", { class: "history-list", id: "historyList" });

  view.append(tools, list);
  renderList(all, list);

  document.getElementById("historySearch").addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = all.filter((r) =>
      (r.input || "").toLowerCase().includes(q) ||
      (r.summary || "").toLowerCase().includes(q) ||
      (r.primary_emotion || "").toLowerCase().includes(q) ||
      (r.thought_patterns || []).some((p) => p.toLowerCase().includes(q))
    );
    renderList(filtered, list);
  });
}

function renderList(items, list) {
  list.innerHTML = "";
  if (!items.length) {
    list.append(el("div", { class: "empty-state" },
      el("div", { class: "emoji", text: "\uD83D\uDCD8" }),
      el("h3", { text: "No reflections yet" }),
      el("p", { text: "Run an analysis on the Analyze page and tap Save to keep it here." })
    ));
    return;
  }
  for (const r of items) {
    const card = el("div", { class: "history-card glass" });
    card.append(
      el("div", { class: `history-mood badge ${moodClass(r.mood_score)}`, text: `${r.mood_score}` }),
      el("div", { class: "history-body" },
        el("div", { class: "history-input", text: r.input || "—" }),
        el("div", { class: "history-meta" },
          el("span", { class: "badge b-slate", text: r.primary_emotion || "—" }),
          ...(r.thought_patterns || []).slice(0, 2).map((p) => el("span", { class: "badge b-blue", text: p })),
          el("span", { class: "history-date", text: formatDate(r.date) })
        )
      ),
      el("div", { class: "history-actions" },
        el("button", { class: "btn btn-sm", onclick: (e) => { e.stopPropagation(); openItem(r); } }, "Open"),
        el("button", { class: "btn btn-danger btn-sm", onclick: (e) => { e.stopPropagation(); deleteItem(r.id); } }, "Delete")
      )
    );
    card.addEventListener("click", () => openItem(r));
    list.append(card);
  }
}

function openItem(r) {
  const modal = el("div", { class: "modal open", id: "historyModal" });
  modal.append(
    el("div", { class: "modal-backdrop", onclick: () => modal.remove() }),
    el("div", { class: "modal-card glass" },
      el("button", { class: "modal-x", onclick: () => modal.remove(), text: "×" }),
      el("div", { class: "badges", style: "margin-bottom:12px" },
        el("span", { class: `badge ${moodClass(r.mood_score)}`, text: `Mood ${r.mood_score}/10` }),
        el("span", { class: "badge b-slate", text: r.primary_emotion || "—" }),
        el("span", { class: "badge b-blue", text: formatDate(r.date) })
      ),
      el("h3", { text: "Your Reflection", style: "font-family:var(--display);margin-bottom:10px" }),
      el("p", { style: "color:var(--text);font-size:14.5px;margin-bottom:14px;line-height:1.6", text: r.input || "—" }),
      r.main_challenge ? el("p", { style: "color:var(--text-3);font-size:12.5px;margin-bottom:4px", text: "Main challenge" }) : null,
      r.main_challenge ? el("p", { style: "color:var(--text-2);font-size:14px;margin-bottom:12px", text: r.main_challenge }) : null,
      el("p", { style: "color:var(--text-3);font-size:12.5px;margin-bottom:4px", text: "Summary" }),
      el("p", { style: "color:var(--text-2);font-size:14px;margin-bottom:12px;line-height:1.6", text: r.summary || "—" }),
      r.today_goal ? el("p", { style: "color:var(--text-3);font-size:12.5px;margin-bottom:4px", text: "Today's goal" }) : null,
      r.today_goal ? el("p", { style: "color:var(--accent-2);font-size:14px", text: r.today_goal }) : null
    )
  );
  document.body.append(modal);
}

function deleteItem(id) {
  store.deleteReflection(id);
  const list = document.getElementById("historyList");
  renderList(store.getReflections(), list);
  toast("Reflection deleted.", "");
}

function clearAll() {
  if (!store.getReflections().length) return;
  store.clearReflections();
  const list = document.getElementById("historyList");
  renderList([], list);
  toast("All reflections cleared.", "");
}
