import React from 'react';
import { CheckCircle2, Smartphone, Loader2, Power } from 'lucide-react';

interface WhatsAppConnectedViewProps {
  phoneNumber?: string | null;
  name?: string | null;
  connectedAt?: string | null;
  onDisconnect: () => void;
  isDisconnecting: boolean;
}

export const WhatsAppConnectedView: React.FC<WhatsAppConnectedViewProps> = ({
  phoneNumber,
  name,
  connectedAt,
  onDisconnect,
  isDisconnecting,
}) => {
  const formatPhoneNumber = (num?: string | null) => {
    if (!num) return 'Not available';
    const clean = num.replace(/\D/g, '');
    if (clean.length === 12 && clean.startsWith('91')) {
      return `+91 ${clean.slice(2, 7)} ${clean.slice(7)}`;
    }
    if (clean.length === 10) {
      return `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`;
    }
    return `+${clean}`;
  };

  const formatConnectedTime = (isoString?: string | null) => {
    if (!isoString) return 'Active session';
    try {
      const date = new Date(isoString);
      return date.toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex items-center gap-4 p-4 bg-emerald-50 border border-emerald-200/80 rounded-2xl">
        <div className="p-3 bg-emerald-600 text-white rounded-xl shadow-xs">
          <CheckCircle2 size={28} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">WhatsApp Connected ✅</h2>
          <p className="text-xs text-slate-600">
            Your WhatsApp session is active and linked to Taneja Power.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Connected Phone Number</span>
          <div className="flex items-center gap-2 pt-1">
            <Smartphone size={18} className="text-slate-400" />
            <span className="text-base font-bold text-slate-900 font-mono">
              {formatPhoneNumber(phoneNumber)}
            </span>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Account / Display Name</span>
          <div className="pt-1">
            <span className="text-base font-bold text-slate-900">{name || 'Taneja Power Admin'}</span>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Connection Status</span>
          <div className="flex items-center gap-2 pt-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-semibold text-emerald-700">Online & Active</span>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Session Established</span>
          <div className="pt-1">
            <span className="text-sm font-medium text-slate-700">
              {formatConnectedTime(connectedAt)}
            </span>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100 flex justify-end">
        <button
          type="button"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-semibold text-sm transition-all cursor-pointer disabled:opacity-50"
          onClick={onDisconnect}
          disabled={isDisconnecting}
        >
          {isDisconnecting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Disconnecting...</span>
            </>
          ) : (
            <>
              <Power size={16} />
              <span>Disconnect WhatsApp</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
