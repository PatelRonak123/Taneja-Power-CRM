import React from 'react';
import { ShieldCheck, Briefcase, Mail, Calendar, Building, Smartphone } from 'lucide-react';

interface ProfileHeaderCardProps {
  user: {
    fullName?: string;
    email?: string;
    role?: string;
    workType?: 'OFFICE' | 'FIELD';
    designation?: string | null;
  } | null;
}

export const ProfileHeaderCard: React.FC<ProfileHeaderCardProps> = ({ user }) => {
  const isAdmin = user?.role === 'ADMIN';
  const userInitials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-6 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
      <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-blue-600 to-indigo-700 text-white font-black text-2xl flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
        {userInitials}
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/60">
            {isAdmin ? <ShieldCheck size={14} /> : <Briefcase size={14} />}
            {user?.role || 'EMPLOYEE'}
          </span>
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
              user?.workType === 'FIELD'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-sky-50 text-sky-700 border-sky-200'
            }`}
          >
            {user?.workType === 'FIELD' ? <Smartphone size={13} /> : <Building size={13} />}
            {user?.workType || 'OFFICE'} WORKFORCE
          </span>
          {user?.designation && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              {user.designation}
            </span>
          )}
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            SYSTEM VERIFIED
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          {user?.fullName || 'User Name'}
        </h1>
        <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500">
          <span className="flex items-center gap-1.5">
            <Mail size={14} className="text-slate-400" />
            {user?.email}
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar size={14} className="text-slate-400" />
            Member Account
          </span>
        </div>
      </div>
    </div>
  );
};
