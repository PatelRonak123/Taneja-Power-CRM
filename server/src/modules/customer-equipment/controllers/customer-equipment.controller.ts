import { Request, Response, NextFunction } from 'express';
import { CustomerEquipmentService } from '../services/customer-equipment.service.js';
import { sendResponse } from '../../../common/utils/responseEnvelope.js';
import { APP_CONSTANTS } from '../../../config/constants.js';
import {
  listCustomerEquipmentQuerySchema,
  updateCustomerEquipmentSchema,
  manualCreateCustomerEquipmentSchema,
  commissionCustomerEquipmentSchema,
  processWarrantyRemindersSchema,
} from '../validators/customer-equipment.validator.js';

export class CustomerEquipmentController {
  constructor(private readonly service: CustomerEquipmentService = new CustomerEquipmentService()) {}

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsedQuery = listCustomerEquipmentQuerySchema.parse(req.query);
      const result = await this.service.listEquipment(parsedQuery);
      sendResponse(res, APP_CONSTANTS.HTTP_STATUS.OK, result.data, 'Customer equipment retrieved successfully', result.meta);
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const equipment = await this.service.getEquipmentById(req.params.id);
      sendResponse(res, APP_CONSTANTS.HTTP_STATUS.OK, equipment, 'Customer equipment details retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  getByCustomerId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const equipment = await this.service.getEquipmentByCustomerId(req.params.customerId, req.user);
      sendResponse(res, APP_CONSTANTS.HTTP_STATUS.OK, equipment, 'Customer equipment list retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  getServiceHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const history = await this.service.getServiceHistory(req.params.id);
      sendResponse(res, APP_CONSTANTS.HTTP_STATUS.OK, history, 'Service history retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  getAmcHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const amcHistory = await this.service.getAmcHistory(req.params.id);
      sendResponse(res, APP_CONSTANTS.HTTP_STATUS.OK, amcHistory, 'AMC history retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validatedInput = updateCustomerEquipmentSchema.parse(req.body);
      const authUser = (req as any).user;
      const updated = await this.service.updateEquipment(req.params.id, validatedInput, authUser);
      sendResponse(res, APP_CONSTANTS.HTTP_STATUS.OK, updated, 'Customer equipment updated successfully');
    } catch (error) {
      next(error);
    }
  };

  manualCreate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validatedInput = manualCreateCustomerEquipmentSchema.parse(req.body);
      const authUser = (req as any).user;
      const created = await this.service.manualCreateEquipment(validatedInput, authUser);
      sendResponse(res, APP_CONSTANTS.HTTP_STATUS.CREATED, created, 'Legacy customer equipment created successfully');
    } catch (error) {
      next(error);
    }
  };

  commission = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validatedInput = commissionCustomerEquipmentSchema.parse(req.body);
      const authUser = req.user;
      const result = await this.service.commissionEquipment(req.params.id, validatedInput, authUser);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        result,
        'Equipment commissioned and warranty activated successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  processReminders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authUser = req.user;
      const options = processWarrantyRemindersSchema.parse(req.body || {});
      const result = await this.service.processWarrantyReminders(authUser, options);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        result,
        `Warranty expiry reminder scan completed. Generated: ${result.generatedCount}, Skipped: ${result.skippedCount}`
      );
    } catch (error) {
      next(error);
    }
  };
}

