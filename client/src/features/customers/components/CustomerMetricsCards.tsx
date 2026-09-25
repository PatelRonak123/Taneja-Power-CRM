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
      <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between shadow-xs transition-colors hover:border-slate-300">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-slate-500">Total Clients</span>
          <span className="text-[22px] font-semibold text-slate-900 tabular-nums leading-tight">{metrics.total}</span>
          <span className="text-xs text-slate-400">{metrics.active} active accounts</span>
        </div>
        <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
          <Building2 size={18} />
        </div>
      </div>

      {/* Active Clients */}
      <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between shadow-xs transition-colors hover:border-slate-300">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-slate-500">Active Clients</span>
          <span className="text-[22px] font-semibold text-slate-900 tabular-nums leading-tight">{metrics.active}</span>
          <span className="text-xs text-emerald-600 font-medium">In good standing</span>
        </div>
        <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
          <CheckCircle2 size={18} />
        </div>
      </div>

      {/* Inactive Accounts */}
      <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between shadow-xs transition-colors hover:border-slate-300">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-slate-500">Inactive Clients</span>
          <span className="text-[22px] font-semibold text-slate-900 tabular-nums leading-tight">{metrics.inactive}</span>
          <span className="text-xs text-rose-600 font-medium">Suspended / dormant</span>
        </div>
        <div className="w-10 h-10 rounded-lg bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0">
          <AlertCircle size={18} />
        </div>
      </div>

      {/* Total Destinations */}
      <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between shadow-xs transition-colors hover:border-slate-300">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-slate-500">Service Sites</span>
          <span className="text-[22px] font-semibold text-slate-900 tabular-nums leading-tight">{metrics.totalDestinations}</span>
          <span className="text-xs text-indigo-600 font-medium">Mapped destinations</span>
        </div>
        <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
          <MapPin size={18} />
        </div>
      </div>
    </div>
  );
};
