import { Request, Response, NextFunction } from 'express';
import { geocodingService } from './geocoding.service.js';
import { sendResponse } from '../../common/utils/responseEnvelope.js';

export const searchLocationsHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = req.query.q as string;
    if (!q || q.trim().length < 3) {
      return sendResponse(res, 200, { provider: 'none', results: [] }, 'Query string too short');
    }

    const { provider, results } = await geocodingService.search(q);
    return sendResponse(res, 200, { provider, results }, 'Locations fetched successfully');
  } catch (error) {
    return next(error);
  }
};
