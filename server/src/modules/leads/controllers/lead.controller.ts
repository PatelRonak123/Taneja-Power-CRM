import { Request, Response, NextFunction } from 'express';
import { LeadService } from '../services/lead.service.js';
import { sendResponse } from '../../../common/utils/responseEnvelope.js';
import { AppError } from '../../../common/errors/AppError.js';
import { hasPermission } from '../../../common/auth/permissions.js';

export class LeadController {
  private service = new LeadService();

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { search, status, priority, assignee } = req.query as {
        search?: string;
        status?: string;
        priority?: string;
        assignee?: string;
      };

      const leadsList = await this.service.listLeads(
        { search, status, priority, assignee },
        req.user
      );
      sendResponse(res, 200, leadsList, 'Leads retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const lead = await this.service.getLeadById(id, req.user);
      sendResponse(res, 200, lead, 'Lead details retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const newLead = await this.service.createLead(req.body, req.user);
      sendResponse(res, 201, newLead, 'Lead created successfully');
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const updatedLead = await this.service.updateLead(id, req.body, req.user);
      sendResponse(res, 200, updatedLead, 'Lead updated successfully');
    } catch (error) {
      next(error);
    }
  };

  getPipeline = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const pipelineData = await this.service.getPipeline(req.user);
      sendResponse(res, 200, pipelineData, 'Pipeline data retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      if (!req.user || !hasPermission(req.user.role, 'leads:delete')) {
        throw AppError.forbidden('You do not have permission to delete lead records');
      }
      await this.service.deleteLead(id, req.user);
      sendResponse(res, 200, { success: true }, 'Lead deleted successfully');
    } catch (error) {
      next(error);
    }
  };

  addActivity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const activity = await this.service.addActivity(id, req.body, req.user);
      sendResponse(res, 201, activity, 'Activity added successfully');
    } catch (error) {
      next(error);
    }
  };

  listDestinations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { leadId } = req.params;
      const destinations = await this.service.listDestinations(leadId, req.user);
      sendResponse(res, 200, destinations, 'Destinations retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  createDestination = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { leadId } = req.params;
      const destination = await this.service.createDestination(leadId, req.body, req.user);
      sendResponse(res, 201, destination, 'Destination registered successfully');
    } catch (error) {
      next(error);
    }
  };

  updateDestination = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { leadId, destinationId } = req.params;
      const destination = await this.service.updateDestination(leadId, destinationId, req.body, req.user);
      sendResponse(res, 200, destination, 'Destination updated successfully');
    } catch (error) {
      next(error);
    }
  };

  deleteDestination = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { leadId, destinationId } = req.params;
      await this.service.deleteDestination(leadId, destinationId, req.user);
      sendResponse(res, 200, { success: true }, 'Destination deleted successfully');
    } catch (error) {
      next(error);
    }
  };
}

