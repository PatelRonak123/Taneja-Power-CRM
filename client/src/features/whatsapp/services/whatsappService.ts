import { apiClient, ApiEnvelope } from '../../../app/api/apiClient';
import { env } from '../../../app/config/env';
import {
  WhatsAppStatusData,
  WhatsAppConnectResponse,
  WhatsAppDisconnectResponse,
} from '../types/whatsapp.types';

export const whatsappService = {
  /**
   * Fetches current WhatsApp connection status snapshot.
   */
  async getStatus(): Promise<WhatsAppStatusData> {
    const response = (await apiClient.get('/whatsapp/status')) as unknown as ApiEnvelope<WhatsAppStatusData>;
    return response.data;
  },

  /**
   * Initiates WhatsApp connection and QR generation.
   */
  async connect(): Promise<WhatsAppConnectResponse> {
    const response = (await apiClient.post('/whatsapp/connect')) as unknown as ApiEnvelope<WhatsAppConnectResponse>;
    return response.data;
  },

  /**
   * Disconnects WhatsApp active session.
   */
  async disconnect(): Promise<WhatsAppDisconnectResponse> {
    const response = (await apiClient.post('/whatsapp/disconnect')) as unknown as ApiEnvelope<WhatsAppDisconnectResponse>;
    return response.data;
  },

  /**
   * Creates an SSE stream connection for live status updates.
   */
  subscribeToEvents(
    onData: (data: WhatsAppStatusData) => void,
    onError?: (err: Event) => void
  ): () => void {
    const url = `${env.API_BASE_URL}/whatsapp/events`;
    const eventSource = new EventSource(url, { withCredentials: true });

    eventSource.onmessage = (event) => {
      try {
        const parsed: WhatsAppStatusData = JSON.parse(event.data);
        onData(parsed);
      } catch (err) {
        console.error('[WhatsApp SSE] Failed to parse message', err);
      }
    };

    eventSource.onerror = (err) => {
      if (onError) {
        onError(err);
      }
    };

    return () => {
      eventSource.close();
    };
  },
};
