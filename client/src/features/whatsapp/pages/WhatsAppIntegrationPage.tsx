import React from 'react';
import { useWhatsApp } from '../hooks/useWhatsApp';
import { WhatsAppQRCard } from '../components/WhatsAppQRCard';
import { WhatsAppStatusHeader } from '../components/WhatsAppStatusHeader';
import { WhatsAppConnectedView } from '../components/WhatsAppConnectedView';
import { WhatsAppDisconnectedView } from '../components/WhatsAppDisconnectedView';
import { WhatsAppErrorView } from '../components/WhatsAppErrorView';
import { WhatsAppSidebarPanels } from '../components/WhatsAppSidebarPanels';
import { Loader2 } from 'lucide-react';

export const WhatsAppIntegrationPage: React.FC = () => {
  const {
    status,
    phoneNumber,
    name,
    qrCode,
    connectedAt,
    error,
    isLoading,
    isConnecting,
    isDisconnecting,
    connect,
    disconnect,
    refetch,
  } = useWhatsApp();

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* Header Bar */}
      <WhatsAppStatusHeader status={status} onRefresh={() => refetch()} />

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Connection Management Card */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 flex flex-col justify-center min-h-100">
          {isLoading && (
            <div className="flex flex-col items-center justify-center gap-3 text-center py-12">
              <Loader2 size={36} className="animate-spin text-blue-600" />
              <p className="text-sm font-medium text-slate-600">Fetching WhatsApp connection status...</p>
            </div>
          )}

          {/* STATE: ERROR */}
          {!isLoading && status === 'error' && (
            <WhatsAppErrorView
              error={error}
              onRetry={connect}
              isConnecting={isConnecting}
            />
          )}

          {/* STATE: DISCONNECTED */}
          {!isLoading && status === 'disconnected' && (
            <WhatsAppDisconnectedView
              onConnect={connect}
              isConnecting={isConnecting}
            />
          )}

          {/* STATE: CONNECTING (Without QR yet) */}
          {!isLoading && status === 'connecting' && (
            <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto py-10 space-y-4">
              <div className="p-4 bg-amber-50 rounded-2xl text-amber-500 animate-pulse">
                <Loader2 size={36} className="animate-spin" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Connecting to WhatsApp...</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Initializing Baileys authentication socket and preparing session credentials. Please wait a moment.
              </p>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full w-2/3 animate-pulse rounded-full" />
              </div>
            </div>
          )}

          {/* STATE: QR CODE READY */}
          {!isLoading && status === 'qr' && qrCode && (
            <WhatsAppQRCard
              qrCode={qrCode}
              onCancel={disconnect}
              isConnecting={isConnecting}
            />
          )}

          {/* STATE: CONNECTED */}
          {!isLoading && status === 'connected' && (
            <WhatsAppConnectedView
              phoneNumber={phoneNumber}
              name={name}
              connectedAt={connectedAt}
              onDisconnect={disconnect}
              isDisconnecting={isDisconnecting}
            />
          )}
        </div>

        {/* Sidebar Info Panels */}
        <div className="lg:col-span-4">
          <WhatsAppSidebarPanels />
        </div>
      </div>
    </div>
  );
};

export default WhatsAppIntegrationPage;
