import { Request, Response, NextFunction } from 'express';
import { EmployeeService } from '../services/employee.service.js';
import { sendResponse } from '../../../common/utils/responseEnvelope.js';
import { APP_CONSTANTS } from '../../../config/constants.js';

export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService = new EmployeeService()) {}

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.employeeService.listEmployees(req.query as any);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        result.employees,
        'Employees retrieved successfully',
        result.pagination
      );
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.employeeService.getEmployeeById(req.params.id);
      sendResponse(res, APP_CONSTANTS.HTTP_STATUS.OK, result, 'Employee retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.employeeService.createEmployee(req.body);
      sendResponse(res, APP_CONSTANTS.HTTP_STATUS.CREATED, result, 'Employee created successfully');
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.employeeService.deleteEmployee(req.params.id);
      sendResponse(res, APP_CONSTANTS.HTTP_STATUS.OK, { id: req.params.id }, 'Employee removed successfully');
    } catch (error) {
      next(error);
    }
  };
}
