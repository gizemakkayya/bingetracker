import { Router } from 'express';
import { MediaController } from './media.controller.js';

export const mediaRouter = Router();

mediaRouter.get('/search', MediaController.search);
mediaRouter.get('/trending', MediaController.getTrending);
mediaRouter.get('/discover', MediaController.getDiscover);
mediaRouter.get('/details/:type/:id', MediaController.getDetails);
mediaRouter.get('/season/:tvId/:seasonNumber', MediaController.getSeason);
