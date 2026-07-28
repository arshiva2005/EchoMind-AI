// Vite plugin that exposes the EchoMind API routes during dev.
// Requests to /api/* are handled by our Node backend; everything else
// falls through to Vite's static + module serving.
import { handleApi } from "./api.js";

export function apiMiddleware() {
  const name = "echomind-api";
  return {
    name,
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
        if (!url.pathname.startsWith("/api/")) {
          return next();
        }
        try {
          await handleApi(req, res, url);
        } catch (err) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ detail: err?.message || "Internal error" }));
        }
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
        if (!url.pathname.startsWith("/api/")) {
          return next();
        }
        try {
          await handleApi(req, res, url);
        } catch (err) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ detail: err?.message || "Internal error" }));
        }
      });
    },
  };
}
