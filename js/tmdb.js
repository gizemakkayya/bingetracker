// ── TMDB API ─────────────────────────────────────────────────────────────────
// 📌 Ücretsiz TMDB API key alın:
// https://www.themoviedb.org/settings/api

const TMDB_API_KEY = 'c2936bcd9bcb057561090c318313aebc';
const TMDB_BASE    = 'https://api.themoviedb.org/3';
export const TMDB_IMG_BASE  = 'https://image.tmdb.org/t/p/w500';
export const TMDB_IMG_SMALL = 'https://image.tmdb.org/t/p/w185';

// Fast in-memory cache (5 min TTL)
const apiCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

export async function tmdbFetch(endpoint, params = {}) {
  const url = new URL(`${TMDB_BASE}${endpoint}`);
  url.searchParams.set('api_key', TMDB_API_KEY);
  url.searchParams.set('language', 'tr-TR');
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      url.searchParams.set(k, v);
    }
  });

  const cacheKey = url.toString();
  const cached = apiCache.get(cacheKey);
  if (cached && (Date.now() - cached.time < CACHE_TTL)) {
    return cached.data;
  }

  const res = await fetch(cacheKey);
  if (!res.ok) throw new Error(`TMDB error: ${res.status}`);
  const data = await res.json();

  apiCache.set(cacheKey, { data, time: Date.now() });
  return data;
}

// Search movies + TV combined
export async function searchMulti(query, page = 1) {
  const data = await tmdbFetch('/search/multi', { query, page, include_adult: false });
  return (data.results || []).filter(r => r.media_type === 'movie' || r.media_type === 'tv');
}

// Search movies only
export async function searchMovies(query, page = 1) {
  const data = await tmdbFetch('/search/movie', { query, page });
  return (data.results || []).map(r => ({ ...r, media_type: 'movie' }));
}

// Search TV only
export async function searchTV(query, page = 1) {
  const data = await tmdbFetch('/search/tv', { query, page });
  return (data.results || []).map(r => ({ ...r, media_type: 'tv' }));
}

// Discover by genre
export async function getDiscover(type = 'movie', genreId = '', page = 1) {
  const params = {
    sort_by: 'popularity.desc',
    page,
    ...(genreId ? { with_genres: genreId } : {})
  };
  const data = await tmdbFetch(`/discover/${type}`, params);
  return (data.results || []).map(r => ({ ...r, media_type: type }));
}

// Get movie details (with runtime, credits, watch providers, and external_ids)
export async function getMovieDetails(id) {
  return tmdbFetch(`/movie/${id}`, { append_to_response: 'credits,watch/providers,external_ids' });
}

// Get TV show details (with number_of_episodes, seasons, credits, watch providers, and external_ids)
export async function getTVDetails(id) {
  return tmdbFetch(`/tv/${id}`, { append_to_response: 'credits,watch/providers,external_ids' });
}

// Get TV season details
export async function getTVSeason(tvId, seasonNumber) {
  return tmdbFetch(`/tv/${tvId}/season/${seasonNumber}`);
}

// Trending
export async function getTrending(mediaType = 'all', timeWindow = 'week', page = 1) {
  const data = await tmdbFetch(`/trending/${mediaType}/${timeWindow}`, { page });
  return (data.results || []).map(r => ({
    ...r,
    media_type: r.media_type || (mediaType === 'all' ? 'movie' : mediaType)
  }));
}

// Genre lists
export async function getMovieGenres() {
  const data = await tmdbFetch('/genre/movie/list');
  return data.genres || []; // [{id, name}]
}
export async function getTVGenres() {
  const data = await tmdbFetch('/genre/tv/list');
  return data.genres || [];
}

// Map genre ids to names
export function mapGenres(genreIds, genreList) {
  return genreIds.map(id => {
    const g = genreList.find(g => g.id === id);
    return g ? g.name : '';
  }).filter(Boolean);
}

// Helpers
export function getPosterUrl(path, size = 'w500') {
  if (!path) return null;
  if (typeof path === 'string' && (path.startsWith('http://') || path.startsWith('https://'))) {
    return path;
  }
  const cleanPath = String(path).startsWith('/') ? String(path) : `/${path}`;
  return `https://image.tmdb.org/t/p/${size}${cleanPath}`;
}

export function getTitle(item) {
  return item.title || item.name || 'Bilinmiyor';
}

export function getYear(item) {
  const date = item.release_date || item.first_air_date;
  if (!date) return '';
  return new Date(date).getFullYear();
}
