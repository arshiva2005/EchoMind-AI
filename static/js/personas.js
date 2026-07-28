// Persona catalog — mirrors the backend definitions for UI rendering.
export const PERSONAS = [
  { id: "empathetic", name: "Supportive Friend", emoji: "\u2764\uFE0F", desc: "Warm, supportive and emotionally understanding." },
  { id: "therapist", name: "Therapist", emoji: "\uD83C\uDF33", desc: "Calm, reflective and grounded in therapeutic practice." },
  { id: "logical", name: "Logical Mentor", emoji: "\uD83E\uDDE0", desc: "Objective, analytical and practical." },
  { id: "career", name: "Career Coach", emoji: "\uD83C\uDFAF", desc: "Focused on goals, productivity and career growth." },
  { id: "productivity", name: "Productivity Coach", emoji: "\u26A1", desc: "Systems-focused, practical, helps build sustainable habits." },
  { id: "motivational", name: "Motivator", emoji: "\uD83D\uDE80", desc: "Energetic, encouraging and action-oriented." },
];

export function personaById(id) {
  return PERSONAS.find((p) => p.id === id) || PERSONAS[0];
}
