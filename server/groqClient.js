// Thin async wrapper around the Groq (OpenAI-compatible) chat completions API.
// Uses global fetch (Node 18+). The key is read from the environment first;
// clients may supply their own key per-request via the X-Groq-Key header
// (stored in the browser's localStorage) so the app works without
// server-side secrets.

import "dotenv/config";

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const GROQ_TIMEOUT_MS = 120000;

function resolveGroqKey(clientKey) {
  const key = (clientKey || "").trim();
  if (key) return key;
  return process.env.GROQ_API_KEY || "";
}

export class GroqError extends Error {}

export async function chatCompletion({
  messages,
  apiKey,
  model,
  temperature = 0.7,
  maxTokens = 4000,
  responseFormat = null,
}) {
  const key = resolveGroqKey(apiKey);
  if (!key) {
    throw new GroqError(
      "No Groq API key configured. Set GROQ_API_KEY on the server or add your key in Settings."
    );
  }

  const payload = {
    model: model || GROQ_MODEL,
    messages,
    temperature,
    max_tokens: maxTokens,
  };
  if (responseFormat) payload.response_format = responseFormat;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GROQ_TIMEOUT_MS);

  let resp;
  try {
    resp = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err.name === "AbortError") {
      throw new GroqError("Request to Groq timed out.");
    }
    throw new GroqError(`Network error contacting Groq: ${err.message}`);
  }
  clearTimeout(timer);

  if (resp.status >= 400) {
    let detail = "";
    try {
      const data = await resp.json();
      detail = data?.error?.message || JSON.stringify(data);
    } catch {
      detail = await resp.text().catch(() => "");
    }
    throw new GroqError(`Groq API error (${resp.status}): ${detail}`);
  }

  let data;
  try {
    data = await resp.json();
  } catch (err) {
    throw new GroqError(`Unexpected Groq response shape: ${err.message}`);
  }

  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new GroqError(`Unexpected Groq response shape: ${JSON.stringify(data).slice(0, 200)}`);
  }
  return content;
}

// Streaming variant used for live, typing-effect conversation. Reads the
// Groq SSE stream and invokes onDelta(deltaText, fullSoFar) for every token
// chunk as it arrives. Resolves with the full accumulated text once the
// stream completes. Falls back gracefully if the connection or parsing
// hiccups mid-stream — partial text already delivered to the caller is not
// lost.
export async function streamChatCompletion({
  messages,
  apiKey,
  model,
  temperature = 0.7,
  maxTokens = 4000,
  onDelta,
}) {
  const key = resolveGroqKey(apiKey);
  if (!key) {
    throw new GroqError(
      "No Groq API key configured. Set GROQ_API_KEY on the server or add your key in Settings."
    );
  }

  const payload = {
    model: model || GROQ_MODEL,
    messages,
    temperature,
    max_tokens: maxTokens,
    stream: true,
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GROQ_TIMEOUT_MS);

  let resp;
  try {
    resp = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err.name === "AbortError") {
      throw new GroqError("Request to Groq timed out.");
    }
    throw new GroqError(`Network error contacting Groq: ${err.message}`);
  }

  if (resp.status >= 400) {
    clearTimeout(timer);
    let detail = "";
    try {
      const data = await resp.json();
      detail = data?.error?.message || JSON.stringify(data);
    } catch {
      detail = await resp.text().catch(() => "");
    }
    throw new GroqError(`Groq API error (${resp.status}): ${detail}`);
  }

  if (!resp.body) {
    clearTimeout(timer);
    throw new GroqError("Groq response had no readable stream body.");
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || !line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (data === "[DONE]") continue;
        let json;
        try {
          json = JSON.parse(data);
        } catch {
          continue; // ignore partial/malformed SSE frames
        }
        const delta = json?.choices?.[0]?.delta?.content;
        if (delta) {
          full += delta;
          if (onDelta) onDelta(delta, full);
        }
      }
    }
  } catch (err) {
    if (!full) {
      throw new GroqError(`Stream interrupted: ${err.message}`);
    }
    // Partial content already streamed to the client — return what we have.
  } finally {
    clearTimeout(timer);
  }

  if (!full) {
    throw new GroqError("Empty response from Groq.");
  }
  return full;
}
