import React from 'react';
import { ShieldCheck, Activity, Cpu } from 'lucide-react';

export const LoginBrandPanel: React.FC = () => {
  return (
    <div className="flex flex-col justify-between h-full relative z-10 w-full">
      {/* Background Image (Clean without blue overlays) */}
      <div className="absolute -top-6 sm:-top-10 lg:-top-12 -bottom-6 sm:-bottom-10 lg:-bottom-12 -right-6 sm:-right-10 lg:-right-12 left-0 pointer-events-none overflow-hidden select-none">
        {/* Power Plant Image Container */}
        <div className="absolute top-0 bottom-0 right-0 w-[55%] lg:w-[60%] overflow-hidden">
          <img
            src="/industrial_power_plant_bg.jpg"
            alt="Industrial Power Plant"
            className="w-full h-full object-cover object-center"
          />
          {/* Subtle gradient blend on left side of image into background canvas */}
          <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-[#edf4fc] via-[#edf4fc]/60 to-transparent" />
        </div>
      </div>

      {/* Brand Header */}
      <div className="flex items-center gap-4 relative z-20">
        <div className="h-14 px- bg-[#edf4fc] rounded-2xl flex items-center justify-center shrink-0 shadow-  border-blue-200/50">
          <img
            src="/logo.png"
            alt="Taneja Power Logo"
            className="h-9 w-auto object-contain mix-blend-multiply"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = 'none';
            }}
          />
        </div>
        <div className="flex flex-col gap-0.5">
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 leading-none">TANEJA POWER</h1>
          <span className="text-xs font-bold tracking-wider text-blue-600 uppercase">ENTERPRISE CRM</span>
        </div>
      </div>

      {/* Hero Content */}
      <div className="my-auto py-4 relative z-20 max-w-xl">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-5 h-0.5 bg-blue-600 rounded-full" />
          <span className="text-[11px] font-extrabold tracking-widest text-slate-500 uppercase">
            Powering Industrial Operations
          </span>
        </div>

        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.08] mb-4">
          Run your workforce <br />
          with <span className="text-blue-600">clarity.</span>
        </h2>

        <p className="text-sm text-slate-600 leading-relaxed font-medium mb-6 max-w-md">
          Taneja Power delivers comprehensive industrial solution tools built to accelerate grid management, equipment control, field staff routing, and telemetry diagnostics.
        </p>

        {/* 3 Feature Showcase Cards */}
        <div className="grid grid-cols-3 gap-3.5 sm:gap-4">
          {/* Card 1 */}
          <div className="bg-white/95 backdrop-blur-md border border-white rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mb-3 border border-blue-100">
              <ShieldCheck size={19} />
            </div>
            <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">Secure Access</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">Role-protected sign-in for every account.</p>
          </div>

          {/* Card 2 */}
          <div className="bg-white/95 backdrop-blur-md border border-white rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 mb-3 border border-amber-100">
              <Cpu size={19} />
            </div>
            <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">Role-Based Tools</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">Admin and employee views built for each role.</p>
          </div>

          {/* Card 3 */}
          <div className="bg-white/95 backdrop-blur-md border border-white rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mb-3 border border-emerald-100">
              <Activity size={19} />
            </div>
            <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">Real-Time Insight</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">Live telemetry, tasks and reporting at a glance.</p>
          </div>
        </div>
      </div>

      {/* Brand Footer */}
      <div className="text-[11px] text-slate-500 font-medium relative z-20">
        &copy; {new Date().getFullYear()} Taneja Power Systems Inc. All rights reserved.
      </div>
    </div>
  );
};



