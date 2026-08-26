import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { requireAuth } from '../../shared/middleware/auth.middleware.js';

export const authRouter = Router();

authRouter.post('/register', AuthController.register);
authRouter.post('/login', AuthController.login);
authRouter.get('/me', requireAuth, AuthController.getMe);
