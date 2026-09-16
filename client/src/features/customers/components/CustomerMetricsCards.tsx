import React from 'react';
import { Building2, CheckCircle2, AlertCircle, MapPin } from 'lucide-react';
import { CustomerMetrics } from '../types/customer.types';

interface CustomerMetricsCardsProps {
  metrics: CustomerMetrics;
}

export const CustomerMetricsCards: React.FC<CustomerMetricsCardsProps> = ({ metrics }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Customers */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 flex items-center justify-between shadow-xs hover:shadow-md hover:border-blue-300/80 transition-all duration-200 group">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Clients</span>
          <span className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">{metrics.total}</span>
          <span className="text-[11px] text-slate-400 font-medium">{metrics.active} active accounts</span>
        </div>
        <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200/60 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-xs">
          <Building2 size={22} />
        </div>
      </div>

      {/* Active Clients */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 flex items-center justify-between shadow-xs hover:shadow-md hover:border-emerald-300/80 transition-all duration-200 group">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Clients</span>
          <span className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">{metrics.active}</span>
          <span className="text-[11px] text-emerald-600/80 font-medium">In good standing</span>
        </div>
        <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200/60 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-xs">
          <CheckCircle2 size={22} />
        </div>
      </div>

      {/* Inactive Accounts */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 flex items-center justify-between shadow-xs hover:shadow-md hover:border-rose-300/80 transition-all duration-200 group">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Inactive Clients</span>
          <span className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">{metrics.inactive}</span>
          <span className="text-[11px] text-rose-600/80 font-medium">Suspended / dormant</span>
        </div>
        <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200/60 text-rose-600 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-rose-600 group-hover:text-white transition-all shadow-xs">
          <AlertCircle size={22} />
        </div>
      </div>

      {/* Total Destinations */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 flex items-center justify-between shadow-xs hover:shadow-md hover:border-indigo-300/80 transition-all duration-200 group">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Service Sites</span>
          <span className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">{metrics.totalDestinations}</span>
          <span className="text-[11px] text-indigo-600/80 font-medium">Mapped destinations</span>
        </div>
        <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200/60 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-xs">
          <MapPin size={22} />
        </div>
      </div>
    </div>
  );
};

