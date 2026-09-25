import React from 'react';
import {
  Users,
  ShieldCheck,
  Briefcase,
  UserCheck,
  RefreshCw,
  Phone,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Building,
  Smartphone,
  CalendarCheck,
  CalendarX,
} from 'lucide-react';
import { navigate } from '../../../app/router/navigation';
import { Employee, EmployeeRole, EmployeeStatus, WorkType } from '../types/employee.types';

interface EmployeeTableProps {
  employees: Employee[];
  loading: boolean;
  searchQuery: string;
  roleFilter: string;
  statusFilter: string;
  currentUserId?: string;
  statusTogglingId?: string | null;
  deletingEmployeeId: string | null;
  onToggleStatus?: (employee: Employee) => void;
  onEditEmployee: (employee: Employee) => void;
  onDeleteEmployee: (employee: Employee) => void;
  page: number;
  limit: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (newPage: number) => void;
  onOpenCreate: () => void;
}

export const EmployeeTable: React.FC<EmployeeTableProps> = ({
  employees,
  loading,
  searchQuery,
  roleFilter,
  statusFilter,
  currentUserId,
  statusTogglingId,
  deletingEmployeeId,
  onToggleStatus,
  onEditEmployee,
  onDeleteEmployee,
  page,
  limit,
  totalPages,
  totalCount,
  onPageChange,
  onOpenCreate,
}) => {
  const getRoleBadge = (role: EmployeeRole) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-orange-50 text-orange-700 border border-orange-200/70">
            <ShieldCheck size={12} />
            ADMIN
          </span>
        );
      case 'MANAGER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/70">
            <Briefcase size={12} />
            MANAGER
          </span>
        );
      case 'USER':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200/70">
            <UserCheck size={12} />
            USER
          </span>
        );
    }
  };

  const getStatusBadge = (status: EmployeeStatus) => {
    let bgClass = 'bg-slate-100 text-slate-600 border border-slate-200';
    let dotClass = 'bg-slate-400';
    if (status === 'ACTIVE') {
      bgClass = 'bg-emerald-50 text-emerald-700 border border-emerald-200/70';
      dotClass = 'bg-emerald-500';
    } else if (status === 'ON_LEAVE') {
      bgClass = 'bg-amber-50 text-amber-700 border border-amber-200/70';
      dotClass = 'bg-amber-500';
    }

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${bgClass}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
        {status === 'ON_LEAVE' ? 'ON LEAVE' : status}
      </span>
    );
  };

  const getWorkTypeBadge = (workType: WorkType) => {
    if (workType === 'FIELD') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/70">
          <Smartphone size={11} />
          FIELD
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200/70">
        <Building size={11} />
        OFFICE
      </span>
    );
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden flex flex-col">
      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3 text-center">
          <RefreshCw size={32} className="animate-spin text-blue-600" />
          <p className="text-sm font-semibold text-slate-500">Fetching employee records from database...</p>
        </div>
      ) : employees.length === 0 ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-400">
            <Users size={28} />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Employees Found</h3>
          <p className="text-xs text-slate-500 max-w-md">
            {searchQuery || roleFilter !== 'ALL' || statusFilter !== 'ALL'
              ? 'No staff profiles match the current filter or search criteria.'
              : 'No employees registered yet. Click "Add Employee" above to invite team members.'}
          </p>
          {!searchQuery && roleFilter === 'ALL' && statusFilter === 'ALL' && (
            <button
              onClick={onOpenCreate}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Plus size={16} />
              <span>Add First Employee</span>
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-6 min-w-55">Employee</th>
                  <th className="py-3.5 px-4 min-w-28">Work Type</th>
                  <th className="py-3.5 px-4 min-w-45">Contact Details</th>
                  <th className="py-3.5 px-4 min-w-37.5">Designation</th>
                  <th className="py-3.5 px-4 min-w-30">System Role</th>
                  <th className="py-3.5 px-4 min-w-30">Status</th>
                  <th className="py-3.5 px-4 min-w-32.5">Joined Date</th>
                  <th className="py-3.5 px-6 text-right min-w-30">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {employees.map((emp) => {
                  const isCurrentUser = emp.id === currentUserId;
                  const initials = emp.fullName
                    ? emp.fullName
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)
                    : 'U';

                  return (
                    <tr key={emp.id} className="hover:bg-blue-50/20 transition-colors">
                      {/* Employee Info */}
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-linear-to-br from-blue-600 to-indigo-700 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                            {initials}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                              {emp.fullName}
                              {isCurrentUser && (
                                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                                  YOU
                                </span>
                              )}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              ID: {emp.id.slice(0, 8)}...
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Work Type */}
                      <td className="py-3.5 px-4">
                        {getWorkTypeBadge(emp.workType)}
                      </td>

                      {/* Contact Details */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-0.5">
                          {emp.phone ? (
                            <div className="flex items-center gap-1.5 font-semibold text-slate-800 text-xs">
                              <Phone size={11} className="text-slate-400 shrink-0" />
                              <span>{emp.phone}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs italic">No phone</span>
                          )}
                          <span className="text-slate-500 text-xs">{emp.email}</span>
                        </div>
                      </td>

                      {/* Designation */}
                      <td className="py-3.5 px-4">
                        {emp.designation ? (
                          <span className="font-medium text-slate-800 text-xs">{emp.designation}</span>
                        ) : (
                          <span className="text-slate-400 text-xs italic">—</span>
                        )}
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-4">{getRoleBadge(emp.role)}</td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {onToggleStatus ? (
                          <button
                            type="button"
                            onClick={() => onToggleStatus(emp)}
                            disabled={statusTogglingId === emp.id}
                            className="cursor-pointer transition-opacity hover:opacity-80 disabled:opacity-50"
                            title="Click to toggle status"
                          >
                            {statusTogglingId === emp.id ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                <RefreshCw size={10} className="animate-spin" />
                                Updating...
                              </span>
                            ) : (
                              getStatusBadge(emp.status)
                            )}
                          </button>
                        ) : (
                          getStatusBadge(emp.status)
                        )}
                      </td>

                      {/* Joined Date */}
                      <td className="py-3.5 px-4 text-xs text-slate-500 font-medium whitespace-nowrap">
                        {new Date(emp.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            className="p-1.5 rounded-lg border border-slate-200/80 bg-slate-50 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-all cursor-pointer shadow-2xs"
                            onClick={() => navigate(`/attendance?employeeId=${emp.id}`)}
                            title="View Employee Attendance"
                          >
                            <CalendarCheck size={13} />
                          </button>

                          {onToggleStatus && (
                            <button
                              type="button"
                              className={`p-1.5 rounded-lg border transition-all cursor-pointer shadow-2xs ${
                                emp.status === 'ON_LEAVE'
                                  ? 'bg-amber-500 text-white border-amber-600 hover:bg-amber-600'
                                  : 'bg-slate-50 border-slate-200/80 text-slate-500 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200'
                              }`}
                              onClick={() => {
                                const nextStatus = emp.status === 'ON_LEAVE' ? 'ACTIVE' : 'ON_LEAVE';
                                onToggleStatus({ ...emp, status: nextStatus as any });
                              }}
                              title={emp.status === 'ON_LEAVE' ? 'End Leave (Set Active)' : 'Mark On Leave'}
                            >
                              <CalendarX size={13} />
                            </button>
                          )}

                          <button
                            type="button"
                            className="p-1.5 rounded-lg border border-slate-200/80 bg-slate-50 hover:bg-blue-50 text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all cursor-pointer shadow-2xs"
                            onClick={() => onEditEmployee(emp)}
                            title="Edit Employee / Assign Role"
                          >
                            <Edit2 size={13} />
                          </button>

                          <button
                            type="button"
                            className="p-1.5 rounded-lg border border-slate-200/80 bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 hover:border-rose-200 transition-all cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed shadow-2xs"
                            onClick={() => onDeleteEmployee(emp)}
                            title={isCurrentUser ? 'Cannot delete your own account' : 'Delete Employee'}
                            disabled={isCurrentUser || deletingEmployeeId === emp.id}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="px-6 py-3.5 border-t border-slate-200/80 bg-slate-50/60 flex items-center justify-between text-xs text-slate-600">
            <div>
              Showing <span className="font-bold text-slate-900">{(page - 1) * limit + 1}</span> to{' '}
              <span className="font-bold text-slate-900">{Math.min(page * limit, totalCount)}</span> of{' '}
              <span className="font-black text-slate-900">{totalCount}</span> employees
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
                className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-700 flex items-center justify-center hover:bg-slate-100 hover:border-slate-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-2 font-bold text-slate-900">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
                className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-700 flex items-center justify-center hover:bg-slate-100 hover:border-slate-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

