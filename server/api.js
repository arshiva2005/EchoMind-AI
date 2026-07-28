// API route handlers for EchoMind AI endpoints.
import { GroqError, chatCompletion, streamChatCompletion } from "./groqClient.js";
import {
  buildAnalysisMessages,
  buildFocusMessages,
  buildFollowupMessages,
  buildCompanionMessages,
  buildGoalPlannerMessages,
  buildJournalMessages,
  buildInsightsMessages,
  buildDailyInsightMessages,
  parseJsonResponse,
  parseCompanionResponse,
  COMPANION_META_DELIMITER,
} from "./prompts.js";

const JSON_FORMAT = { type: "json_object" };

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (err) {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

export async function handleApi(req, res, url) {
  const path = url.pathname;

  if (path === "/api/health" && req.method === "GET") {
    return sendJson(res, 200, {
      status: "ok",
      name: "EchoMind AI",
      version: "1.0.0",
      groq_configured: Boolean(process.env.GROQ_API_KEY),
    });
  }

  // All POST endpoints accept an optional X-Groq-Key header.
  const clientKey = req.headers["x-groq-key"];

  if (path === "/api/analyze" && req.method === "POST") {
    let body;
    try {
      body = await readBody(req);
    } catch {
      return sendJson(res, 400, { detail: "Invalid JSON body" });
    }
    const userInput = (body.user_input || "").trim();
    if (!userInput) return sendJson(res, 422, { detail: "user_input is required" });
    if (userInput.length > 12000) return sendJson(res, 422, { detail: "Input too long" });

    const messages = buildAnalysisMessages(userInput, body.persona, body.history);
    try {
      const raw = await chatCompletion({
        messages,
        apiKey: clientKey || body.groq_key,
        temperature: 0.6,
        responseFormat: JSON_FORMAT,
      });
      const analysis = parseJsonResponse(raw);
      return sendJson(res, 200, { analysis });
    } catch (err) {
      const status = err instanceof GroqError ? 502 : 502;
      return sendJson(res, status, { detail: err.message });
    }
  }

  if (path === "/api/focus" && req.method === "POST") {
    let body;
    try {
      body = await readBody(req);
    } catch {
      return sendJson(res, 400, { detail: "Invalid JSON body" });
    }
    const userInput = (body.user_input || "").trim();
    if (!userInput) return sendJson(res, 422, { detail: "user_input is required" });

    const messages = buildFocusMessages(userInput);
    try {
      const raw = await chatCompletion({
        messages,
        apiKey: clientKey || body.groq_key,
        temperature: 0.5,
        responseFormat: JSON_FORMAT,
      });
      const focus = parseJsonResponse(raw);
      return sendJson(res, 200, { focus });
    } catch (err) {
      return sendJson(res, 502, { detail: err.message });
    }
  }

  if (path === "/api/followup" && req.method === "POST") {
    let body;
    try {
      body = await readBody(req);
    } catch {
      return sendJson(res, 400, { detail: "Invalid JSON body" });
    }
    const userInput = (body.user_input || "").trim();
    if (!userInput) return sendJson(res, 422, { detail: "user_input is required" });

    const messages = buildFollowupMessages(userInput, body.persona, body.history);
    try {
      const reply = await chatCompletion({
        messages,
        apiKey: clientKey || body.groq_key,
        temperature: 0.7,
      });
      return sendJson(res, 200, { reply });
    } catch (err) {
      return sendJson(res, 502, { detail: err.message });
    }
  }

  // ---- Companion model: emotionally intelligent conversation ----
  // Streams the reply live over Server-Sent Events so the UI can render it
  // with a typing effect, while keeping the hidden metadata block
  // (mood, quick replies, extracted memory) out of what's shown to the user.
  if (path === "/api/companion" && req.method === "POST") {
    let body;
    try {
      body = await readBody(req);
    } catch {
      return sendJson(res, 400, { detail: "Invalid JSON body" });
    }
    const userInput = (body.user_input || "").trim();
    if (!userInput) return sendJson(res, 422, { detail: "user_input is required" });

    const messages = buildCompanionMessages(
      userInput,
      body.persona,
      body.mode,
      body.history,
      body.memory_context,
    );

    res.statusCode = 200;
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    if (typeof res.flushHeaders === "function") res.flushHeaders();

    const sendEvent = (event, data) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    // The metadata delimiter could land split across two token chunks, so
    // we hold back a small tail of unsent text until we're sure it isn't
    // the start of the delimiter before flushing it to the client.
    const holdback = COMPANION_META_DELIMITER.length - 1;
    let sentLength = 0;
    let delimiterFound = false;

    try {
      const full = await streamChatCompletion({
        messages,
        apiKey: clientKey || body.groq_key,
        temperature: 0.8,
        onDelta: (_delta, fullSoFar) => {
          if (delimiterFound) return;
          const idx = fullSoFar.indexOf(COMPANION_META_DELIMITER);
          if (idx !== -1) {
            delimiterFound = true;
            if (sentLength < idx) {
              const chunk = fullSoFar.slice(sentLength, idx);
              if (chunk) sendEvent("delta", { text: chunk });
              sentLength = idx;
            }
            return;
          }
          const safeLength = Math.max(0, fullSoFar.length - holdback);
          if (safeLength > sentLength) {
            const chunk = fullSoFar.slice(sentLength, safeLength);
            sendEvent("delta", { text: chunk });
            sentLength = safeLength;
          }
        },
      });

      if (!delimiterFound && full.length > sentLength) {
        const idx = full.indexOf(COMPANION_META_DELIMITER);
        const cut = idx !== -1 ? idx : full.length;
        if (cut > sentLength) {
          sendEvent("delta", { text: full.slice(sentLength, cut) });
        }
      }

      const result = parseCompanionResponse(full);
      sendEvent("done", result);
    } catch (err) {
      sendEvent("error", { detail: err.message });
    } finally {
      res.end();
    }
    return;
  }

  // ---- Smart Goal Planner ----
  if (path === "/api/plan-goal" && req.method === "POST") {
    let body;
    try {
      body = await readBody(req);
    } catch {
      return sendJson(res, 400, { detail: "Invalid JSON body" });
    }
    const goalDescription = (body.goal_description || "").trim();
    if (!goalDescription) return sendJson(res, 422, { detail: "goal_description is required" });

    const messages = buildGoalPlannerMessages(
      goalDescription,
      body.deadline,
      body.hours_per_week,
      body.priority,
    );
    try {
      const raw = await chatCompletion({
        messages,
        apiKey: clientKey || body.groq_key,
        temperature: 0.6,
        responseFormat: JSON_FORMAT,
      });
      const plan = parseJsonResponse(raw);
      return sendJson(res, 200, { plan });
    } catch (err) {
      return sendJson(res, 502, { detail: err.message });
    }
  }

  // ---- AI Journal extraction ----
  if (path === "/api/extract-journal" && req.method === "POST") {
    let body;
    try {
      body = await readBody(req);
    } catch {
      return sendJson(res, 400, { detail: "Invalid JSON body" });
    }
    const conversationText = (body.conversation_text || "").trim();
    if (!conversationText) return sendJson(res, 422, { detail: "conversation_text is required" });

    const messages = buildJournalMessages(conversationText);
    try {
      const raw = await chatCompletion({
        messages,
        apiKey: clientKey || body.groq_key,
        temperature: 0.5,
        responseFormat: JSON_FORMAT,
      });
      const journal = parseJsonResponse(raw);
      return sendJson(res, 200, { journal });
    } catch (err) {
      return sendJson(res, 502, { detail: err.message });
    }
  }

  // ---- Proactive AI insights ----
  if (path === "/api/insights" && req.method === "POST") {
    let body;
    try {
      body = await readBody(req);
    } catch {
      return sendJson(res, 400, { detail: "Invalid JSON body" });
    }
    const contextSummary = (body.context_summary || "").trim();
    if (!contextSummary) return sendJson(res, 422, { detail: "context_summary is required" });

    const messages = buildInsightsMessages(contextSummary);
    try {
      const raw = await chatCompletion({
        messages,
        apiKey: clientKey || body.groq_key,
        temperature: 0.6,
        responseFormat: JSON_FORMAT,
      });
      const result = parseJsonResponse(raw);
      return sendJson(res, 200, { insights: result.insights || [] });
    } catch (err) {
      return sendJson(res, 502, { detail: err.message });
    }
  }

  // ---- Daily insight (for dashboard) ----
  if (path === "/api/daily-insight" && req.method === "POST") {
    let body;
    try {
      body = await readBody(req);
    } catch {
      return sendJson(res, 400, { detail: "Invalid JSON body" });
    }

    const messages = buildDailyInsightMessages(body.memory_context);
    try {
      const raw = await chatCompletion({
        messages,
        apiKey: clientKey || body.groq_key,
        temperature: 0.7,
        responseFormat: JSON_FORMAT,
      });
      const result = parseJsonResponse(raw);
      return sendJson(res, 200, { daily: result });
    } catch (err) {
      return sendJson(res, 502, { detail: err.message });
    }
  }

  // No route matched.
  return sendJson(res, 404, { detail: "Not found" });
}
