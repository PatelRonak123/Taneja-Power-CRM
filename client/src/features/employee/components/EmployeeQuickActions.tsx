import React from 'react';
import { Zap, PackageCheck, TrendingUp, User, ArrowRight } from 'lucide-react';
import { navigate } from '../../../app/router/navigation';

export const EmployeeQuickActions: React.FC = () => {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
            <Zap size={18} />
          </div>
          <h3 className="text-base font-bold text-slate-900">Operations & Quick Actions</h3>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
          Shortcuts
        </span>
      </div>

      <div className="flex flex-col gap-3">
        <button
          className="flex items-center justify-between p-4 bg-slate-50 hover:bg-blue-50/60 border border-slate-200/80 hover:border-blue-200 rounded-xl transition-all cursor-pointer group text-left"
          onClick={() => navigate('/products')}
        >
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl group-hover:scale-105 transition-transform">
              <PackageCheck size={20} />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-900 block group-hover:text-blue-700">Browse Inventory</span>
              <span className="text-xs text-slate-500">Search equipment, transformers & power units</span>
            </div>
          </div>
          <ArrowRight size={16} className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all shrink-0" />
        </button>

        <button
          className="flex items-center justify-between p-4 bg-slate-50 hover:bg-amber-50/60 border border-slate-200/80 hover:border-amber-200 rounded-xl transition-all cursor-pointer group text-left"
          onClick={() => navigate('/analytics')}
        >
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl group-hover:scale-105 transition-transform">
              <TrendingUp size={20} />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-900 block group-hover:text-amber-700">Energy Telemetry</span>
              <span className="text-xs text-slate-500">Monitor real-time load analytics & frequency</span>
            </div>
          </div>
          <ArrowRight size={16} className="text-slate-400 group-hover:text-amber-600 group-hover:translate-x-1 transition-all shrink-0" />
        </button>

        <button
          className="flex items-center justify-between p-4 bg-slate-50 hover:bg-indigo-50/60 border border-slate-200/80 hover:border-indigo-200 rounded-xl transition-all cursor-pointer group text-left"
          onClick={() => navigate('/profile')}
        >
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl group-hover:scale-105 transition-transform">
              <User size={20} />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-900 block group-hover:text-indigo-700">Account & Security</span>
              <span className="text-xs text-slate-500">Manage profile details & change password</span>
            </div>
          </div>
          <ArrowRight size={16} className="text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all shrink-0" />
        </button>
      </div>
    </div>
  );
};
