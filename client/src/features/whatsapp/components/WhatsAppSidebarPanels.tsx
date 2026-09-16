import React from 'react';
import { ShieldCheck, Info, CheckCircle2 } from 'lucide-react';

export const WhatsAppSidebarPanels: React.FC = () => {
  return (
    <div className="flex flex-col gap-4">
      {/* Persistence & Architecture Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
          <ShieldCheck size={18} className="text-blue-600" />
          <h4>Session Persistence</h4>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          Authentication keys are securely saved on the local backend file system (<code className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-700 font-mono text-[11px]">./whatsapp-auth</code>).
        </p>
        <ul className="space-y-2 pt-1">
          <li className="flex items-start gap-2 text-xs text-slate-600">
            <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
            <span>Automatic reconnection on backend restart</span>
          </li>
          <li className="flex items-start gap-2 text-xs text-slate-600">
            <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
            <span>No need to re-scan QR after server reboots</span>
          </li>
          <li className="flex items-start gap-2 text-xs text-slate-600">
            <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
            <span>Dedicated admin-only singleton connection</span>
          </li>
        </ul>
      </div>

      {/* Security & Access Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
          <Info size={18} className="text-amber-600" />
          <h4>Security & Scope (Phase 1)</h4>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          This integration connects one dedicated administrative WhatsApp account. Employee access, multi-tenant sessions, and automated dispatch triggers are enabled for administrative workflows.
        </p>
      </div>
    </div>
  );
};
