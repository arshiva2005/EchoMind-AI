// Minimal, safe-ish markdown renderer for inline emphasis, bold, code, lists.
// We only render model-generated reflection text, so we support a tiny subset
// and escape HTML to avoid injection.
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inline(s) {
  let out = escapeHtml(s);
  // bold
  out = out.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  // italic
  out = out.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
  // underscore italic
  out = out.replace(/_([^_]+)_/g, "<em>$1</em>");
  // inline code
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  return out;
}

export function renderMarkdown(text) {
  if (!text) return "";
  const lines = String(text).split(/\r?\n/);
  const html = [];
  let inList = false;
  let para = [];

  const flushPara = () => {
    if (para.length) {
      html.push(`<p>${inline(para.join(" "))}</p>`);
      para = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushPara();
      if (inList) {
        html.push("</ul>");
        inList = false;
      }
      continue;
    }
    const bullet = line.match(/^[-*]\s+(.*)$/);
    if (bullet) {
      flushPara();
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li>${inline(bullet[1])}</li>`);
    } else {
      if (inList) {
        html.push("</ul>");
        inList = false;
      }
      para.push(line);
    }
  }
  flushPara();
  if (inList) html.push("</ul>");
  return html.join("");
}
