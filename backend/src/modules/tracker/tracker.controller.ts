import { Response } from 'express';
import { TrackerService } from './tracker.service.js';
import { sendSuccess, sendError } from '../../shared/utils/response.js';
import { AuthRequest } from '../../shared/middleware/auth.middleware.js';

export class TrackerController {
  static async getList(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return sendError(res, 'Yetkisiz erişim.', 401);

      const status = req.query.status as string;
      const items = await TrackerService.getWatchlist(userId, status);
      return sendSuccess(res, items, 'İzleme listesi getirildi.');
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  }

  static async saveItem(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return sendError(res, 'Yetkisiz erişim.', 401);

      const item = await TrackerService.addOrUpdateItem(userId, req.body);
      return sendSuccess(res, item, 'İçerik kaydedildi.');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  static async markEpisode(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return sendError(res, 'Yetkisiz erişim.', 401);

      const { itemId } = req.params;
      const { seasonNumber, episodeNumber } = req.body;

      if (!seasonNumber || !episodeNumber) {
        return sendError(res, 'Sezon ve bölüm numarası gereklidir.', 400);
      }

      const updated = await TrackerService.markEpisodeWatched(userId, itemId, Number(seasonNumber), Number(episodeNumber));
      return sendSuccess(res, updated, 'Bölüm izlendi olarak işaretlendi.');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  static async deleteItem(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return sendError(res, 'Yetkisiz erişim.', 401);

      const { itemId } = req.params;
      const result = await TrackerService.deleteItem(userId, itemId);
      return sendSuccess(res, result, result.message);
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  static async getStats(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return sendError(res, 'Yetkisiz erişim.', 401);

      const stats = await TrackerService.getStats(userId);
      return sendSuccess(res, stats, 'İstatistikler getirildi.');
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  }
}
