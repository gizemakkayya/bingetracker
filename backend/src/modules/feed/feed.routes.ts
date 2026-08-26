import { Router } from 'express';
import { FeedController } from './feed.controller.js';
import { requireAuth } from '../../shared/middleware/auth.middleware.js';

export const feedRouter = Router();

feedRouter.get('/', requireAuth, FeedController.getFeed);
feedRouter.get('/global', FeedController.getGlobal);
