export type WhatsAppStatus = 'disconnected' | 'connecting' | 'qr' | 'connected' | 'error';

export interface WhatsAppState {
  status: WhatsAppStatus;
  phoneNumber?: string | null;
  name?: string | null;
  qrCode?: string | null;
  connectedAt?: Date | null;
  error?: string | null;
}

export interface WhatsAppStatusDto {
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
  message: string;
}

export interface WhatsAppDisconnectResponse {
  success: boolean;
  status: WhatsAppStatus;
  message: string;
}

export type WhatsAppEventListener = (state: WhatsAppState) => void;
