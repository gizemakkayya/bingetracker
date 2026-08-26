import { Router } from 'express';
import { UserController } from './user.controller.js';
import { requireAuth } from '../../shared/middleware/auth.middleware.js';

export const userRouter = Router();

userRouter.get('/search', requireAuth, UserController.search);
userRouter.get('/profile/:username', UserController.getProfile);
userRouter.put('/profile', requireAuth, UserController.update);
