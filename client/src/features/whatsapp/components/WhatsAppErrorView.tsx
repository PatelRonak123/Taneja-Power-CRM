import React from 'react';
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';

interface WhatsAppErrorViewProps {
  error: string | null;
  onRetry: () => void;
  isConnecting: boolean;
}

export const WhatsAppErrorView: React.FC<WhatsAppErrorViewProps> = ({
  error,
  onRetry,
  isConnecting,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto py-10 space-y-4">
      <div className="p-4 bg-rose-50 rounded-2xl text-rose-500">
        <AlertTriangle size={32} />
      </div>
      <div className="space-y-1">
        <h3 className="text-xl font-bold text-slate-900">Connection Error</h3>
        <p className="text-sm text-slate-500 leading-relaxed">
          {error || 'An error occurred while communicating with the WhatsApp client.'}
        </p>
      </div>
      <div className="pt-2">
        <button
          type="button"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-50"
          onClick={onRetry}
          disabled={isConnecting}
        >
          {isConnecting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Retrying...</span>
            </>
          ) : (
            <>
              <RefreshCw size={16} />
              <span>Retry Connection</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
