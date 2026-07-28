#!/usr/bin/env node
// Build validation for EchoMind AI: checks file presence and JS syntax.
import { existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
let ok = true;
const step = (m) => console.log("  \u2713 " + m);
const fail = (m) => { console.error("  \u2717 " + m); ok = false; };

console.log("EchoMind AI \u2014 build validation\n");

// Backend (Node) files
const backend = ["server/personas.js", "server/prompts.js", "server/groqClient.js", "server/api.js", "server/middleware.js", "vite.config.js"];
for (const f of backend) if (!existsSync(resolve(root, f))) fail(`missing backend file: ${f}`);
step("backend files present");

// Static assets
const assets = ["index.html", "static/css/styles.css",
  "static/js/app.js", "static/js/api.js", "static/js/store.js", "static/js/voice.js",
  "static/js/markdown.js", "static/js/ui.js", "static/js/personas.js", "static/js/supabase.js",
  "static/js/pages/dashboard.js", "static/js/pages/analyze.js", "static/js/pages/focus.js",
  "static/js/pages/goals.js", "static/js/pages/journal.js", "static/js/pages/history.js",
  "static/js/pages/progress.js", "static/js/pages/about.js"];
for (const f of assets) if (!existsSync(resolve(root, f))) fail(`missing asset: ${f}`);
step("static assets present");

// Syntax check all JS modules
const jsFiles = [...backend, ...assets.filter((f) => f.endsWith(".js"))];
for (const f of jsFiles) {
  try { execSync(`node --check "${resolve(root, f)}"`, { stdio: "pipe" }); }
  catch { fail(`syntax error: ${f}`); }
}
step("JS syntax valid");

// Server module imports
try {
  execSync('node --input-type=module -e "import(\'./server/api.js\').then(()=>console.log(\'ok\'))"', { cwd: root, stdio: "pipe" });
  step("server modules import cleanly");
} catch (e) {
  fail("server module import failed: " + (e.stderr || e.message));
}

console.log("\n" + (ok ? "Build validation passed." : "Build validation FAILED."));
process.exit(ok ? 0 : 1);
