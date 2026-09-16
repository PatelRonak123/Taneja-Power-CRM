import React from 'react';
import { ShieldCheck, Activity, Cpu } from 'lucide-react';

export const LoginBrandPanel: React.FC = () => {
  return (
    <div className="flex flex-col justify-between h-full space-y-8 z-10">
      {/* Brand Header */}
      <div className="flex items-center gap-3">
        <img
          src="/logo.png"
          alt="Taneja Power Logo"
          className="h-10 w-auto object-contain"
          onError={(e) => {
            (e.currentTarget as HTMLElement).style.display = 'none';
          }}
        />
        <div className="flex flex-col">
          <h1 className="text-xl font-black tracking-wider text-white">TANEJA POWER</h1>
          <span className="text-[10px] font-bold tracking-widest text-blue-400 uppercase">Enterprise CRM</span>
        </div>
      </div>

      {/* Brand Content */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
            Industrial Power Grid & CRM Management Portal
          </h2>
          <p className="mt-3 text-sm text-slate-400 leading-relaxed">
            Streamline enterprise power asset tracking, equipment inventory control, staff management, and real-time telemetry diagnostics.
          </p>
        </div>

        <div className="space-y-4 pt-2">
          <div className="flex items-start gap-3.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0 mt-0.5">
              <ShieldCheck size={18} />
            </div>
            <div className="flex flex-col">
              <strong className="text-sm font-semibold text-slate-200">Role-Based Access Control</strong>
              <span className="text-xs text-slate-400">Enterprise JWT authentication with RBAC user permission enforcement</span>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0 mt-0.5">
              <Cpu size={18} />
            </div>
            <div className="flex flex-col">
              <strong className="text-sm font-semibold text-slate-200">Heavy Power Equipment Catalog</strong>
              <span className="text-xs text-slate-400">Real-time monitoring of generators, transformers & industrial switchgear</span>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0 mt-0.5">
              <Activity size={18} />
            </div>
            <div className="flex flex-col">
              <strong className="text-sm font-semibold text-slate-200">Live Field Operations & Telemetry</strong>
              <span className="text-xs text-slate-400">Field task routing, customer destinations, and status synchronization</span>
            </div>
          </div>
        </div>
      </div>

      {/* Brand Footer */}
      <div className="text-xs text-slate-500 pt-4 border-t border-slate-800">
        <span>&copy; {new Date().getFullYear()} Taneja Power Systems Inc.</span>
      </div>
    </div>
  );
};
