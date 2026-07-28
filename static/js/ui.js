// Shared UI helpers: toast, modal, typing animation, expandable cards, html.
export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k === "text") node.textContent = v;
    else if (k === "dataset") Object.assign(node.dataset, v);
    else if (k.startsWith("on") && typeof v === "function") {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (v !== null && v !== undefined) {
      node.setAttribute(k, v);
    }
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return node;
}

let toastTimer = null;
export function toast(message, type = "") {
  const t = document.getElementById("toast");
  t.textContent = message;
  t.className = `toast show ${type}`;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    t.classList.remove("show");
    setTimeout(() => (t.hidden = true), 350);
  }, 3200);
}

export function openModal(id) {
  document.getElementById(id).classList.add("open");
}
export function closeModal(id) {
  document.getElementById(id).classList.remove("open");
}

// Build an expandable card with a smooth open/close.
export function expandableCard({ icon, title, subtitle, bodyHtml, open = false }) {
  const card = el("div", { class: `card glass${open ? " open" : ""}` });
  const head = el("button", { class: "card-head", type: "button" });
  head.append(
    el("span", { class: "card-ico", html: icon }),
    el("div", { class: "card-title" }, title, subtitle ? el("span", { class: "card-sub", text: subtitle }) : null),
    el("span", { class: "card-chev", html: "&#8964;" })
  );
  const body = el("div", { class: "card-body" });
  const inner = el("div", { class: "card-body-inner md", html: bodyHtml });
  body.append(inner);
  card.append(head, body);
  head.addEventListener("click", () => card.classList.toggle("open"));
  return card;
}

// Animate text appearing as if typed, into a target element.
export function typeInto(target, text, { speed = 14, done } = {}) {
  target.textContent = "";
  target.classList.add("typing");
  let i = 0;
  const total = text.length;
  function step() {
    i = Math.min(total, i + Math.max(1, Math.round(total / 220)));
    target.textContent = text.slice(0, i);
    if (i < total) {
      setTimeout(step, speed);
    } else {
      target.classList.remove("typing");
      if (done) done();
    }
  }
  step();
}

// Mood -> color class for badges/visuals.
export function moodClass(score) {
  if (score >= 8) return "b-green";
  if (score >= 6) return "b-teal";
  if (score >= 4) return "b-amber";
  return "b-rose";
}

export function moodLabel(score) {
  if (score >= 8) return "Positive";
  if (score >= 6) return "Balanced";
  if (score >= 4) return "Mixed";
  if (score >= 2) return "Low";
  return "Heavy";
}

// Format a date for display.
export function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) +
    " · " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}
