import { Request, Response, NextFunction } from 'express';
import { DestinationService } from '../services/destination.service.js';
import { sendResponse } from '../../../common/utils/responseEnvelope.js';
import { APP_CONSTANTS } from '../../../config/constants.js';

export class DestinationController {
  constructor(
    private readonly destinationService: DestinationService = new DestinationService()
  ) {}

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.destinationService.listDestinations(req.params.customerId);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        result,
        'Destinations retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.destinationService.getDestinationById(
        req.params.customerId,
        req.params.destinationId
      );
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        result,
        'Destination retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.destinationService.createDestination(
        req.params.customerId,
        req.body
      );
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.CREATED,
        result,
        'Destination created successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.destinationService.updateDestination(
        req.params.customerId,
        req.params.destinationId,
        req.body
      );
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        result,
        'Destination updated successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.destinationService.deleteDestination(
        req.params.customerId,
        req.params.destinationId
      );
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        { id: req.params.destinationId },
        'Destination removed successfully'
      );
    } catch (error) {
      next(error);
    }
  };
}
