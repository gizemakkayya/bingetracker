import { Response } from 'express';
import { FeedService } from './feed.service.js';
import { sendSuccess, sendError } from '../../shared/utils/response.js';
import { AuthRequest } from '../../shared/middleware/auth.middleware.js';

export class FeedController {
  static async getFeed(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return sendError(res, 'Yetkisiz erişim.', 401);

      const limit = parseInt(req.query.limit as string) || 30;
      const feed = await FeedService.getFriendsFeed(userId, limit);
      return sendSuccess(res, feed, 'Sosyal akış getirildi.');
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  }

  static async getGlobal(req: AuthRequest, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const feed = await FeedService.getGlobalFeed(limit);
      return sendSuccess(res, feed, 'Genel akış getirildi.');
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  }
}
