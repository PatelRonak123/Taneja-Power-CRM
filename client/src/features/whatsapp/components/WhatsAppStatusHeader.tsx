import React from 'react';
import { ShieldCheck, Radio, RefreshCw } from 'lucide-react';
import { WhatsAppStatus } from '../types/whatsapp.types';

interface WhatsAppStatusHeaderProps {
  status: WhatsAppStatus;
  onRefresh: () => void;
}

export const WhatsAppStatusHeader: React.FC<WhatsAppStatusHeaderProps> = ({
  status,
  onRefresh,
}) => {
  const getStatusBadge = () => {
    switch (status) {
      case 'connected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Radio size={12} className="text-emerald-500 animate-pulse" /> CONNECTED
          </span>
        );
      case 'connecting':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Radio size={12} className="text-amber-500 animate-pulse" /> CONNECTING...
          </span>
        );
      case 'qr':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Radio size={12} /> AWAITING SCAN
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <Radio size={12} /> ERROR
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <Radio size={12} /> DISCONNECTED
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
            <ShieldCheck size={13} /> ADMIN MODULE
          </span>
          {getStatusBadge()}
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">WhatsApp Integration</h1>
        <p className="text-sm text-slate-500">
          Connect the primary Taneja Power administrative WhatsApp account for real-time messaging, customer inquiries, and system notifications.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-medium text-sm transition-colors cursor-pointer"
          onClick={onRefresh}
          title="Refresh Status"
        >
          <RefreshCw size={15} />
          <span>Refresh</span>
        </button>
      </div>
    </div>
  );
};
