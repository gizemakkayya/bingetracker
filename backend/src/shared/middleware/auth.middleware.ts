import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { sendError } from '../utils/response.js';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
  };
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 'Yetkilendirme belirteci (token) bulunamadı.', 401);
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'bingetracker_super_secret_jwt_key_2026';

    const decoded = jwt.verify(token, secret) as { id: string; email: string; username: string };
    req.user = decoded;
    next();
  } catch (error) {
    return sendError(res, 'Geçersiz veya süresi dolmuş oturum belirteci.', 401);
  }
}
