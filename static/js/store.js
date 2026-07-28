// Tiny localStorage-backed persistence for EchoMind AI.
const KEYS = {
  reflections: "echomind.reflections.v1",
  persona: "echomind.persona.v1",
  groqKey: "echomind.groqKey.v1",
  session: "echomind.session.v1",
};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or unavailable — ignore */
  }
}

function remove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export const store = {
  getPersona() {
    return read(KEYS.persona, "empathetic");
  },
  setPersona(id) {
    write(KEYS.persona, id);
  },

  getGroqKey() {
    return read(KEYS.groqKey, "") || "";
  },
  setGroqKey(key) {
    write(KEYS.groqKey, key);
  },
  clearGroqKey() {
    remove(KEYS.groqKey);
  },

  getSession() {
    return read(KEYS.session, []);
  },
  setSession(turns) {
    write(KEYS.session, turns);
  },
  clearSession() {
    remove(KEYS.session);
  },

  getReflections() {
    return read(KEYS.reflections, []);
  },
  saveReflection(entry) {
    const all = store.getReflections();
    all.unshift(entry);
    write(KEYS.reflections, all);
    return all;
  },
  deleteReflection(id) {
    const all = store.getReflections().filter((r) => r.id !== id);
    write(KEYS.reflections, all);
    return all;
  },
  clearReflections() {
    remove(KEYS.reflections);
  },
};
