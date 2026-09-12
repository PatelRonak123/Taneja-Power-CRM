export type WhatsAppStatus = 'disconnected' | 'connecting' | 'qr' | 'connected' | 'error';

export interface WhatsAppStatusData {
  status: WhatsAppStatus;
  phoneNumber: string | null;
  name: string | null;
  qrCode: string | null;
  connectedAt: string | null;
  error: string | null;
}

export interface WhatsAppConnectResponse {
  success: boolean;
  status: WhatsAppStatus;
  phoneNumber?: string | null;
}

export interface WhatsAppDisconnectResponse {
  success: boolean;
  status: WhatsAppStatus;
}
