import React from 'react';
import { ShieldCheck, Activity, Cpu } from 'lucide-react';

export const LoginBrandPanel: React.FC = () => {
  return (
    <div className="flex flex-col justify-between h-full space-y-12 relative z-10">
      {/* Background Decorative Ambient Radial Glows */}
      <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 -right-32 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Brand Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-600/15 border border-blue-500/20 p-2.5 flex items-center justify-center shadow-lg shadow-blue-900/30">
          <img
            src="/logo.png"
            alt="Taneja Power Logo"
            className="h-full w-full object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = 'none';
            }}
          />
        </div>
        <div className="flex flex-col">
          <h1 className="text-xl font-black tracking-wider text-white">TANEJA POWER</h1>
          <span className="text-[11px] font-bold tracking-widest text-blue-400 uppercase">Enterprise CRM</span>
        </div>
      </div>

      {/* Brand Hero Content */}
      <div className="space-y-8 my-auto">
        <div className="space-y-4 max-w-xl">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-[1.15]">
            Run your workforce with clarity.
          </h2>
          <p className="text-base sm:text-lg text-slate-400 leading-relaxed font-normal">
            Taneja Power delivers comprehensive industrial solution tools built to accelerate grid management, equipment control, field staff routing, and telemetry diagnostics.
          </p>
        </div>

        {/* 3 Dark Feature Showcase Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:border-slate-700 hover:bg-slate-900 transition-all duration-300 shadow-xl shadow-black/40">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 tracking-tight">Secure Access</h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">Role-protected sign-in for every account.</p>
            </div>
          </div>

          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:border-slate-700 hover:bg-slate-900 transition-all duration-300 shadow-xl shadow-black/40">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Cpu size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 tracking-tight">Role-Based Tools</h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">Admin and employee views built for each role.</p>
            </div>
          </div>

          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:border-slate-700 hover:bg-slate-900 transition-all duration-300 shadow-xl shadow-black/40">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Activity size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 tracking-tight">Real-Time Insight</h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">Live telemetry, tasks and reporting at a glance.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Brand Footer */}
      <div className="text-xs text-slate-500 font-medium">
        <span>&copy; {new Date().getFullYear()} Taneja Power Systems Inc. All rights reserved.</span>
      </div>
    </div>
  );
};



