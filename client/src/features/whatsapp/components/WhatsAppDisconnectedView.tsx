import React from 'react';
import { MessageSquare, Loader2, Power } from 'lucide-react';

interface WhatsAppDisconnectedViewProps {
  onConnect: () => void;
  isConnecting: boolean;
}

export const WhatsAppDisconnectedView: React.FC<WhatsAppDisconnectedViewProps> = ({
  onConnect,
  isConnecting,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto py-10 space-y-5">
      <div className="p-4 bg-slate-100 rounded-2xl text-slate-600">
        <MessageSquare size={36} />
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-bold text-slate-900">WhatsApp Disconnected</h3>
        <p className="text-sm text-slate-500 leading-relaxed">
          Connect your business WhatsApp account to start sending alerts, receiving client queries, and enabling instant notifications.
        </p>
      </div>

      <div className="pt-2">
        <button
          type="button"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
          onClick={onConnect}
          disabled={isConnecting}
        >
          {isConnecting ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Initializing Connection...</span>
            </>
          ) : (
            <>
              <Power size={18} />
              <span>Connect WhatsApp</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
