import React from 'react';
import { User } from 'lucide-react';

interface AccountDetailsCardProps {
  user: {
    id?: string;
    fullName?: string;
    email?: string;
    role?: string;
  } | null;
}

export const AccountDetailsCard: React.FC<AccountDetailsCardProps> = ({ user }) => {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
            <User size={18} />
          </div>
          <h3 className="text-base font-bold text-slate-900">Personal Account Information</h3>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
          DETAILS
        </span>
      </div>

      <div className="divide-y divide-slate-100">
        <div className="py-3 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">Full Name</span>
          <span className="text-sm font-medium text-slate-900">{user?.fullName}</span>
        </div>

        <div className="py-3 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">Email Address</span>
          <span className="text-sm font-medium text-slate-900">{user?.email}</span>
        </div>

        <div className="py-3 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">System Role</span>
          <span className="text-xs font-bold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
            {user?.role}
          </span>
        </div>

        <div className="py-3 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">User ID</span>
          <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-600">
            {user?.id || 'N/A'}
          </span>
        </div>

        <div className="py-3 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">Authentication</span>
          <span className="text-xs font-medium text-emerald-700">JWT Token + Refresh Cookie</span>
        </div>
      </div>
    </div>
  );
};
