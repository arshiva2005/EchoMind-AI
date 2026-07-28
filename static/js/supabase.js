// Supabase client singleton for EchoMind AI.
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---- Generic CRUD helpers ----

export async function fetchAll(table, { order = "created_at", ascending = false, limit = 100 } = {}) {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .order(order, { ascending })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function insertRow(table, row) {
  const { data, error } = await supabase.from(table).insert(row).select().single();
  if (error) throw error;
  return data;
}

export async function updateRow(table, id, patch) {
  const { data, error } = await supabase.from(table).update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteRow(table, id) {
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw error;
}

export async function getProfile() {
  const { data, error } = await supabase.from("user_profile").select("*").eq("id", 1).maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateProfile(patch) {
  const { data, error } = await supabase
    .from("user_profile")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", 1)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}
