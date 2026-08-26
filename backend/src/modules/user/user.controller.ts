import { Request, Response } from 'express';
import { UserService } from './user.service.js';
import { sendSuccess, sendError } from '../../shared/utils/response.js';
import { AuthRequest } from '../../shared/middleware/auth.middleware.js';

export class UserController {
  static async getProfile(req: AuthRequest, res: Response) {
    try {
      const { username } = req.params;
      const currentUserId = req.user?.id;
      const profile = await UserService.getProfileByUsername(username, currentUserId);
      return sendSuccess(res, profile, 'Profil bilgisi getirildi.');
    } catch (error: any) {
      return sendError(res, error.message, 404);
    }
  }

  static async search(req: AuthRequest, res: Response) {
    try {
      const query = (req.query.q as string) || '';
      const currentUserId = req.user?.id;
      const users = await UserService.searchUsers(query, currentUserId);
      return sendSuccess(res, users, 'Kullanıcılar listelendi.');
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  }

  static async update(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return sendError(res, 'Yetkisiz erişim.', 401);

      const { username, bio, avatarUrl } = req.body;
      const updated = await UserService.updateProfile(userId, { username, bio, avatarUrl });
      return sendSuccess(res, updated, 'Profil güncellendi.');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }
}
