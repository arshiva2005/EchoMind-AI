// Reflection snapshot card with Save / Copy / Download-as-PNG.
import { store } from "../store.js";
import { el, toast, moodClass, formatDate } from "../ui.js";

export function renderSnapshot(analysis, originalInput) {
  const score = Number(analysis.mood_score) || 5;
  const now = new Date().toISOString();
  const id = `r_${Date.now()}`;
  const entry = {
    id,
    date: now,
    input: originalInput,
    mood_score: score,
    primary_emotion: analysis.primary_emotion || "—",
    thought_patterns: analysis.thought_patterns || [],
    summary: analysis.reflection_summary || "",
    today_goal: analysis.action_plan?.today_goal || "",
    key_insight: analysis.root_cause || analysis.motivational_insight || "",
    main_challenge: analysis.mind_map?.problem || "",
    language: analysis.language || "",
  };

  const wrap = el("div", { class: "snapshot-wrap" });
  const card = el("div", { class: "snapshot", id: "snapshotCard" });
  card.append(
    el("div", { class: "snapshot-head" },
      el("h3", { text: "Reflection Snapshot" }),
      el("span", { class: "snapshot-date", text: formatDate(now) })
    ),
    el("div", { class: "snapshot-rows" },
      snapRow("Mood Score", `${score}/10`, `badge ${moodClass(score)}`),
      snapRow("Primary Emotion", entry.primary_emotion, `badge ${moodClass(score)}`),
      snapRow("Main Challenge", entry.main_challenge),
      snapRow("Today's Goal", entry.today_goal),
      snapRow("Key Insight", entry.key_insight),
    ),
    el("div", { class: "snapshot-actions" },
      el("button", { class: "btn btn-primary btn-sm", onclick: () => saveSnapshot(entry) },
        el("span", { html: saveIcon() }), el("span", { text: "Save" })
      ),
      el("button", { class: "btn btn-sm", onclick: () => copySnapshot(entry) },
        el("span", { html: copyIcon() }), el("span", { text: "Copy" })
      ),
      el("button", { class: "btn btn-sm", onclick: () => downloadPng() },
        el("span", { html: downloadIcon() }), el("span", { text: "PNG" })
      )
    )
  );
  wrap.append(card);
  return wrap;
}

function snapRow(key, value, badgeClass = "") {
  const valNode = badgeClass
    ? el("span", { class: badgeClass, text: value })
    : el("span", { class: "snap-val", text: value });
  return el("div", { class: "snap-row" },
    el("span", { class: "snap-key", text: key }),
    el("div", { class: "snap-val" }, valNode)
  );
}

function saveSnapshot(entry) {
  store.saveReflection(entry);
  toast("Reflection saved to History.", "success");
}

function copySnapshot(entry) {
  const lines = [
    "EchoMind AI — Reflection Snapshot",
    `Date: ${formatDate(entry.date)}`,
    `Mood Score: ${entry.mood_score}/10`,
    `Primary Emotion: ${entry.primary_emotion}`,
    `Main Challenge: ${entry.main_challenge}`,
    `Today's Goal: ${entry.today_goal}`,
    `Key Insight: ${entry.key_insight}`,
  ].join("\n");
  navigator.clipboard.writeText(lines).then(
    () => toast("Snapshot copied to clipboard.", "success"),
    () => toast("Could not copy.", "error")
  );
}

function downloadPng() {
  const card = document.getElementById("snapshotCard");
  if (!card) return;
  // Render the card to a canvas via the SVG foreignObject trick.
  const rect = card.getBoundingClientRect();
  const w = Math.ceil(rect.width) + 40;
  const h = Math.ceil(rect.height) + 40;
  const data = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <foreignObject x="0" y="0" width="100%" height="100%">
      <div xmlns="http://www.w3.org/1999/xhtml" style="padding:20px;background:transparent">
        ${card.outerHTML}
      </div>
    </foreignObject>
  </svg>`;
  const svg = new Blob([data], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svg);
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = w * 2;
    canvas.height = h * 2;
    const ctx = canvas.getContext("2d");
    ctx.scale(2, 2);
    ctx.fillStyle = "#070b14";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    canvas.toBlob((blob) => {
      if (!blob) { toast("PNG export failed.", "error"); return; }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `echomind-snapshot-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast("Snapshot downloaded as PNG.", "success");
    }, "image/png");
  };
  img.onerror = () => {
    URL.revokeObjectURL(url);
    toast("PNG export not supported in this browser. Use Copy instead.", "error");
  };
  img.src = url;
}

function saveIcon() {
  return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>';
}
function copyIcon() {
  return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
}
function downloadIcon() {
  return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
}
