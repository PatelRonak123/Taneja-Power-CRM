import React from 'react';
import { Clock } from 'lucide-react';

interface EmployeeActivityFeedProps {
  email?: string;
}

export const EmployeeActivityFeed: React.FC<EmployeeActivityFeedProps> = ({ email }) => {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
            <Clock size={18} />
          </div>
          <h3 className="text-base font-bold text-slate-900">System Activity & Logs</h3>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full animate-pulse">
          LIVE FEED
        </span>
      </div>

      <div className="divide-y divide-slate-100">
        <div className="py-3 flex items-start gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
          <div className="flex-1">
            <div className="text-xs font-bold text-slate-900">User Authentication Validated</div>
            <div className="text-xs text-slate-500">Session established for {email}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Just now</div>
          </div>
        </div>

        <div className="py-3 flex items-start gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
          <div className="flex-1">
            <div className="text-xs font-bold text-slate-900">Database Sync Operational</div>
            <div className="text-xs text-slate-500">PostgreSQL connection pool healthy (Drizzle ORM)</div>
            <div className="text-[11px] text-slate-400 mt-0.5">10 mins ago</div>
          </div>
        </div>

        <div className="py-3 flex items-start gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
          <div className="flex-1">
            <div className="text-xs font-bold text-slate-900">Inventory Catalog Refreshed</div>
            <div className="text-xs text-slate-500">Power equipment records synchronized</div>
            <div className="text-[11px] text-slate-400 mt-0.5">1 hour ago</div>
          </div>
        </div>
      </div>
    </div>
  );
};
