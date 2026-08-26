import { prisma } from '../../config/database.js';

export interface WatchlistPayload {
  tmdbId: number;
  mediaType: string;
  title: string;
  posterPath?: string;
  status: string;
  rating?: number;
  notes?: string;
  currentSeason?: number;
  currentEpisode?: number;
  totalSeasons?: number;
  totalEpisodes?: number;
  runtimeMinutes?: number;
}

export class TrackerService {
  static async getWatchlist(userId: string, status?: string) {
    const items = await prisma.watchlistItem.findMany({
      where: {
        userId,
        ...(status ? { status } : {})
      },
      include: {
        episodesWatched: {
          orderBy: [{ seasonNumber: 'asc' }, { episodeNumber: 'asc' }]
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    return items;
  }

  static async addOrUpdateItem(userId: string, payload: WatchlistPayload) {
    const existing = await prisma.watchlistItem.findUnique({
      where: {
        userId_tmdbId_mediaType: {
          userId,
          tmdbId: payload.tmdbId,
          mediaType: payload.mediaType
        }
      }
    });

    let item;
    if (existing) {
      item = await prisma.watchlistItem.update({
        where: { id: existing.id },
        data: {
          status: payload.status,
          rating: payload.rating !== undefined ? payload.rating : existing.rating,
          notes: payload.notes !== undefined ? payload.notes : existing.notes,
          currentSeason: payload.currentSeason ?? existing.currentSeason,
          currentEpisode: payload.currentEpisode ?? existing.currentEpisode,
          totalSeasons: payload.totalSeasons ?? existing.totalSeasons,
          totalEpisodes: payload.totalEpisodes ?? existing.totalEpisodes,
          runtimeMinutes: payload.runtimeMinutes ?? existing.runtimeMinutes
        }
      });
    } else {
      item = await prisma.watchlistItem.create({
        data: {
          userId,
          tmdbId: payload.tmdbId,
          mediaType: payload.mediaType,
          title: payload.title,
          posterPath: payload.posterPath,
          status: payload.status,
          rating: payload.rating,
          notes: payload.notes,
          currentSeason: payload.currentSeason ?? 1,
          currentEpisode: payload.currentEpisode ?? 1,
          totalSeasons: payload.totalSeasons,
          totalEpisodes: payload.totalEpisodes,
          runtimeMinutes: payload.runtimeMinutes
        }
      });

      // Emit Social Activity
      await prisma.activity.create({
        data: {
          userId,
          type: payload.mediaType === 'tv' ? 'STARTED_SERIES' : 'WATCHED_MOVIE',
          mediaTitle: payload.title,
          tmdbId: payload.tmdbId,
          mediaType: payload.mediaType,
          posterPath: payload.posterPath
        }
      });
    }

    return item;
  }

  static async markEpisodeWatched(userId: string, itemId: string, seasonNumber: number, episodeNumber: number) {
    const item = await prisma.watchlistItem.findFirst({
      where: { id: itemId, userId }
    });
    if (!item) throw new Error('İzleme listesi içeriği bulunamadı.');

    // Upsert watched episode
    await prisma.watchedEpisode.upsert({
      where: {
        watchlistItemId_seasonNumber_episodeNumber: {
          watchlistItemId: itemId,
          seasonNumber,
          episodeNumber
        }
      },
      create: {
        watchlistItemId: itemId,
        seasonNumber,
        episodeNumber
      },
      update: {
        watchedAt: new Date()
      }
    });

    // Update current season/episode on item
    const updated = await prisma.watchlistItem.update({
      where: { id: itemId },
      data: {
        currentSeason: seasonNumber,
        currentEpisode: episodeNumber,
        status: 'watching'
      }
    });

    // Create Social Activity
    await prisma.activity.create({
      data: {
        userId,
        type: 'WATCHED_EPISODE',
        mediaTitle: item.title,
        tmdbId: item.tmdbId,
        mediaType: item.mediaType,
        seasonNum: seasonNumber,
        episodeNum: episodeNumber,
        posterPath: item.posterPath
      }
    });

    return updated;
  }

  static async deleteItem(userId: string, itemId: string) {
    const item = await prisma.watchlistItem.findFirst({
      where: { id: itemId, userId }
    });
    if (!item) throw new Error('İçerik bulunamadı.');

    await prisma.watchlistItem.delete({
      where: { id: itemId }
    });

    return { message: 'İçerik listeden kaldırıldı.' };
  }

  static async getStats(userId: string) {
    const items = await prisma.watchlistItem.findMany({
      where: { userId }
    });

    const movies = items.filter(i => i.mediaType === 'movie');
    const tvShows = items.filter(i => i.mediaType === 'tv');
    const watched = items.filter(i => i.status === 'watched');
    const watching = items.filter(i => i.status === 'watching');
    const watchlist = items.filter(i => i.status === 'watchlist');

    let totalMinutes = 0;
    watched.forEach(i => {
      if (i.runtimeMinutes) totalMinutes += i.runtimeMinutes;
    });

    return {
      total: items.length,
      totalMovies: movies.length,
      totalTV: tvShows.length,
      totalWatched: watched.length,
      totalWatching: watching.length,
      totalWatchlist: watchlist.length,
      totalHours: Math.round(totalMinutes / 60)
    };
  }
}
