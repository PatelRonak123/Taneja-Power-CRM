import { Request, Response, NextFunction } from 'express';
import { CustomerService } from '../services/customer.service.js';
import { sendResponse } from '../../../common/utils/responseEnvelope.js';
import { APP_CONSTANTS } from '../../../config/constants.js';

export class CustomerController {
  constructor(private readonly customerService: CustomerService = new CustomerService()) {}

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.customerService.listCustomers(req.query as any);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        result.customers,
        'Customers retrieved successfully',
        {
          ...result.pagination,
          metrics: result.metrics,
        }
      );
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.customerService.getCustomerById(req.params.id);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        result,
        'Customer details retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.customerService.createCustomer(req.body);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.CREATED,
        result,
        'Customer created successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.customerService.updateCustomer(req.params.id, req.body);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        result,
        'Customer updated successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.customerService.deleteCustomer(req.params.id);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        { id: req.params.id },
        'Customer and associated destinations removed successfully'
      );
    } catch (error) {
      next(error);
    }
  };
}
