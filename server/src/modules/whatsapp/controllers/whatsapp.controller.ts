import { Request, Response, NextFunction } from 'express';
import { WhatsAppService, whatsappService } from '../services/whatsapp.service.js';
import { sendResponse } from '../../../common/utils/responseEnvelope.js';
import { APP_CONSTANTS } from '../../../config/constants.js';
import { logger } from '../../../common/logger/logger.js';

export class WhatsAppController {
  constructor(private readonly service: WhatsAppService = whatsappService) {}

  /**
   * Retrieves the current WhatsApp connection status, linked number, and QR code if active.
   */
  getStatus = (_req: Request, res: Response, next: NextFunction): void => {
    try {
      const status = this.service.getStatus();
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        status,
        'WhatsApp status retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Triggers the WhatsApp connection process.
   */
  connect = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const state = await this.service.connect();
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        {
          success: true,
          status: state.status,
          phoneNumber: state.phoneNumber || null,
        },
        'WhatsApp connection initiated'
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Disconnects the active WhatsApp connection safely without deleting session credentials.
   */
  disconnect = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const state = await this.service.disconnect();
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        {
          success: true,
          status: state.status,
        },
        'WhatsApp disconnected successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Real-time Server-Sent Events (SSE) stream for live connection status & QR code updates.
   */
  streamEvents = (req: Request, res: Response): void => {
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    logger.debug('[WhatsApp] SSE client connected for real-time status stream');

    // Send immediate initial status snapshot
    const initialStatus = this.service.getStatus();
    res.write(`data: ${JSON.stringify(initialStatus)}\n\n`);

    // Subscribe to state change broadcasts
    const unsubscribe = this.service.subscribe(() => {
      const currentStatus = this.service.getStatus();
      res.write(`data: ${JSON.stringify(currentStatus)}\n\n`);
    });

    // Send periodic keep-alive heartbeat
    const heartbeatTimer = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, 25000);

    // Clean up when client disconnects
    req.on('close', () => {
      logger.debug('[WhatsApp] SSE client disconnected');
      clearInterval(heartbeatTimer);
      unsubscribe();
      res.end();
    });
  };
}
