// API client for the EchoMind backend.
import { store } from "./store.js";

function headers() {
  const h = { "Content-Type": "application/json" };
  const key = store.getGroqKey();
  if (key) h["X-Groq-Key"] = key;
  return h;
}

async function request(path, body) {
  let resp;
  try {
    resp = await fetch(path, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new Error("Network error — could not reach the EchoMind server.");
  }

  let data = null;
  const text = await resp.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON body */
  }

  if (!resp.ok) {
    const detail = data?.detail || data?.message || `Request failed (${resp.status})`;
    throw new Error(detail);
  }
  return data;
}

export const api = {
  async analyze(userInput, persona, history) {
    const data = await request("/api/analyze", { user_input: userInput, persona, history });
    return data.analysis;
  },

  async focus(userInput) {
    const data = await request("/api/focus", { user_input: userInput });
    return data.focus;
  },

  async followup(userInput, persona, history) {
    const data = await request("/api/followup", { user_input: userInput, persona, history });
    return data.reply;
  },

  async companion(userInput, persona, mode, history, memoryContext) {
    const data = await request("/api/companion", {
      user_input: userInput, persona, mode, history, memory_context: memoryContext,
    });
    return data.companion;
  },

  // Streams the companion reply live over SSE. Calls onDelta(text) as each
  // chunk of the reply arrives (for a typing effect), then onDone(result)
  // with the final metadata (mood, quick replies, extracted memory) once
  // the stream completes. onError(err) fires on any failure.
  async companionStream(userInput, persona, mode, history, memoryContext, { onDelta, onDone, onError } = {}) {
    let resp;
    try {
      resp = await fetch("/api/companion", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          user_input: userInput, persona, mode, history, memory_context: memoryContext,
        }),
      });
    } catch (err) {
      onError?.(new Error("Network error — could not reach the EchoMind server."));
      return;
    }

    if (!resp.ok || !resp.body) {
      let detail = `Request failed (${resp.status})`;
      try {
        const data = await resp.json();
        detail = data?.detail || data?.message || detail;
      } catch {
        /* non-JSON error body */
      }
      onError?.(new Error(detail));
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    const handleFrame = (frame) => {
      const lines = frame.split("\n");
      let event = "message";
      let dataStr = "";
      for (const line of lines) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) dataStr += line.slice(5).trim();
      }
      if (!dataStr) return;
      let data;
      try {
        data = JSON.parse(dataStr);
      } catch {
        return;
      }
      if (event === "delta") onDelta?.(data.text || "");
      else if (event === "done") onDone?.(data);
      else if (event === "error") onError?.(new Error(data.detail || "Something went wrong."));
    };

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";
        for (const frame of frames) {
          if (frame.trim()) handleFrame(frame);
        }
      }
      if (buffer.trim()) handleFrame(buffer);
    } catch (err) {
      onError?.(new Error(`Stream interrupted: ${err.message}`));
    }
  },

  async planGoal(goalDescription, deadline, hoursPerWeek, priority) {
    const data = await request("/api/plan-goal", {
      goal_description: goalDescription, deadline, hours_per_week: hoursPerWeek, priority,
    });
    return data.plan;
  },

  async extractJournal(conversationText) {
    const data = await request("/api/extract-journal", { conversation_text: conversationText });
    return data.journal;
  },

  async insights(contextSummary) {
    const data = await request("/api/insights", { context_summary: contextSummary });
    return data.insights;
  },

  async dailyInsight(memoryContext) {
    const data = await request("/api/daily-insight", { memory_context: memoryContext });
    return data.daily;
  },

  async health() {
    try {
      const resp = await fetch("/api/health");
      return await resp.json();
    } catch {
      return null;
    }
  },
};
