import { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { sendSuccess, sendError } from '../../shared/utils/response.js';
import { AuthRequest } from '../../shared/middleware/auth.middleware.js';

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const { email, password, username } = req.body;
      if (!email || !password) {
        return sendError(res, 'E-posta ve şifre zorunludur.', 400);
      }
      if (password.length < 6) {
        return sendError(res, 'Şifre en az 6 karakter olmalıdır.', 400);
      }

      const result = await AuthService.register(email, password, username);
      return sendSuccess(res, result, 'Kayıt başarılı.', 201);
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return sendError(res, 'E-posta ve şifre zorunludur.', 400);
      }

      const result = await AuthService.login(email, password);
      return sendSuccess(res, result, 'Giriş başarılı.');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  static async getMe(req: AuthRequest, res: Response) {
    try {
      if (!req.user?.id) {
        return sendError(res, 'Yetkisiz erişim.', 401);
      }
      const user = await AuthService.getMe(req.user.id);
      return sendSuccess(res, user, 'Kullanıcı bilgisi getirildi.');
    } catch (error: any) {
      return sendError(res, error.message, 404);
    }
  }
}
