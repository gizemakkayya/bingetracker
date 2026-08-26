import { prisma } from '../../config/database.js';

export class UserService {
  static async getProfileByUsername(username: string, currentUserId?: string) {
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        bio: true,
        createdAt: true,
        _count: {
          select: {
            watchlist: true,
            followers: true,
            following: true,
            reviews: true
          }
        },
        watchlist: {
          take: 12,
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            tmdbId: true,
            mediaType: true,
            title: true,
            posterPath: true,
            status: true,
            rating: true,
            currentSeason: true,
            currentEpisode: true
          }
        }
      }
    });

    if (!user) throw new Error('Kullanıcı bulunamadı.');

    let isFollowing = false;
    if (currentUserId && currentUserId !== user.id) {
      const follow = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUserId,
            followingId: user.id
          }
        }
      });
      isFollowing = !!follow;
    }

    return {
      ...user,
      isFollowing
    };
  }

  static async searchUsers(query: string, currentUserId?: string) {
    if (!query.trim()) return [];
    const users = await prisma.user.findMany({
      where: {
        username: {
          contains: query,
          mode: 'insensitive'
        }
      },
      take: 20,
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        bio: true,
        _count: {
          select: {
            followers: true,
            watchlist: true
          }
        }
      }
    });

    return users.filter(u => u.id !== currentUserId);
  }

  static async updateProfile(userId: string, data: { username?: string; bio?: string; avatarUrl?: string }) {
    if (data.username) {
      const existing = await prisma.user.findFirst({
        where: {
          username: data.username,
          NOT: { id: userId }
        }
      });
      if (existing) throw new Error('Bu kullanıcı adı zaten kullanılıyor.');
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.username ? { username: data.username } : {}),
        ...(data.bio !== undefined ? { bio: data.bio } : {}),
        ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl } : {})
      },
      select: {
        id: true,
        email: true,
        username: true,
        avatarUrl: true,
        bio: true,
        updatedAt: true
      }
    });

    return updated;
  }
}
