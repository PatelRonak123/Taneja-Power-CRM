import React from 'react';
import { ShieldCheck, CheckCircle2, UserCheck } from 'lucide-react';

interface RolePermissionsCardProps {
  role?: string;
}

export const RolePermissionsCard: React.FC<RolePermissionsCardProps> = ({ role }) => {
  const isAdmin = role === 'ADMIN';

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
            <ShieldCheck size={18} />
          </div>
          <h3 className="text-base font-bold text-slate-900">Role Access Control & Security Scope</h3>
        </div>
        <span className="text-[10px] font-bold px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
          {role || 'EMPLOYEE'} SCOPE
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {isAdmin ? (
          <>
            <div className="flex items-center gap-2.5 p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-xl text-xs font-semibold text-emerald-900">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>User & Employee Management</span>
            </div>
            <div className="flex items-center gap-2.5 p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-xl text-xs font-semibold text-emerald-900">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>Customer & Destination CRUD</span>
            </div>
            <div className="flex items-center gap-2.5 p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-xl text-xs font-semibold text-emerald-900">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>Field Task Creation & Scheduling</span>
            </div>
            <div className="flex items-center gap-2.5 p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-xl text-xs font-semibold text-emerald-900">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>WhatsApp Admin Singleton Integration</span>
            </div>
            <div className="flex items-center gap-2.5 p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-xl text-xs font-semibold text-emerald-900">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>Full Equipment & Inventory Control</span>
            </div>
            <div className="flex items-center gap-2.5 p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-xl text-xs font-semibold text-emerald-900">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>Telemetry & Audit Logs Access</span>
            </div>
          </>
        ) : role === 'MANAGER' ? (
          <>
            <div className="flex items-center gap-2.5 p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-xl text-xs font-semibold text-emerald-900">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>Customer & Destination Viewing</span>
            </div>
            <div className="flex items-center gap-2.5 p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-xl text-xs font-semibold text-emerald-900">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>Field Task Assignment & Tracking</span>
            </div>
            <div className="flex items-center gap-2.5 p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-xl text-xs font-semibold text-emerald-900">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>Inventory Management</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2.5 p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-xl text-xs font-semibold text-emerald-900">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>Assigned Field Tasks Execution</span>
            </div>
            <div className="flex items-center gap-2.5 p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-xl text-xs font-semibold text-emerald-900">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>Customer Destination Navigation</span>
            </div>
            <div className="flex items-center gap-2.5 p-3 bg-blue-50/60 border border-blue-200/80 rounded-xl text-xs font-semibold text-blue-900">
              <UserCheck size={16} className="text-blue-600 shrink-0" />
              <span>Personal Profile & Credentials</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
