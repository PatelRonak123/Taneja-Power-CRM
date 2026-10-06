import { Request, Response } from 'express';
import { AmcContractService } from '../services/amc-contract.service.js';

export class AmcContractController {
  private service = new AmcContractService();

  private getUserId(req: Request): string | undefined {
    return (req as any).user?.userId || (req as any).user?.id;
  }

  /**
   * POST /api/v1/amc-contracts/from-quotation/:quotationId
   * Convert an accepted AMC quotation into an AMC Contract
   */
  public createFromQuotation = async (req: Request, res: Response): Promise<void> => {
    try {
      const { quotationId } = req.params;
      const userId = this.getUserId(req);

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized user context.' });
        return;
      }

      const contract = await this.service.createContractFromQuotation(quotationId, userId);
      res.status(201).json({
        success: true,
        message: 'AMC Contract created successfully from quotation.',
        data: contract,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message || 'Failed to create AMC Contract.' });
    }
  };

  /**
   * GET /api/v1/amc-contracts
   * List all AMC contracts with search and filter
   */
  public getContracts = async (req: Request, res: Response): Promise<void> => {
    try {
      const { page, limit, search, status, customerId, amcPlan } = req.query;
      const result = await this.service.getContracts({
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        search: search as string,
        status: status as string,
        customerId: customerId as string,
        amcPlan: amcPlan as string,
      });

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to retrieve AMC Contracts.' });
    }
  };

  /**
   * GET /api/v1/amc-contracts/:id
   * Fetch single AMC contract details
   */
  public getContractById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const contract = await this.service.getContractById(id);
      res.status(200).json({
        success: true,
        data: contract,
      });
    } catch (error: any) {
      res.status(404).json({ success: false, error: error.message || 'AMC Contract not found.' });
    }
  };

  /**
   * POST /api/v1/amc-contracts/:id/activate
   * Activate contract and generate schedule
   */
  public activateContract = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = this.getUserId(req);
      const contract = await this.service.activateContract(id, userId);
      res.status(200).json({
        success: true,
        message: 'AMC Contract activated successfully.',
        data: contract,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message || 'Failed to activate AMC Contract.' });
    }
  };

  /**
   * PUT /api/v1/amc-contracts/:id
   * Update contract operational details
   */
  public updateContract = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = this.getUserId(req);
      const contract = await this.service.updateContract(id, req.body, userId);
      res.status(200).json({
        success: true,
        message: 'AMC Contract updated successfully.',
        data: contract,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message || 'Failed to update AMC Contract.' });
    }
  };

  /**
   * POST /api/v1/amc-contracts/:id/terminate
   * Terminate contract — accepts reason, terminationNoticeDate, and terminationDate
   */
  public terminateContract = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { reason, terminationNoticeDate, terminationDate } = req.body;
      const userId = this.getUserId(req);

      if (!reason?.trim()) {
        res.status(400).json({ success: false, error: 'Termination reason is required.' });
        return;
      }

      const contract = await this.service.terminateContract(
        id,
        {
          reason: reason.trim(),
          terminationNoticeDate: terminationNoticeDate ? new Date(terminationNoticeDate) : undefined,
          terminationDate: terminationDate ? new Date(terminationDate) : undefined,
        },
        userId
      );
      res.status(200).json({
        success: true,
        message: 'AMC Contract terminated successfully.',
        data: contract,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message || 'Failed to terminate AMC Contract.' });
    }
  };

  /**
   * POST /api/v1/amc-contracts/:id/service-requests
   * Log breakdown service request
   */
  public createBreakdownRequest = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { equipmentId, issueDescription, priority, escalationLevel, requestedAt, notes } = req.body;
      const userId = this.getUserId(req);

      if (!issueDescription?.trim()) {
        res.status(400).json({ success: false, error: 'Issue description is required.' });
        return;
      }

      const request = await this.service.createBreakdownRequest(
        id,
        {
          equipmentId: equipmentId || undefined,
          issueDescription: issueDescription.trim(),
          priority: priority || 'HIGH',
          escalationLevel: escalationLevel || 'LEVEL_1',
          requestedAt: requestedAt || undefined,
          notes: notes || undefined,
        },
        userId
      );

      res.status(201).json({
        success: true,
        message: 'Breakdown Service Request created successfully.',
        data: request,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message || 'Failed to log breakdown request.' });
    }
  };

  /**
   * POST /api/v1/amc-contracts/:id/service-requests/:requestId/escalate
   * Escalate breakdown service request to next escalation level (LEVEL_1 -> LEVEL_2 -> LEVEL_3)
   */
  public escalateBreakdownRequest = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, requestId } = req.params;
      const { newLevel, notes } = req.body;
      const userId = this.getUserId(req);

      if (!newLevel || !['LEVEL_1', 'LEVEL_2', 'LEVEL_3'].includes(newLevel)) {
        res.status(400).json({ success: false, error: 'Valid escalation newLevel (LEVEL_1, LEVEL_2, or LEVEL_3) is required.' });
        return;
      }

      const request = await this.service.escalateBreakdownRequest(id, requestId, { newLevel, notes }, userId);

      res.status(200).json({
        success: true,
        message: `Breakdown Service Request escalated to ${newLevel}.`,
        data: request,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message || 'Failed to escalate breakdown request.' });
    }
  };

  /**
   * GET /api/v1/amc-contracts/:id/service-requests/:requestId
   * Get single breakdown request details
   */
  public getBreakdownRequestById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, requestId } = req.params;
      const request = await this.service.getBreakdownRequestById(id, requestId);

      res.status(200).json({
        success: true,
        data: request,
      });
    } catch (error: any) {
      res.status(404).json({ success: false, error: error.message || 'Breakdown request not found.' });
    }
  };

  /**
   * POST /api/v1/amc-contracts/:id/service-requests/:requestId/coverage
   * Record Service Office coverage decision (AMC_COVERED or CHARGEABLE)
   */
  public setCoverageDecision = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, requestId } = req.params;
      const { coverageType, coverageNotes } = req.body;
      const userId = this.getUserId(req);

      if (!coverageType || !['AMC_COVERED', 'CHARGEABLE'].includes(coverageType)) {
        res.status(400).json({ success: false, error: 'Valid coverageType (AMC_COVERED or CHARGEABLE) is required.' });
        return;
      }

      const updated = await this.service.setCoverageDecision(id, requestId, { coverageType, coverageNotes }, userId);

      res.status(200).json({
        success: true,
        message: `Coverage decision recorded as ${coverageType}.`,
        data: updated,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message || 'Failed to record coverage decision.' });
    }
  };

  /**
   * POST /api/v1/amc-contracts/:id/service-requests/:requestId/create-repair-task
   * Create and dispatch repair task for an authorized breakdown/follow-up request
   */
  public createRepairTaskForRequest = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, requestId } = req.params;
      const { assignedTo, scheduledAt, dueAt, priority, notes } = req.body;
      const userId = this.getUserId(req);

      const result = await this.service.createRepairTaskForRequest(
        id,
        requestId,
        { assignedTo, scheduledAt, dueAt, priority, notes },
        userId
      );

      res.status(200).json({
        success: true,
        message: 'Repair task created and dispatched successfully.',
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message || 'Failed to create repair task.' });
    }
  };

  /**
   * POST /api/v1/amc-contracts/:id/service-requests/:requestId/link-quotation
   * Link repair quotation to service request
   */
  public linkQuotationToRequest = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, requestId } = req.params;
      const { quotationId } = req.body;
      const userId = this.getUserId(req);

      if (!quotationId) {
        res.status(400).json({ success: false, error: 'quotationId is required.' });
        return;
      }

      const updated = await this.service.linkQuotationToRequest(id, requestId, quotationId, userId);

      res.status(200).json({
        success: true,
        message: 'Quotation linked to service request successfully.',
        data: updated,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message || 'Failed to link quotation.' });
    }
  };

  /**
   * POST /api/v1/amc-contracts/:id/service-requests/:requestId/link-sales-order
   * Link confirmed sales order to service request
   */
  public linkSalesOrderToRequest = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, requestId } = req.params;
      const { salesOrderId } = req.body;
      const userId = this.getUserId(req);

      if (!salesOrderId) {
        res.status(400).json({ success: false, error: 'salesOrderId is required.' });
        return;
      }

      const updated = await this.service.linkSalesOrderToRequest(id, requestId, salesOrderId, userId);

      res.status(200).json({
        success: true,
        message: 'Sales Order linked to service request successfully.',
        data: updated,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message || 'Failed to link sales order.' });
    }
  };

  /**
   * POST /api/v1/amc-contracts/schedule/:visitId/create-task
   * Create or assign field task for a service visit
   */
  public createTaskForVisit = async (req: Request, res: Response): Promise<void> => {
    try {
      const { visitId } = req.params;
      const { assignedEmployeeId } = req.body;
      const userId = this.getUserId(req);

      const visit = await this.service.createTaskForVisit(visitId, assignedEmployeeId, userId);
      res.status(200).json({
        success: true,
        message: 'Field task created/assigned for service visit.',
        data: visit,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message || 'Failed to create task for visit.' });
    }
  };

  /**
   * POST /api/v1/amc-contracts/visits/:visitId/start
   * Start a service visit (SCHEDULED/ASSIGNED -> IN_PROGRESS)
   */
  public startVisit = async (req: Request, res: Response): Promise<void> => {
    try {
      const { visitId } = req.params;
      const userId = this.getUserId(req);
      const visit = await this.service.startVisit(visitId, userId || '');
      res.status(200).json({
        success: true,
        message: 'Service Visit started.',
        data: visit,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message || 'Failed to start visit.' });
    }
  };

  /**
   * POST /api/v1/amc-contracts/visits/:visitId/cancel
   * Cancel a service visit
   */
  public cancelVisit = async (req: Request, res: Response): Promise<void> => {
    try {
      const { visitId } = req.params;
      const { reason } = req.body;
      const userId = this.getUserId(req);
      const visit = await this.service.cancelVisit(visitId, reason || 'Cancelled', userId || '');
      res.status(200).json({
        success: true,
        message: 'Service Visit cancelled.',
        data: visit,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message || 'Failed to cancel visit.' });
    }
  };

  /**
   * GET /api/v1/amc-contracts/visits/:visitId/report
   * Get or initialize service report for a visit
   */
  public getOrCreateServiceReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const { visitId } = req.params;
      const userId = this.getUserId(req);
      const report = await this.service.getOrCreateServiceReport(visitId, userId || '');
      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message || 'Failed to fetch/create service report.' });
    }
  };

  /**
   * POST /api/v1/amc-contracts/visits/:visitId/report
   * Update DRAFT service report checklist & observations
   */
  public updateServiceReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const { reportId } = req.body;
      const userId = this.getUserId(req);

      if (!reportId) {
        res.status(400).json({ success: false, error: 'reportId is required.' });
        return;
      }

      const report = await this.service.updateServiceReport(reportId, req.body, userId || '');
      res.status(200).json({
        success: true,
        message: 'Service Report draft updated.',
        data: report,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message || 'Failed to update service report.' });
    }
  };

  /**
   * POST /api/v1/amc-contracts/visits/:visitId/complete
   * Complete visit and report inside a single database transaction
   */
  public completeServiceVisit = async (req: Request, res: Response): Promise<void> => {
    try {
      const { visitId } = req.params;
      const userId = this.getUserId(req);
      const result = await this.service.completeServiceVisitAndReport(visitId, req.body, userId || '');
      res.status(200).json({
        success: true,
        message: 'Service Visit & Report completed successfully.',
        data: result,
      });
    } catch (error: any) {
      const errMsg = error.message || 'Failed to complete visit.';
      res.status(400).json({ success: false, error: errMsg, message: errMsg });
    }
  };

  /**
   * GET /api/v1/amc-contracts/reports/:reportId/pdf
   * Stream / Download official Service Report PDF
   */
  public downloadServiceReportPdf = async (req: Request, res: Response): Promise<void> => {
    try {
      const { reportId } = req.params;
      const pdfBuffer = await this.service.generateServiceReportPdf(reportId);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="AMC_Service_Report_${reportId}.pdf"`);
      res.status(200).send(pdfBuffer);
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message || 'Failed to generate Service Report PDF.' });
    }
  };

  /**
   * GET /api/v1/amc-contracts/reports/:reportId/materials
   * List all materials consumed in a service report
   */
  public getMaterialsForReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const { reportId } = req.params;
      const materials = await this.service.getMaterialsForReport(reportId);
      res.status(200).json({
        success: true,
        data: materials,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message || 'Failed to retrieve materials.' });
    }
  };

  /**
   * POST /api/v1/amc-contracts/:id/renew
   * Create a renewal contract from an existing AMC contract
   */
  public renewContract = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = this.getUserId(req);

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized user context.' });
        return;
      }

      const body = req.body;

      if (!body.contractStartDate || !body.contractEndDate) {
        res.status(400).json({ success: false, error: 'contractStartDate and contractEndDate are required for renewal.' });
        return;
      }

      const renewalData = {
        contractStartDate: new Date(body.contractStartDate),
        contractEndDate: new Date(body.contractEndDate),
        amcPlan: body.amcPlan,
        serviceFrequency: body.serviceFrequency,
        scheduledVisits: body.scheduledVisits ? Number(body.scheduledVisits) : undefined,
        breakdownVisitType: body.breakdownVisitType,
        specialClauses: body.specialClauses,
        amcPaymentTerms: body.amcPaymentTerms,
        endUser: body.endUser,
        totalAmount: body.totalAmount,
        equipment: body.equipment,
        scopeItems: body.scopeItems,
        exclusions: body.exclusions,
        escalations: body.escalations,
      };

      const newContract = await this.service.renewContract(id, renewalData, userId);
      res.status(201).json({
        success: true,
        message: `Renewal contract ${newContract.contractNumber} created successfully. Activate it to generate the new service schedule.`,
        data: newContract,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message || 'Failed to create renewal contract.' });
    }
  };

  /**
   * GET /api/v1/amc-contracts/:id/history
   * Get renewal chain for a contract (ancestors + current + successors)
   */
  public getContractHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const history = await this.service.getContractHistory(id);
      res.status(200).json({
        success: true,
        data: history,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message || 'Failed to get contract history.' });
    }
  };
}
