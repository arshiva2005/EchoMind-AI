import { defineConfig } from "vite";
import { apiMiddleware } from "./server/middleware.js";

// Vite serves the static frontend; /api/* requests are handled by our
// Node backend middleware (mirrors the original FastAPI routes) so the
// whole app runs on a single Node dev server that Bolt's preview can serve.
export default defineConfig({
 server: {
  host: true,
  port: 5173,
  allowedHosts: true,
  // Hook our API handler into Vite's dev server before static handling.
  middlewareMode: false,
},
  plugins: [apiMiddleware()],
  // The frontend is plain HTML/CSS/JS under /static, served from the
  // project root. We use the root index.html as the entry.
  root: ".",
  publicDir: "static",
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
