import { prisma } from '../../config/database.js';

export class FeedService {
  static async getFriendsFeed(userId: string, limit = 30) {
    // 1. Get list of user IDs that current user is following
    const following = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true }
    });

    const followingIds = following.map(f => f.followingId);

    // Include user's own activities as well
    const targetUserIds = [...followingIds, userId];

    const activities = await prisma.activity.findMany({
      where: {
        userId: { in: targetUserIds }
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true
          }
        }
      }
    });

    return activities;
  }

  static async getGlobalFeed(limit = 20) {
    const activities = await prisma.activity.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true
          }
        }
      }
    });

    return activities;
  }
}
