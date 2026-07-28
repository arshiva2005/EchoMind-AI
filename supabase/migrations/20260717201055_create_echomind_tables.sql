/*
# EchoMind AI — Core data tables for premium AI companion

## Overview
Creates the persistence layer for EchoMind's upgraded features: long-term AI memory,
Smart Goal Planner, AI Journal, Life Dashboard, proactive insights, and mood tracking.
This is a single-tenant app (no sign-in) so all policies use `TO anon, authenticated`.

## New Tables

1. **reflections** — Stores saved analysis results from the Analyze page.
   - id (uuid PK), date, input_text, mood_score, primary_emotion, secondary_emotion,
     thought_patterns (jsonb), reflection_summary, root_cause, action_plan (jsonb),
     mind_map (jsonb), motivational_insight, persona, conversation_mode (vent/solve/both)

2. **conversations** — Full conversation transcripts for AI memory.
   - id (uuid PK), reflection_id (FK nullable), persona, mode, turns (jsonb array),
     created_at, updated_at, summary, extracted_emotions (jsonb), key_topics (jsonb)

3. **goals** — Smart Goal Planner roadmaps.
   - id (uuid PK), title, description, deadline (date), priority (1-5),
     available_hours_per_week, status (active/completed/paused), created_at, completed_at

4. **milestones** — Milestones within a goal roadmap.
   - id (uuid PK), goal_id (FK), title, description, order_index, target_date,
     completed (bool), completed_at

5. **daily_tasks** — Daily tasks generated from goals/milestones.
   - id (uuid PK), goal_id (FK nullable), milestone_id (FK nullable), title, description,
     scheduled_date, completed (bool), completed_at, estimated_minutes

6. **journal_entries** — AI Journal auto-extracted from conversations.
   - id (uuid PK), conversation_id (FK nullable), date, emotions (jsonb), key_events (jsonb),
     lessons_learned (jsonb), growth_notes, mood_score, raw_text, ai_generated (bool)

7. **mood_logs** — Discrete mood check-ins for trend tracking.
   - id (uuid PK), score (1-10), emotion, note, logged_at, source (checkin/conversation/journal)

8. **insights** — Proactive AI-generated insights (weekly, burnout, patterns).
   - id (uuid PK), type (weekly/burnout/pattern/encouragement/checkin), title, body,
     severity (info/warning/critical), data (jsonb), created_at, dismissed (bool)

9. **user_profile** — Single-row table for user preferences and memory context.
   - id (int PK, always 1), name, preferred_persona, goals_summary (jsonb),
     habits (jsonb), preferences (jsonb), streak_data (jsonb), created_at, updated_at

## Security
- RLS enabled on all tables.
- All policies use `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)`
  because this is a single-tenant no-auth app with intentionally shared data.

## Important Notes
1. user_profile is constrained to a single row (id = 1) via CHECK constraint.
2. All jsonb columns default to empty arrays/objects for safe access.
3. Foreign keys use ON DELETE CASCADE so child rows clean up automatically.
4. Indexes added for frequently-queried columns (date, goal_id, conversation_id, etc.).
*/

-- reflections
CREATE TABLE IF NOT EXISTS reflections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date timestamptz DEFAULT now(),
  input_text text NOT NULL DEFAULT '',
  mood_score int DEFAULT 5,
  primary_emotion text DEFAULT '',
  secondary_emotion text DEFAULT '',
  thought_patterns jsonb DEFAULT '[]'::jsonb,
  reflection_summary text DEFAULT '',
  root_cause text DEFAULT '',
  action_plan jsonb DEFAULT '{}'::jsonb,
  mind_map jsonb DEFAULT '{}'::jsonb,
  motivational_insight text DEFAULT '',
  persona text DEFAULT 'empathetic',
  conversation_mode text DEFAULT 'both'
);
ALTER TABLE reflections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_reflections" ON reflections;
CREATE POLICY "anon_select_reflections" ON reflections FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_reflections" ON reflections;
CREATE POLICY "anon_insert_reflections" ON reflections FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_reflections" ON reflections;
CREATE POLICY "anon_update_reflections" ON reflections FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_reflections" ON reflections;
CREATE POLICY "anon_delete_reflections" ON reflections FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_reflections_date ON reflections (date DESC);

-- conversations
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reflection_id uuid REFERENCES reflections(id) ON DELETE SET NULL,
  persona text DEFAULT 'empathetic',
  mode text DEFAULT 'both',
  turns jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  summary text DEFAULT '',
  extracted_emotions jsonb DEFAULT '[]'::jsonb,
  key_topics jsonb DEFAULT '[]'::jsonb
);
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_conversations" ON conversations;
CREATE POLICY "anon_select_conversations" ON conversations FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_conversations" ON conversations;
CREATE POLICY "anon_insert_conversations" ON conversations FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_conversations" ON conversations;
CREATE POLICY "anon_update_conversations" ON conversations FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_conversations" ON conversations;
CREATE POLICY "anon_delete_conversations" ON conversations FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_conversations_created ON conversations (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_reflection ON conversations (reflection_id);

-- goals
CREATE TABLE IF NOT EXISTS goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  description text DEFAULT '',
  deadline date,
  priority int DEFAULT 3,
  available_hours_per_week numeric DEFAULT 5,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_goals" ON goals;
CREATE POLICY "anon_select_goals" ON goals FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_goals" ON goals;
CREATE POLICY "anon_insert_goals" ON goals FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_goals" ON goals;
CREATE POLICY "anon_update_goals" ON goals FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_goals" ON goals;
CREATE POLICY "anon_delete_goals" ON goals FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals (status);
CREATE INDEX IF NOT EXISTS idx_goals_deadline ON goals (deadline);

-- milestones
CREATE TABLE IF NOT EXISTS milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  description text DEFAULT '',
  order_index int DEFAULT 0,
  target_date date,
  completed boolean DEFAULT false,
  completed_at timestamptz
);
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_milestones" ON milestones;
CREATE POLICY "anon_select_milestones" ON milestones FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_milestones" ON milestones;
CREATE POLICY "anon_insert_milestones" ON milestones FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_milestones" ON milestones;
CREATE POLICY "anon_update_milestones" ON milestones FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_milestones" ON milestones;
CREATE POLICY "anon_delete_milestones" ON milestones FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_milestones_goal ON milestones (goal_id);

-- daily_tasks
CREATE TABLE IF NOT EXISTS daily_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid REFERENCES goals(id) ON DELETE CASCADE,
  milestone_id uuid REFERENCES milestones(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT '',
  description text DEFAULT '',
  scheduled_date date DEFAULT CURRENT_DATE,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  estimated_minutes int DEFAULT 30
);
ALTER TABLE daily_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_daily_tasks" ON daily_tasks;
CREATE POLICY "anon_select_daily_tasks" ON daily_tasks FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_daily_tasks" ON daily_tasks;
CREATE POLICY "anon_insert_daily_tasks" ON daily_tasks FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_daily_tasks" ON daily_tasks;
CREATE POLICY "anon_update_daily_tasks" ON daily_tasks FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_daily_tasks" ON daily_tasks;
CREATE POLICY "anon_delete_daily_tasks" ON daily_tasks FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_daily_tasks_date ON daily_tasks (scheduled_date);
CREATE INDEX IF NOT EXISTS idx_daily_tasks_goal ON daily_tasks (goal_id);

-- journal_entries
CREATE TABLE IF NOT EXISTS journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE SET NULL,
  date timestamptz DEFAULT now(),
  emotions jsonb DEFAULT '[]'::jsonb,
  key_events jsonb DEFAULT '[]'::jsonb,
  lessons_learned jsonb DEFAULT '[]'::jsonb,
  growth_notes text DEFAULT '',
  mood_score int DEFAULT 5,
  raw_text text DEFAULT '',
  ai_generated boolean DEFAULT true
);
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_journal" ON journal_entries;
CREATE POLICY "anon_select_journal" ON journal_entries FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_journal" ON journal_entries;
CREATE POLICY "anon_insert_journal" ON journal_entries FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_journal" ON journal_entries;
CREATE POLICY "anon_update_journal" ON journal_entries FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_journal" ON journal_entries;
CREATE POLICY "anon_delete_journal" ON journal_entries FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_journal_date ON journal_entries (date DESC);

-- mood_logs
CREATE TABLE IF NOT EXISTS mood_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  score int DEFAULT 5,
  emotion text DEFAULT '',
  note text DEFAULT '',
  logged_at timestamptz DEFAULT now(),
  source text DEFAULT 'checkin'
);
ALTER TABLE mood_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_mood_logs" ON mood_logs;
CREATE POLICY "anon_select_mood_logs" ON mood_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_mood_logs" ON mood_logs;
CREATE POLICY "anon_insert_mood_logs" ON mood_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_mood_logs" ON mood_logs;
CREATE POLICY "anon_update_mood_logs" ON mood_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_mood_logs" ON mood_logs;
CREATE POLICY "anon_delete_mood_logs" ON mood_logs FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_mood_logs_logged ON mood_logs (logged_at DESC);

-- insights
CREATE TABLE IF NOT EXISTS insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text DEFAULT 'info',
  title text DEFAULT '',
  body text DEFAULT '',
  severity text DEFAULT 'info',
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  dismissed boolean DEFAULT false
);
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_insights" ON insights;
CREATE POLICY "anon_select_insights" ON insights FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_insights" ON insights;
CREATE POLICY "anon_insert_insights" ON insights FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_insights" ON insights;
CREATE POLICY "anon_update_insights" ON insights FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_insights" ON insights;
CREATE POLICY "anon_delete_insights" ON insights FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_insights_created ON insights (created_at DESC);

-- user_profile (single-row)
CREATE TABLE IF NOT EXISTS user_profile (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  name text DEFAULT '',
  preferred_persona text DEFAULT 'empathetic',
  goals_summary jsonb DEFAULT '[]'::jsonb,
  habits jsonb DEFAULT '[]'::jsonb,
  preferences jsonb DEFAULT '{}'::jsonb,
  streak_data jsonb DEFAULT '{"current": 0, "longest": 0, "last_active": null}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE user_profile ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_profile" ON user_profile;
CREATE POLICY "anon_select_profile" ON user_profile FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_profile" ON user_profile;
CREATE POLICY "anon_insert_profile" ON user_profile FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_profile" ON user_profile;
CREATE POLICY "anon_update_profile" ON user_profile FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_profile" ON user_profile;
CREATE POLICY "anon_delete_profile" ON user_profile FOR DELETE TO anon, authenticated USING (true);

-- Seed the single user_profile row
INSERT INTO user_profile (id) VALUES (1) ON CONFLICT (id) DO NOTHING;