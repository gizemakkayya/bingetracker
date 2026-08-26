import { Router } from 'express';
import { SocialController } from './social.controller.js';
import { requireAuth } from '../../shared/middleware/auth.middleware.js';

export const socialRouter = Router();

socialRouter.post('/follow/:userId', requireAuth, SocialController.follow);
socialRouter.delete('/unfollow/:userId', requireAuth, SocialController.unfollow);
socialRouter.get('/followers/:userId', SocialController.getFollowers);
socialRouter.get('/following/:userId', SocialController.getFollowing);
