// AI Journal page — auto-extracted emotions, key events, lessons learned, and growth from conversations.
import { api } from "../api.js";
import { store } from "../store.js";
import { el, toast, moodClass, moodLabel, formatDate } from "../ui.js";
import { fetchAll, insertRow } from "../supabase.js";

export async function renderJournal(view) {
  view.innerHTML = "";

  const entries = await fetchAll("journal_entries", { order: "date", limit: 50 }).catch(() => []);
  const conversations = await fetchAll("conversations", { order: "created_at", limit: 30 }).catch(() => []);

  // Header
  view.append(
    el("div", { class: "glass", style: "padding:22px 24px;margin-bottom:16px" },
      el("h3", { style: "font-family:var(--display);font-size:18px;margin-bottom:6px", text: "AI Journal" }),
      el("p", { style: "color:var(--text-2);font-size:14px", text: "EchoMind automatically extracts emotions, key events, lessons learned, and growth notes from your conversations." })
    )
  );

  // Generate journal from recent conversations
  const unprocessed = conversations.filter((c) => !entries.some((e) => e.conversation_id === c.id) && c.turns?.length > 1);
  if (unprocessed.length > 0) {
    view.append(
      el("div", { class: "glass", style: "padding:18px 20px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between" },
        el("div", {},
          el("p", { style: "font-size:14px;color:var(--text)", text: `${unprocessed.length} unprocessed conversation(s)` }),
          el("p", { style: "font-size:12.5px;color:var(--text-3);margin-top:4px", text: "Generate journal entries from your recent conversations." })
        ),
        el("button", { class: "btn btn-primary btn-sm", onclick: () => generateEntries(unprocessed) },
          el("span", { text: "Generate Journal" })
        )
      )
    );
  }

  // Journal entries
  if (entries.length) {
    const list = el("div", { class: "journal-list" });
    for (const entry of entries) {
      list.append(renderJournalEntry(entry));
    }
    view.append(list);
  } else if (!unprocessed.length) {
    view.append(
      el("div", { class: "empty-state" },
        el("div", { class: "emoji", text: "\uD83D\uDCD3" }),
        el("h3", { text: "No journal entries yet" }),
        el("p", { text: "Have a conversation on the Analyze page and EchoMind will extract journal insights automatically." })
      )
    );
  }
}

function renderJournalEntry(entry) {
  return el("div", { class: "glass journal-entry" },
    el("div", { class: "je-head" },
      el("div", {},
        el("div", { class: "je-title", text: entry.raw_text?.slice(0, 50) + "..." || "Journal Entry" }),
        el("div", { class: "je-date", text: formatDate(entry.date) })
      ),
      el("div", { class: "je-mood" },
        el("span", { class: `badge ${moodClass(entry.mood_score || 5)}`, text: `Mood ${entry.mood_score || "?"}/10` }),
        entry.ai_generated ? el("span", { class: "badge b-blue", text: "AI" }) : null
      )
    ),
    entry.emotions?.length ? el("div", { class: "je-section" },
      el("div", { class: "je-label", text: "Emotions" }),
      el("div", { class: "je-emotions" },
        ...entry.emotions.map((e) => el("span", { class: "badge b-slate", text: e }))
      )
    ) : null,
    entry.key_events?.length ? el("div", { class: "je-section" },
      el("div", { class: "je-label", text: "Key Events" }),
      el("ul", { class: "je-events" },
        ...entry.key_events.map((e) => el("li", { text: e }))
      )
    ) : null,
    entry.lessons_learned?.length ? el("div", { class: "je-section" },
      el("div", { class: "je-label", text: "Lessons Learned" }),
      el("ul", { class: "je-lessons" },
        ...entry.lessons_learned.map((l) => el("li", { text: l }))
      )
    ) : null,
    entry.growth_notes ? el("div", { class: "je-section" },
      el("div", { class: "je-label", text: "Growth Notes" }),
      el("div", { class: "je-growth", text: entry.growth_notes })
    ) : null
  );
}

async function generateEntries(conversations) {
  toast("Generating journal entries...", "");
  let count = 0;
  for (const conv of conversations) {
    try {
      const convText = (conv.turns || []).map((t) => `${t.role}: ${t.content}`).join("\n");
      if (!convText.trim()) continue;
      const journal = await api.extractJournal(convText);
      await insertRow("journal_entries", {
        conversation_id: conv.id,
        emotions: journal.emotions || [],
        key_events: journal.key_events || [],
        lessons_learned: journal.lessons_learned || [],
        growth_notes: journal.growth_notes || "",
        mood_score: journal.mood_score || 5,
        raw_text: journal.title || convText.slice(0, 200),
        ai_generated: true,
      });
      count++;
    } catch (err) {
      // continue to next
    }
  }
  toast(`${count} journal entries generated!`, "success");
  // Re-render
  const view = document.getElementById("view");
  await renderJournal(view);
}
