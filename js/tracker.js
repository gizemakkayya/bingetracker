// ── Watchlist CRUD ────────────────────────────────────────────────────────────
import { supabase } from './supabase.js';

// ── Fetch all items for current user ─────────────────────────────────────────
export async function fetchWatchlist(userId) {
  const { data, error } = await supabase
    .from('watchlist')
    .select('*')
    .eq('user_id', userId)
    .order('added_at', { ascending: false });
  if (error) throw error;
  return data;
}

// ── Check if item already exists ─────────────────────────────────────────────
export async function checkExists(userId, tmdbId, mediaType) {
  const { data } = await supabase
    .from('watchlist')
    .select('id, status')
    .eq('user_id', userId)
    .eq('tmdb_id', tmdbId)
    .eq('media_type', mediaType)
    .maybeSingle();
  return data;
}

// ── Add item to watchlist ─────────────────────────────────────────────────────
export async function addToWatchlist(userId, item) {
  const { data, error } = await supabase
    .from('watchlist')
    .insert({
      user_id: userId,
      tmdb_id: item.tmdb_id,
      media_type: item.media_type,     // 'movie' | 'tv'
      title: item.title,
      poster_path: item.poster_path || null,
      genres: item.genres || [],
      status: item.status || 'watchlist',
      rating: item.rating || null,
      notes: item.notes || '',
      current_season: item.current_season || null,
      current_episode: item.current_episode || null,
      total_seasons: item.total_seasons || null,
      total_episodes: item.total_episodes || null,
      runtime_minutes: item.runtime_minutes || null,
      added_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Update item ───────────────────────────────────────────────────────────────
export async function updateWatchlistItem(itemId, updates) {
  const { data, error } = await supabase
    .from('watchlist')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', itemId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Delete item ───────────────────────────────────────────────────────────────
export async function deleteWatchlistItem(itemId) {
  const { error } = await supabase
    .from('watchlist')
    .delete()
    .eq('id', itemId);
  if (error) throw error;
}

// ── Fetch stats aggregated ────────────────────────────────────────────────────
export async function fetchStats(userId) {
  const { data, error } = await supabase
    .from('watchlist')
    .select('*')
    .eq('user_id', userId);
  if (error) throw error;
  return computeStats(data || []);
}

function computeStats(items) {
  const movies = items.filter(i => i.media_type === 'movie');
  const tvShows = items.filter(i => i.media_type === 'tv');
  const watched = items.filter(i => i.status === 'watched');
  const watching = items.filter(i => i.status === 'watching');
  const watchlist = items.filter(i => i.status === 'watchlist');

  // Total runtime (minutes)
  let totalMinutes = 0;
  watched.forEach(item => {
    if (item.runtime_minutes) totalMinutes += item.runtime_minutes;
  });

  // Genre distribution
  const genreCount = {};
  items.forEach(item => {
    (item.genres || []).forEach(g => {
      genreCount[g] = (genreCount[g] || 0) + 1;
    });
  });
  const genreData = Object.entries(genreCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));

  // Monthly activity (last 6 months)
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      label: d.toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' }),
      year: d.getFullYear(),
      month: d.getMonth(),
      count: 0
    });
  }
  watched.forEach(item => {
    const d = new Date(item.updated_at || item.added_at);
    const m = months.find(m => m.year === d.getFullYear() && m.month === d.getMonth());
    if (m) m.count++;
  });

  // Top rated
  const topRated = items
    .filter(i => i.rating)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 5);

  return {
    total: items.length,
    totalMovies: movies.length,
    totalTV: tvShows.length,
    totalWatched: watched.length,
    totalWatching: watching.length,
    totalWatchlist: watchlist.length,
    totalHours: Math.round(totalMinutes / 60),
    genreData,
    monthlyData: months,
    topRated
  };
}
