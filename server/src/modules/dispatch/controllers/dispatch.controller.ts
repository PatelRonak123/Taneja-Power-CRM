import { Request, Response, NextFunction } from 'express';
import { DispatchService } from '../services/dispatch.service.js';
import { sendResponse } from '../../../common/utils/responseEnvelope.js';
import { APP_CONSTANTS } from '../../../config/constants.js';

export class DispatchController {
  constructor(private readonly dispatchService: DispatchService = new DispatchService()) {}

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 20;
      const result = await this.dispatchService.listDispatches({
        search: req.query.search as string,
        status: req.query.status as string,
        salesOrderId: req.query.salesOrderId as string,
        customerId: req.query.customerId as string,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        page,
        limit,
      });

      sendResponse(res, APP_CONSTANTS.HTTP_STATUS.OK, result.data, 'Dispatches retrieved successfully', result.meta);
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dispatch = await this.dispatchService.getDispatchById(req.params.id);
      sendResponse(res, APP_CONSTANTS.HTTP_STATUS.OK, dispatch, 'Dispatch details retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  getDispatchableItems = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const items = await this.dispatchService.getDispatchableItems(req.params.salesOrderId);
      sendResponse(res, APP_CONSTANTS.HTTP_STATUS.OK, items, 'Dispatchable items retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authUser = (req as any).user;
      const dispatch = await this.dispatchService.createDispatch(req.body, authUser);
      sendResponse(res, APP_CONSTANTS.HTTP_STATUS.CREATED, dispatch, 'Dispatch created successfully');
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authUser = (req as any).user;
      const dispatch = await this.dispatchService.updateDispatch(req.params.id, req.body, authUser);
      sendResponse(res, APP_CONSTANTS.HTTP_STATUS.OK, dispatch, 'Dispatch updated successfully');
    } catch (error) {
      next(error);
    }
  };

  submit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authUser = (req as any).user;
      const dispatch = await this.dispatchService.submitDispatch(req.params.id, authUser);
      sendResponse(res, APP_CONSTANTS.HTTP_STATUS.OK, dispatch, 'Dispatch submitted for authorization & Stock OUT');
    } catch (error) {
      next(error);
    }
  };

  confirm = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authUser = (req as any).user;
      const dispatch = await this.dispatchService.confirmDispatch(req.params.id, authUser);
      sendResponse(res, APP_CONSTANTS.HTTP_STATUS.OK, dispatch, 'Dispatch confirmed. Stock OUT executed successfully');
    } catch (error) {
      next(error);
    }
  };

  cancel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authUser = (req as any).user;
      const dispatch = await this.dispatchService.cancelDispatch(
        req.params.id,
        req.body.cancellationReason,
        authUser
      );
      sendResponse(res, APP_CONSTANTS.HTTP_STATUS.OK, dispatch, 'Dispatch cancelled successfully');
    } catch (error) {
      next(error);
    }
  };
}
