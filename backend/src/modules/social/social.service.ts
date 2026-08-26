import { prisma } from '../../config/database.js';

export class SocialService {
  static async followUser(followerId: string, followingId: string) {
    if (followerId === followingId) {
      throw new Error('Kendinizi takip edemezsiniz.');
    }

    const targetUser = await prisma.user.findUnique({ where: { id: followingId } });
    if (!targetUser) throw new Error('Takip edilmek istenen kullanıcı bulunamadı.');

    const existing = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId
        }
      }
    });

    if (existing) {
      return { message: 'Zaten bu kullanıcıyı takip ediyorsunuz.', isFollowing: true };
    }

    await prisma.$transaction([
      prisma.follow.create({
        data: {
          followerId,
          followingId
        }
      }),
      prisma.notification.create({
        data: {
          userId: followingId,
          actorId: followerId,
          type: 'NEW_FOLLOWER',
          message: 'seni takip etmeye başladı.'
        }
      })
    ]);

    return { message: `${targetUser.username} takip edildi.`, isFollowing: true };
  }

  static async unfollowUser(followerId: string, followingId: string) {
    const existing = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId
        }
      }
    });

    if (!existing) {
      return { message: 'Bu kullanıcıyı zaten takip etmiyorsunuz.', isFollowing: false };
    }

    await prisma.follow.delete({
      where: {
        followerId_followingId: {
          followerId,
          followingId
        }
      }
    });

    return { message: 'Takipten çıkıldı.', isFollowing: false };
  }

  static async getFollowers(userId: string) {
    const followers = await prisma.follow.findMany({
      where: { followingId: userId },
      include: {
        follower: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            bio: true
          }
        }
      }
    });

    return followers.map(f => f.follower);
  }

  static async getFollowing(userId: string) {
    const following = await prisma.follow.findMany({
      where: { followerId: userId },
      include: {
        following: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            bio: true
          }
        }
      }
    });

    return following.map(f => f.following);
  }
}
