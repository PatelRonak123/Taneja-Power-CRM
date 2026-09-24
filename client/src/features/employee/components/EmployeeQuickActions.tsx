import React from 'react';
import {
  CalendarCheck,
  Target,
  FileSpreadsheet,
  Layers,
  ClipboardList,
  Building2,
  PackageCheck,
  ArrowRight,
  Zap,
  ShieldCheck,
  Wrench,
  Users,
  User,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { navigate } from '../../../app/router/navigation';
import { useAuthStore } from '../../../stores/authStore';
import { attendanceService } from '../../attendance/services/attendanceService';

export const EmployeeQuickActions: React.FC = () => {
  const { user } = useAuthStore();
  const designation = (user?.designation || '').toLowerCase();
  const isSalesOffice = user?.workType === 'OFFICE' && designation.includes('sales');
  const isServiceOffice = user?.workType === 'OFFICE' && designation.includes('service');
  const isHrOffice =
    (user?.role === 'USER' || (user as any)?.role === 'HR') &&
    user?.workType === 'OFFICE' &&
    (designation.includes('hr') || designation.includes('human resources'));

  // Fetch today's attendance state
  const { data: attendanceRes } = useQuery({
    queryKey: ['my-today-attendance'],
    queryFn: () => attendanceService.getMyAttendance(),
    staleTime: 60000,
  });

  const attendanceStatus = attendanceRes?.data?.status;
  const attendanceBadge =
    attendanceStatus === 'CHECKED_IN'
      ? { label: 'Checked In Today', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300' }
      : attendanceStatus === 'CHECKED_OUT'
      ? { label: 'Checked Out Today', bg: 'bg-slate-100 text-slate-700 border-slate-300' }
      : { label: 'Not Checked In', bg: 'bg-amber-100 text-amber-800 border-amber-300' };

  if (isHrOffice) {
    return (
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Users size={18} />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900">HR Operations & Shortcuts</h3>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
            Shortcuts
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* My Attendance */}
          <button
            type="button"
            className="flex items-center justify-between p-3.5 sm:p-4 bg-emerald-50/70 hover:bg-emerald-100/70 border border-emerald-200/80 rounded-xl transition-all cursor-pointer group text-left shadow-2xs"
            onClick={() => navigate('/employee/attendance')}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 bg-emerald-600 text-white rounded-xl group-hover:scale-105 transition-transform shadow-xs shrink-0">
                <CalendarCheck size={18} />
              </div>
              <div className="min-w-0">
                <span className="text-xs sm:text-sm font-bold text-slate-900 block truncate group-hover:text-emerald-800">
                  My Attendance
                </span>
                <span className={`inline-block mt-0.5 text-[10px] font-bold px-1.5 py-0.2 rounded border ${attendanceBadge.bg}`}>
                  {attendanceBadge.label}
                </span>
              </div>
            </div>
            <ArrowRight size={15} className="text-slate-400 group-hover:text-emerald-700 group-hover:translate-x-1 transition-all shrink-0" />
          </button>

          {/* Employee Attendance */}
          <button
            type="button"
            className="flex items-center justify-between p-3.5 sm:p-4 bg-blue-50/70 hover:bg-blue-100/70 border border-blue-200/80 rounded-xl transition-all cursor-pointer group text-left shadow-2xs"
            onClick={() => navigate('/attendance')}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 bg-blue-600 text-white rounded-xl group-hover:scale-105 transition-transform shadow-xs shrink-0">
                <CalendarCheck size={18} />
              </div>
              <div className="min-w-0">
                <span className="text-xs sm:text-sm font-bold text-slate-900 block truncate group-hover:text-blue-800">
                  Employee Attendance
                </span>
                <span className="text-[11px] text-slate-500 truncate block">Workforce duty logs</span>
              </div>
            </div>
            <ArrowRight size={15} className="text-slate-400 group-hover:text-blue-700 group-hover:translate-x-1 transition-all shrink-0" />
          </button>

          {/* Employee Management */}
          <button
            type="button"
            className="flex items-center justify-between p-3.5 sm:p-4 bg-indigo-50/70 hover:bg-indigo-100/70 border border-indigo-200/80 rounded-xl transition-all cursor-pointer group text-left shadow-2xs"
            onClick={() => navigate('/employees')}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 bg-indigo-600 text-white rounded-xl group-hover:scale-105 transition-transform shadow-xs shrink-0">
                <Users size={18} />
              </div>
              <div className="min-w-0">
                <span className="text-xs sm:text-sm font-bold text-slate-900 block truncate group-hover:text-indigo-800">
                  Employee Management
                </span>
                <span className="text-[11px] text-slate-500 truncate block">Directory & staff onboarding</span>
              </div>
            </div>
            <ArrowRight size={15} className="text-slate-400 group-hover:text-indigo-700 group-hover:translate-x-1 transition-all shrink-0" />
          </button>

          {/* My Profile */}
          <button
            type="button"
            className="flex items-center justify-between p-3.5 sm:p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-xl transition-all cursor-pointer group text-left shadow-2xs"
            onClick={() => navigate('/profile')}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 bg-slate-700 text-white rounded-xl group-hover:scale-105 transition-transform shadow-xs shrink-0">
                <User size={18} />
              </div>
              <div className="min-w-0">
                <span className="text-xs sm:text-sm font-bold text-slate-900 block truncate group-hover:text-slate-900">
                  My Profile
                </span>
                <span className="text-[11px] text-slate-500 truncate block">Account settings & security</span>
              </div>
            </div>
            <ArrowRight size={15} className="text-slate-400 group-hover:text-slate-700 group-hover:translate-x-1 transition-all shrink-0" />
          </button>
        </div>
      </div>
    );
  }

  if (isServiceOffice) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Wrench size={18} />
            </div>
            <h3 className="text-base font-bold text-slate-900">Service Operations & Shortcuts</h3>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
            Shortcuts
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Daily Attendance Action */}
          <button
            type="button"
            className="flex items-center justify-between p-4 bg-emerald-50/70 hover:bg-emerald-100/70 border border-emerald-200/80 rounded-xl transition-all cursor-pointer group text-left shadow-2xs"
            onClick={() => navigate('/employee/attendance')}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-600 text-white rounded-xl group-hover:scale-105 transition-transform shadow-xs shrink-0">
                <CalendarCheck size={18} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900 truncate group-hover:text-emerald-800">
                    Daily Attendance
                  </span>
                </div>
                <span className={`inline-block mt-0.5 text-[10px] font-bold px-1.5 py-0.2 rounded border ${attendanceBadge.bg}`}>
                  {attendanceBadge.label}
                </span>
              </div>
            </div>
            <ArrowRight size={15} className="text-slate-400 group-hover:text-emerald-700 group-hover:translate-x-1 transition-all shrink-0" />
          </button>

          {/* Field Service Reports Action */}
          <button
            type="button"
            className="flex items-center justify-between p-4 bg-blue-50/70 hover:bg-blue-100/70 border border-blue-200/80 rounded-xl transition-all cursor-pointer group text-left shadow-2xs"
            onClick={() => navigate('/field-service')}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-600 text-white rounded-xl group-hover:scale-105 transition-transform shadow-xs shrink-0">
                <Wrench size={18} />
              </div>
              <div className="min-w-0">
                <span className="text-sm font-bold text-slate-900 block truncate group-hover:text-blue-800">
                  Field Service (FSR)
                </span>
                <span className="text-xs text-slate-500 truncate block">Reports & site visits</span>
              </div>
            </div>
            <ArrowRight size={15} className="text-slate-400 group-hover:text-blue-700 group-hover:translate-x-1 transition-all shrink-0" />
          </button>

          {/* AMC Contracts Action */}
          <button
            type="button"
            className="flex items-center justify-between p-4 bg-teal-50/70 hover:bg-teal-100/70 border border-teal-200/80 rounded-xl transition-all cursor-pointer group text-left shadow-2xs"
            onClick={() => navigate('/amc-contracts')}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-teal-600 text-white rounded-xl group-hover:scale-105 transition-transform shadow-xs shrink-0">
                <ShieldCheck size={18} />
              </div>
              <div className="min-w-0">
                <span className="text-sm font-bold text-slate-900 block truncate group-hover:text-teal-800">
                  AMC Contracts
                </span>
                <span className="text-xs text-slate-500 truncate block">Agreements & schedules</span>
              </div>
            </div>
            <ArrowRight size={15} className="text-slate-400 group-hover:text-teal-700 group-hover:translate-x-1 transition-all shrink-0" />
          </button>

          {/* Service Quotations Action */}
          <button
            type="button"
            className="flex items-center justify-between p-4 bg-amber-50/70 hover:bg-amber-100/70 border border-amber-200/80 rounded-xl transition-all cursor-pointer group text-left shadow-2xs"
            onClick={() => navigate('/quotations')}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-600 text-white rounded-xl group-hover:scale-105 transition-transform shadow-xs shrink-0">
                <FileSpreadsheet size={18} />
              </div>
              <div className="min-w-0">
                <span className="text-sm font-bold text-slate-900 block truncate group-hover:text-amber-800">
                  Service Quotations
                </span>
                <span className="text-xs text-slate-500 truncate block">View service & AMC quotes</span>
              </div>
            </div>
            <ArrowRight size={15} className="text-slate-400 group-hover:text-amber-700 group-hover:translate-x-1 transition-all shrink-0" />
          </button>

          {/* Customer Directory Action */}
          <button
            type="button"
            className="flex items-center justify-between p-4 bg-sky-50/70 hover:bg-sky-100/70 border border-sky-200/80 rounded-xl transition-all cursor-pointer group text-left shadow-2xs"
            onClick={() => navigate('/customers')}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-sky-600 text-white rounded-xl group-hover:scale-105 transition-transform shadow-xs shrink-0">
                <Building2 size={18} />
              </div>
              <div className="min-w-0">
                <span className="text-sm font-bold text-slate-900 block truncate group-hover:text-sky-800">
                  Customer Directory
                </span>
                <span className="text-xs text-slate-500 truncate block">Client sites & accounts</span>
              </div>
            </div>
            <ArrowRight size={15} className="text-slate-400 group-hover:text-sky-700 group-hover:translate-x-1 transition-all shrink-0" />
          </button>

          {/* My Tasks Action */}
          <button
            type="button"
            className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-xl transition-all cursor-pointer group text-left shadow-2xs"
            onClick={() => navigate('/tasks')}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-slate-700 text-white rounded-xl group-hover:scale-105 transition-transform shadow-xs shrink-0">
                <ClipboardList size={18} />
              </div>
              <div className="min-w-0">
                <span className="text-sm font-bold text-slate-900 block truncate group-hover:text-slate-900">
                  My Assigned Tasks
                </span>
                <span className="text-xs text-slate-500 truncate block">Work orders & schedule</span>
              </div>
            </div>
            <ArrowRight size={15} className="text-slate-400 group-hover:text-slate-700 group-hover:translate-x-1 transition-all shrink-0" />
          </button>
        </div>
      </div>
    );
  }

  if (isSalesOffice) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Zap size={18} />
            </div>
            <h3 className="text-base font-bold text-slate-900">Sales Operations & Shortcuts</h3>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
            Shortcuts
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Daily Attendance Action */}
          <button
            type="button"
            className="flex items-center justify-between p-4 bg-emerald-50/70 hover:bg-emerald-100/70 border border-emerald-200/80 rounded-xl transition-all cursor-pointer group text-left shadow-2xs"
            onClick={() => navigate('/employee/attendance')}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-600 text-white rounded-xl group-hover:scale-105 transition-transform shadow-xs shrink-0">
                <CalendarCheck size={18} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900 truncate group-hover:text-emerald-800">
                    Daily Attendance
                  </span>
                </div>
                <span className={`inline-block mt-0.5 text-[10px] font-bold px-1.5 py-0.2 rounded border ${attendanceBadge.bg}`}>
                  {attendanceBadge.label}
                </span>
              </div>
            </div>
            <ArrowRight size={15} className="text-slate-400 group-hover:text-emerald-700 group-hover:translate-x-1 transition-all shrink-0" />
          </button>

          {/* Create Quotation Action */}
          <button
            type="button"
            className="flex items-center justify-between p-4 bg-amber-50/70 hover:bg-amber-100/70 border border-amber-200/80 rounded-xl transition-all cursor-pointer group text-left shadow-2xs"
            onClick={() => navigate('/quotations/new')}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-600 text-white rounded-xl group-hover:scale-105 transition-transform shadow-xs shrink-0">
                <FileSpreadsheet size={18} />
              </div>
              <div className="min-w-0">
                <span className="text-sm font-bold text-slate-900 block truncate group-hover:text-amber-800">
                  Create Quotation
                </span>
                <span className="text-xs text-slate-500 truncate block">New proposal draft</span>
              </div>
            </div>
            <ArrowRight size={15} className="text-slate-400 group-hover:text-amber-700 group-hover:translate-x-1 transition-all shrink-0" />
          </button>

          {/* Create Lead Action */}
          <button
            type="button"
            className="flex items-center justify-between p-4 bg-blue-50/70 hover:bg-blue-100/70 border border-blue-200/80 rounded-xl transition-all cursor-pointer group text-left shadow-2xs"
            onClick={() => navigate('/leads')}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-600 text-white rounded-xl group-hover:scale-105 transition-transform shadow-xs shrink-0">
                <Target size={18} />
              </div>
              <div className="min-w-0">
                <span className="text-sm font-bold text-slate-900 block truncate group-hover:text-blue-800">
                  Manage Leads
                </span>
                <span className="text-xs text-slate-500 truncate block">Capture & qualify prospects</span>
              </div>
            </div>
            <ArrowRight size={15} className="text-slate-400 group-hover:text-blue-700 group-hover:translate-x-1 transition-all shrink-0" />
          </button>

          {/* Deals Pipeline Action */}
          <button
            type="button"
            className="flex items-center justify-between p-4 bg-indigo-50/70 hover:bg-indigo-100/70 border border-indigo-200/80 rounded-xl transition-all cursor-pointer group text-left shadow-2xs"
            onClick={() => navigate('/pipeline')}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-600 text-white rounded-xl group-hover:scale-105 transition-transform shadow-xs shrink-0">
                <Layers size={18} />
              </div>
              <div className="min-w-0">
                <span className="text-sm font-bold text-slate-900 block truncate group-hover:text-indigo-800">
                  Deals Pipeline
                </span>
                <span className="text-xs text-slate-500 truncate block">Kanban stages & values</span>
              </div>
            </div>
            <ArrowRight size={15} className="text-slate-400 group-hover:text-indigo-700 group-hover:translate-x-1 transition-all shrink-0" />
          </button>

          {/* My Tasks Action */}
          <button
            type="button"
            className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-xl transition-all cursor-pointer group text-left shadow-2xs"
            onClick={() => navigate('/tasks')}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-slate-700 text-white rounded-xl group-hover:scale-105 transition-transform shadow-xs shrink-0">
                <ClipboardList size={18} />
              </div>
              <div className="min-w-0">
                <span className="text-sm font-bold text-slate-900 block truncate group-hover:text-slate-900">
                  My Assigned Tasks
                </span>
                <span className="text-xs text-slate-500 truncate block">Work orders & schedule</span>
              </div>
            </div>
            <ArrowRight size={15} className="text-slate-400 group-hover:text-slate-700 group-hover:translate-x-1 transition-all shrink-0" />
          </button>

          {/* Customers Directory Action */}
          <button
            type="button"
            className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-xl transition-all cursor-pointer group text-left shadow-2xs"
            onClick={() => navigate('/customers')}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-sky-600 text-white rounded-xl group-hover:scale-105 transition-transform shadow-xs shrink-0">
                <Building2 size={18} />
              </div>
              <div className="min-w-0">
                <span className="text-sm font-bold text-slate-900 block truncate group-hover:text-sky-800">
                  Customer Directory
                </span>
                <span className="text-xs text-slate-500 truncate block">Client sites & accounts</span>
              </div>
            </div>
            <ArrowRight size={15} className="text-slate-400 group-hover:text-sky-700 group-hover:translate-x-1 transition-all shrink-0" />
          </button>
        </div>
      </div>
    );
  }

  // Fallback for non-sales employee profiles
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
          className="flex items-center justify-between p-4 bg-emerald-50/70 hover:bg-emerald-100/60 border border-emerald-200/80 rounded-xl transition-all cursor-pointer group text-left shadow-2xs"
          onClick={() => navigate('/employee/attendance')}
        >
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-emerald-600 text-white rounded-xl group-hover:scale-105 transition-transform shadow-xs">
              <CalendarCheck size={20} />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-900 block group-hover:text-emerald-800">
                Daily Attendance & Check-In
              </span>
              <span className="text-xs text-slate-500">Record check-in / check-out timestamps</span>
            </div>
          </div>
          <ArrowRight size={16} className="text-slate-400 group-hover:text-emerald-700 group-hover:translate-x-1 transition-all shrink-0" />
        </button>

        <button
          className="flex items-center justify-between p-4 bg-slate-50 hover:bg-blue-50/60 border border-slate-200/80 hover:border-blue-200 rounded-xl transition-all cursor-pointer group text-left"
          onClick={() => navigate('/products')}
        >
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl group-hover:scale-105 transition-transform">
              <PackageCheck size={20} />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-900 block group-hover:text-blue-700">Browse Catalog</span>
              <span className="text-xs text-slate-500">Search products & power equipment</span>
            </div>
          </div>
          <ArrowRight size={16} className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all shrink-0" />
        </button>
      </div>
    </div>
  );
};
