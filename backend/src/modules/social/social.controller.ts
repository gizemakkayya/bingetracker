import { Response } from 'express';
import { SocialService } from './social.service.js';
import { sendSuccess, sendError } from '../../shared/utils/response.js';
import { AuthRequest } from '../../shared/middleware/auth.middleware.js';

export class SocialController {
  static async follow(req: AuthRequest, res: Response) {
    try {
      const followerId = req.user?.id;
      const { userId: followingId } = req.params;

      if (!followerId) return sendError(res, 'Yetkisiz erişim.', 401);
      if (!followingId) return sendError(res, 'Kullanıcı ID zorunludur.', 400);

      const result = await SocialService.followUser(followerId, followingId);
      return sendSuccess(res, result, result.message);
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  static async unfollow(req: AuthRequest, res: Response) {
    try {
      const followerId = req.user?.id;
      const { userId: followingId } = req.params;

      if (!followerId) return sendError(res, 'Yetkisiz erişim.', 401);
      if (!followingId) return sendError(res, 'Kullanıcı ID zorunludur.', 400);

      const result = await SocialService.unfollowUser(followerId, followingId);
      return sendSuccess(res, result, result.message);
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  static async getFollowers(req: AuthRequest, res: Response) {
    try {
      const { userId } = req.params;
      const targetId = userId === 'me' ? req.user?.id : userId;
      if (!targetId) return sendError(res, 'Kullanıcı bulunamadı.', 400);

      const followers = await SocialService.getFollowers(targetId);
      return sendSuccess(res, followers, 'Takipçiler getirildi.');
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  }

  static async getFollowing(req: AuthRequest, res: Response) {
    try {
      const { userId } = req.params;
      const targetId = userId === 'me' ? req.user?.id : userId;
      if (!targetId) return sendError(res, 'Kullanıcı bulunamadı.', 400);

      const following = await SocialService.getFollowing(targetId);
      return sendSuccess(res, following, 'Takip edilenler getirildi.');
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  }
}
