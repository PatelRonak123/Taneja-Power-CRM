import React from 'react';
import { Zap, CheckCircle2, Activity, ShieldCheck, ArrowRight } from 'lucide-react';
import { navigate } from '../../../app/router/navigation';

export const EmployeeMetricsGrid: React.FC = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div
        className="flex items-center justify-between p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
        onClick={() => navigate('/products')}
      >
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-105 transition-transform">
            <Zap size={22} />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500">Equipment Inventory</span>
            <h4 className="text-base font-bold text-slate-900">Active Grid</h4>
          </div>
        </div>
        <ArrowRight size={16} className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
      </div>

      <div className="flex items-center gap-3.5 p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
          <CheckCircle2 size={22} />
        </div>
        <div>
          <span className="text-xs font-semibold text-slate-500">System Health</span>
          <h4 className="text-base font-bold text-slate-900">99.8% Nominal</h4>
        </div>
      </div>

      <div className="flex items-center gap-3.5 p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
          <Activity size={22} />
        </div>
        <div>
          <span className="text-xs font-semibold text-slate-500">Power Telemetry</span>
          <h4 className="text-base font-bold text-slate-900">50.02 Hz</h4>
        </div>
      </div>

      <div className="flex items-center gap-3.5 p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
          <ShieldCheck size={22} />
        </div>
        <div>
          <span className="text-xs font-semibold text-slate-500">Security Tier</span>
          <h4 className="text-base font-bold text-slate-900">Level 2 Verified</h4>
        </div>
      </div>
    </div>
  );
};
