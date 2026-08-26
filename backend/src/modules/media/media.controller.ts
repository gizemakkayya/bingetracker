import { Request, Response } from 'express';
import { MediaService } from './media.service.js';
import { sendSuccess, sendError } from '../../shared/utils/response.js';

export class MediaController {
  static async search(req: Request, res: Response) {
    try {
      const query = (req.query.q as string) || '';
      const page = parseInt(req.query.page as string) || 1;
      const results = await MediaService.search(query, page);
      return sendSuccess(res, results, 'Sonuçlar getirildi.');
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  }

  static async getTrending(req: Request, res: Response) {
    try {
      const mediaType = (req.query.type as string) || 'all';
      const page = parseInt(req.query.page as string) || 1;
      const results = await MediaService.getTrending(mediaType, 'week', page);
      return sendSuccess(res, results, 'Trendler getirildi.');
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  }

  static async getDiscover(req: Request, res: Response) {
    try {
      const type = (req.query.type as 'movie' | 'tv') || 'movie';
      const genreId = (req.query.genreId as string) || '';
      const page = parseInt(req.query.page as string) || 1;
      const results = await MediaService.getDiscover(type, genreId, page);
      return sendSuccess(res, results, 'Keşfet sonuçları getirildi.');
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  }

  static async getDetails(req: Request, res: Response) {
    try {
      const type = req.params.type as 'movie' | 'tv';
      const id = parseInt(req.params.id);
      const details = await MediaService.getDetails(type, id);
      return sendSuccess(res, details, 'Detaylar getirildi.');
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  }

  static async getSeason(req: Request, res: Response) {
    try {
      const tvId = parseInt(req.params.tvId);
      const seasonNumber = parseInt(req.params.seasonNumber);
      const seasonData = await MediaService.getSeasonEpisodes(tvId, seasonNumber);
      return sendSuccess(res, seasonData, 'Sezon bölümleri getirildi.');
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  }
}
