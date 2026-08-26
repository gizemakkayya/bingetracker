import { Router } from 'express';
import { TrackerController } from './tracker.controller.js';
import { requireAuth } from '../../shared/middleware/auth.middleware.js';

export const trackerRouter = Router();

trackerRouter.use(requireAuth);

trackerRouter.get('/', TrackerController.getList);
trackerRouter.post('/', TrackerController.saveItem);
trackerRouter.post('/episode/:itemId', TrackerController.markEpisode);
trackerRouter.delete('/:itemId', TrackerController.deleteItem);
trackerRouter.get('/stats', TrackerController.getStats);
