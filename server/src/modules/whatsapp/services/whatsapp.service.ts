import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import { WhatsAppClient, WhatsAppConnectedData, WhatsAppDisconnectedData } from '@ronak_patel/whatsapp-kit';
import { logger } from '../../../common/logger/logger.js';
import {
  WhatsAppState,
  WhatsAppStatus,
  WhatsAppStatusDto,
  WhatsAppEventListener,
} from '../types/whatsapp.types.js';

export class WhatsAppService {
  private static instance: WhatsAppService | null = null;
  private client: WhatsAppClient | null = null;
  private readonly emitter = new EventEmitter();
  private readonly authPath: string;

  private state: WhatsAppState = {
    status: 'disconnected',
    phoneNumber: null,
    name: null,
    qrCode: null,
    connectedAt: null,
    error: null,
  };

  private constructor() {
    this.authPath = path.resolve(process.cwd(), 'whatsapp-auth');
    this.emitter.setMaxListeners(50);
  }

  public static getInstance(): WhatsAppService {
    if (!WhatsAppService.instance) {
      WhatsAppService.instance = new WhatsAppService();
    }
    return WhatsAppService.instance;
  }

  /**
   * Initializes the WhatsApp service and automatically attempts to restore
   * the session if valid credentials exist on disk.
   */
  public async initialize(): Promise<void> {
    logger.info('[WhatsApp] Initializing client');
    this.ensureClient();

    // Check if an existing session exists in the auth directory
    const credsFile = path.join(this.authPath, 'creds.json');
    if (fs.existsSync(credsFile)) {
      logger.info('[WhatsApp] Saved credentials detected. Restoring WhatsApp session...');
      try {
        await this.connect();
      } catch (err) {
        logger.error('[WhatsApp] Failed to automatically restore session on startup', {
          error: (err as Error).message,
        });
      }
    } else {
      logger.info('[WhatsApp] No saved session found. Ready for pairing.');
    }
  }

  /**
   * Cleans all authentication files from disk to allow fresh QR pairing.
   */
  private async clearAuthFiles(): Promise<void> {
    try {
      if (fs.existsSync(this.authPath)) {
        fs.rmSync(this.authPath, { recursive: true, force: true });
        logger.info(`[WhatsApp] Cleared stale auth credentials from "${this.authPath}"`);
      }
      fs.mkdirSync(this.authPath, { recursive: true });
    } catch (err) {
      logger.error('[WhatsApp] Failed to clear auth directory:', { error: (err as Error).message });
    }
  }

  /**
   * Resets the client instance so subsequent connections start fresh.
   */
  private resetClient(): void {
    if (this.client) {
      this.client = null;
    }
  }

  /**
   * Lazy initializes the singleton WhatsAppClient and registers event handlers once.
   */
  private ensureClient(): WhatsAppClient {
    if (this.client) {
      return this.client;
    }

    // Ensure the auth directory exists
    if (!fs.existsSync(this.authPath)) {
      fs.mkdirSync(this.authPath, { recursive: true });
    }

    this.client = new WhatsAppClient({
      authPath: this.authPath,
      printQRInTerminal: false,
      ignoreOwnMessages: true,
      maxReconnectRetries: 5,
      reconnectIntervalMs: 3000,
    });

    this.registerEventListeners(this.client);
    return this.client;
  }

  /**
   * Registers all lifecycle and operational event listeners for WhatsAppClient.
   */
  private registerEventListeners(client: WhatsAppClient): void {
    client.on('connecting', () => {
      logger.info('[WhatsApp] Connecting...');
      this.updateState({
        status: 'connecting',
        error: null,
      });
    });

    client.on('qr', (qr: string) => {
      logger.info('[WhatsApp] QR generated');
      this.updateState({
        status: 'qr',
        qrCode: qr,
        error: null,
      });
    });

    client.on('connected', (data: WhatsAppConnectedData) => {
      logger.info('[WhatsApp] WhatsApp connected successfully', {
        phoneNumber: data.phoneNumber,
        name: data.name,
      });
      this.updateState({
        status: 'connected',
        phoneNumber: data.phoneNumber || null,
        name: data.name || null,
        qrCode: null,
        connectedAt: data.connectedAt || new Date(),
        error: null,
      });
    });

    client.on('disconnected', async (data: WhatsAppDisconnectedData) => {
      logger.info('[WhatsApp] WhatsApp disconnected', {
        reason: data.reason,
        isLoggedOut: data.isLoggedOut,
        willReconnect: data.willReconnect,
      });

      // If disconnected from mobile device or session invalidated (401 / logged out)
      if (data.isLoggedOut) {
        logger.info('[WhatsApp] Session logged out / invalidated from mobile device. Clearing auth files for fresh QR pairing...');
        await this.clearAuthFiles();
        this.resetClient();
      }

      this.updateState({
        status: 'disconnected',
        phoneNumber: null,
        name: null,
        qrCode: null,
        connectedAt: null,
        error: data.reason || null,
      });
    });

    client.on('error', async (error: Error) => {
      logger.error('[WhatsApp] Connection error', {
        message: error.message,
      });

      // If auth failure, wipe invalid credentials so next connect creates fresh QR
      if (error.message && (error.message.includes('401') || error.message.includes('logged out') || error.message.includes('conflict'))) {
        logger.info('[WhatsApp] Auth error detected. Wiping credentials for fresh QR pairing...');
        await this.clearAuthFiles();
        this.resetClient();
      }

      this.updateState({
        status: 'error',
        error: error.message,
      });
    });
  }

  /**
   * Updates state and notifies real-time listeners.
   */
  private updateState(partial: Partial<WhatsAppState>): void {
    this.state = {
      ...this.state,
      ...partial,
    };
    this.emitter.emit('state_changed', this.state);
  }

  /**
   * Initiates the WhatsApp connection process.
   */
  public async connect(): Promise<WhatsAppState> {
    if (this.state.status === 'connected') {
      logger.info('[WhatsApp] Already connected. Skipping connect call.');
      return this.state;
    }

    if (this.state.status === 'connecting') {
      logger.info('[WhatsApp] Connection already in progress.');
      return this.state;
    }

    // If previously disconnected or errored, ensure fresh client instance
    const client = this.ensureClient();

    logger.info('[WhatsApp] Starting WhatsApp connection process...');
    this.updateState({
      status: 'connecting',
      error: null,
    });

    try {
      await client.connect();
      return this.state;
    } catch (err) {
      const errorMessage = (err as Error).message || 'Failed to start WhatsApp connection';
      logger.error('[WhatsApp] Connect failed', { error: errorMessage });

      if (errorMessage.includes('401') || errorMessage.includes('logged out')) {
        await this.clearAuthFiles();
        this.resetClient();
      }

      this.updateState({
        status: 'error',
        error: errorMessage,
      });
      throw err;
    }
  }

  /**
   * Disconnects WhatsApp and clears session for a fresh reconnection/QR generation.
   */
  public async disconnect(): Promise<WhatsAppState> {
    logger.info('[WhatsApp] Disconnecting WhatsApp client and clearing session for re-pairing...');
    if (this.client) {
      try {
        await this.client.logout();
      } catch (err) {
        try {
          await this.client.disconnect();
        } catch {
          // Ignore
        }
      }
    }

    await this.clearAuthFiles();
    this.resetClient();

    this.updateState({
      status: 'disconnected',
      phoneNumber: null,
      name: null,
      qrCode: null,
      connectedAt: null,
      error: null,
    });

    return this.state;
  }

  /**
   * Returns current formatted snapshot of WhatsApp status.
   */
  public getStatus(): WhatsAppStatusDto {
    return {
      status: this.state.status,
      phoneNumber: this.state.phoneNumber || null,
      name: this.state.name || null,
      qrCode: this.state.status === 'qr' ? this.state.qrCode || null : null,
      connectedAt: this.state.connectedAt ? this.state.connectedAt.toISOString() : null,
      error: this.state.error || null,
    };
  }

  /**
   * Subscribes a listener to live state changes (used by SSE).
   */
  public subscribe(listener: WhatsAppEventListener): () => void {
    this.emitter.on('state_changed', listener);
    return () => {
      this.emitter.off('state_changed', listener);
    };
  }
}

export const whatsappService = WhatsAppService.getInstance();
