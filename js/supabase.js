// ── Supabase Client ──────────────────────────────────────────────────────────
// 📌 Supabase projenizden alın:
// https://supabase.com → Project Settings → API

const SUPABASE_URL  = 'https://dbgbppyaiofojhhpabie.supabase.co';
const SUPABASE_ANON = 'sb_publishable_EMLgRemblSj19Gggs8WSZA_0IovkGfT';

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// ── Auth helpers ─────────────────────────────────────────────────────────────
export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function getUser() {
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) return null;
  return data;
}
