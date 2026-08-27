// ── Auth logic ────────────────────────────────────────────────────────────────
import { supabase } from './supabase.js';

// ── Sign Up ──────────────────────────────────────────────────────────────────
export async function signUp({ email, password, username }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username }
    }
  });
  if (error) throw error;

  // Create profile row
  if (data.user) {
    await supabase.from('profiles').upsert({
      id: data.user.id,
      username: username || email.split('@')[0],
      created_at: new Date().toISOString()
    });
  }
  return data;
}

// ── Sign In ──────────────────────────────────────────────────────────────────
export async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;

  if (data?.user) {
    const rawUsername = data.user.user_metadata?.username || email.split('@')[0] || 'kullanici';
    try {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        username: rawUsername.toLowerCase().replace(/\s+/g, ''),
        created_at: new Date().toISOString()
      });
    } catch (e) {}
  }

  return data;
}

// ── Sign Out ─────────────────────────────────────────────────────────────────
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// ── Update Profile ───────────────────────────────────────────────────────────
export async function updateProfile(userId, updates = {}) {
  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      ...updates
    });
  if (error) throw error;
}

// ── Update Password ──────────────────────────────────────────────────────────
export async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

// ── Auth state change listener ───────────────────────────────────────────────
export function onAuthChange(callback) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}
