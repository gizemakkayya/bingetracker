import axios from 'axios';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_API_KEY = process.env.TMDB_API_KEY || 'c2936bcd9bcb057561090c318313aebc';

// Memory cache for TMDB responses
const cache = new Map<string, { data: any; expiresAt: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export class MediaService {
  private static async fetchTMDB(endpoint: string, params: Record<string, any> = {}) {
    const queryParams = new URLSearchParams({
      api_key: TMDB_API_KEY,
      language: 'tr-TR',
      ...params
    });

    const cacheKey = `${endpoint}?${queryParams.toString()}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }

    const response = await axios.get(`${TMDB_BASE}${endpoint}`, {
      params: {
        api_key: TMDB_API_KEY,
        language: 'tr-TR',
        ...params
      }
    });

    cache.set(cacheKey, {
      data: response.data,
      expiresAt: Date.now() + CACHE_TTL
    });

    return response.data;
  }

  static async search(query: string, page = 1) {
    const data = await this.fetchTMDB('/search/multi', { query, page, include_adult: false });
    return (data.results || []).filter((r: any) => r.media_type === 'movie' || r.media_type === 'tv');
  }

  static async getTrending(mediaType = 'all', timeWindow = 'week', page = 1) {
    const data = await this.fetchTMDB(`/trending/${mediaType}/${timeWindow}`, { page });
    return (data.results || []).map((r: any) => ({
      ...r,
      media_type: r.media_type || (mediaType === 'all' ? 'movie' : mediaType)
    }));
  }

  static async getDiscover(type = 'movie', genreId = '', page = 1) {
    const params: Record<string, any> = {
      sort_by: 'popularity.desc',
      page,
      ...(genreId ? { with_genres: genreId } : {})
    };
    const data = await this.fetchTMDB(`/discover/${type}`, params);
    return (data.results || []).map((r: any) => ({ ...r, media_type: type }));
  }

  static async getDetails(type: 'movie' | 'tv', id: number) {
    return this.fetchTMDB(`/${type}/${id}`);
  }

  static async getSeasonEpisodes(tvId: number, seasonNumber: number) {
    return this.fetchTMDB(`/tv/${tvId}/season/${seasonNumber}`);
  }
}
