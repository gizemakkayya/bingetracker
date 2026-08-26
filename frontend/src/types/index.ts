export interface User {
  id: string;
  email: string;
  username: string;
  avatarUrl?: string | null;
  bio?: string | null;
  createdAt: string;
  _count?: {
    watchlist?: number;
    followers?: number;
    following?: number;
    reviews?: number;
  };
}

export interface WatchlistItem {
  id: string;
  userId: string;
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  title: string;
  posterPath?: string | null;
  status: 'watchlist' | 'watching' | 'watched' | 'dropped';
  rating?: number | null;
  notes?: string | null;
  currentSeason?: number | null;
  currentEpisode?: number | null;
  totalSeasons?: number | null;
  totalEpisodes?: number | null;
  runtimeMinutes?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  userId: string;
  type: 'WATCHED_EPISODE' | 'WATCHED_MOVIE' | 'RATED' | 'REVIEWED' | 'STARTED_SERIES';
  mediaTitle: string;
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  seasonNum?: number | null;
  episodeNum?: number | null;
  ratingVal?: number | null;
  reviewText?: string | null;
  posterPath?: string | null;
  createdAt: string;
  user: {
    id: string;
    username: string;
    avatarUrl?: string | null;
  };
}

export interface TMDBMediaItem {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  media_type?: 'movie' | 'tv';
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  vote_count?: number;
  imdb_id?: string | null;
  external_ids?: {
    imdb_id?: string | null;
    tvdb_id?: number | null;
    wikidata_id?: string | null;
  };
  runtime?: number;
  number_of_seasons?: number;
  number_of_episodes?: number;
  genres?: Array<{ id: number; name: string }>;
  credits?: {
    cast?: Array<{
      id: number;
      name: string;
      character?: string;
      profile_path: string | null;
    }>;
  };
  seasons?: Array<{
    id: number;
    name: string;
    season_number: number;
    episode_count: number;
    poster_path: string | null;
  }>;
  'watch/providers'?: {
    results?: {
      [countryCode: string]: {
        link?: string;
        flatrate?: Array<{
          logo_path: string | null;
          provider_id: number;
          provider_name: string;
        }>;
        rent?: Array<{
          logo_path: string | null;
          provider_id: number;
          provider_name: string;
        }>;
        buy?: Array<{
          logo_path: string | null;
          provider_id: number;
          provider_name: string;
        }>;
        free?: Array<{
          logo_path: string | null;
          provider_id: number;
          provider_name: string;
        }>;
        ads?: Array<{
          logo_path: string | null;
          provider_id: number;
          provider_name: string;
        }>;
      };
    };
  };
}

export interface TMDBEpisode {
  id: number;
  episode_number: number;
  name: string;
  overview: string;
  still_path: string | null;
  runtime: number | null;
  air_date: string | null;
  vote_average: number;
}
