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
  Plus,
  Building,
  Smartphone,
  CalendarCheck,
} from 'lucide-react';
import { navigate } from '../../../app/router/navigation';
import { Employee, EmployeeRole, EmployeeStatus, WorkType } from '../types/employee.types';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TablePagination,
  TableLoadingState,
  TableEmptyState,
} from '../../../components/ui/table';
import { StatusPill } from '../../../components/ui/StatusPill';
import { Button } from '../../../components/ui/Button';

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
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-orange-50 text-orange-700 border border-orange-200/70">
            <ShieldCheck size={11} />
            ADMIN
          </span>
        );
      case 'MANAGER':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/70">
            <Briefcase size={11} />
            MANAGER
          </span>
        );
      case 'USER':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/70">
            <UserCheck size={11} />
            USER
          </span>
        );
    }
  };

  const getStatusBadge = (status: EmployeeStatus) => {
    if (status === 'ACTIVE') {
      return (
        <StatusPill variant="success" size="xs" dot dotPulse>
          Active
        </StatusPill>
      );
    }
    if (status === 'ON_LEAVE') {
      return (
        <StatusPill variant="warning" size="xs" dot>
          On Leave
        </StatusPill>
      );
    }
    return (
      <StatusPill variant="neutral" size="xs" dot>
        {status}
      </StatusPill>
    );
  };

  const getWorkTypeBadge = (workType: WorkType) => {
    if (workType === 'FIELD') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/70">
          <Smartphone size={11} />
          FIELD
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-sky-50 text-sky-700 border border-sky-200/70">
        <Building size={11} />
        OFFICE
      </span>
    );
  };

  return (
    <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <Table density="standard">
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-55">Employee</TableHead>
              <TableHead className="min-w-28">Work Type</TableHead>
              <TableHead className="min-w-45">Contact Details</TableHead>
              <TableHead className="min-w-37.5">Designation</TableHead>
              <TableHead className="min-w-30">System Role</TableHead>
              <TableHead className="min-w-30">Status</TableHead>
              <TableHead className="min-w-32.5">Joined Date</TableHead>
              <TableHead align="right" className="min-w-30">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableLoadingState columns={8} rows={6} />
            ) : employees.length === 0 ? (
              <TableEmptyState
                colSpan={8}
                icon={<Users size={24} />}
                title="No Employees Found"
                description={
                  searchQuery || roleFilter !== 'ALL' || statusFilter !== 'ALL'
                    ? 'No staff profiles match the current filter or search criteria.'
                    : 'No employees registered yet. Click "Add Employee" above to invite team members.'
                }
                action={
                  !searchQuery && roleFilter === 'ALL' && statusFilter === 'ALL' ? (
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={<Plus size={14} />}
                      onClick={onOpenCreate}
                    >
                      Add First Employee
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              employees.map((emp) => {
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
                  <TableRow key={emp.id}>
                    {/* Employee Info */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-900 text-white font-semibold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                          {initials}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-slate-900 text-[13px] flex items-center gap-1.5 truncate">
                            {emp.fullName}
                            {isCurrentUser && (
                              <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1 py-0.2 rounded border border-blue-200">
                                YOU
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Work Type */}
                    <TableCell>
                      {getWorkTypeBadge(emp.workType)}
                    </TableCell>

                    {/* Contact Details */}
                    <TableCell>
                      <div className="flex flex-col gap-0.5 max-w-[200px]">
                        {emp.phone ? (
                          <div className="flex items-center gap-1.5 font-medium text-slate-800 text-xs">
                            <Phone size={11} className="text-slate-400 shrink-0" />
                            {emp.phone.includes(',') ? (
                              <div className="flex items-center gap-1 min-w-0">
                                <span className="tabular-nums truncate">{emp.phone.split(',')[0].trim()}</span>
                                <span
                                  className="text-[10px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-1 py-0.2 rounded shrink-0 cursor-help"
                                  title={emp.phone.split(',').map((p) => p.trim()).join('\n')}
                                >
                                  +{emp.phone.split(',').length - 1}
                                </span>
                              </div>
                            ) : (
                              <span className="tabular-nums truncate">{emp.phone}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">No phone</span>
                        )}
                        {emp.email ? (
                          emp.email.includes(',') ? (
                            <div className="flex items-center gap-1 min-w-0">
                              <span className="text-slate-500 text-xs truncate" title={emp.email.split(',')[0].trim()}>
                                {emp.email.split(',')[0].trim()}
                              </span>
                              <span
                                className="text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-1 py-0.2 rounded shrink-0 cursor-help"
                                title={emp.email.split(',').map((e) => e.trim()).join('\n')}
                              >
                                +{emp.email.split(',').length - 1}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-500 text-xs truncate" title={emp.email}>{emp.email}</span>
                          )
                        ) : null}
                      </div>
                    </TableCell>

                    {/* Designation */}
                    <TableCell>
                      {emp.designation ? (
                        <span className="font-medium text-slate-800 text-xs truncate">{emp.designation}</span>
                      ) : (
                        <span className="text-slate-400 text-xs italic">—</span>
                      )}
                    </TableCell>

                    {/* Role */}
                    <TableCell>{getRoleBadge(emp.role)}</TableCell>

                    {/* Status */}
                    <TableCell>
                      {onToggleStatus ? (
                        <button
                          type="button"
                          onClick={() => onToggleStatus(emp)}
                          disabled={statusTogglingId === emp.id}
                          className="cursor-pointer transition-opacity hover:opacity-80 disabled:opacity-50"
                          title="Click to toggle status"
                        >
                          {statusTogglingId === emp.id ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
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
                    </TableCell>

                    {/* Joined Date */}
                    <TableCell className="text-xs text-slate-500 font-normal tabular-nums whitespace-nowrap">
                      {new Date(emp.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </TableCell>

                    {/* Actions */}
                    <TableCell align="right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-colors cursor-pointer shadow-2xs focus-visible:outline-2 focus-visible:outline-indigo-600"
                          onClick={() => navigate(`/attendance?employeeId=${emp.id}`)}
                          title="View Employee Attendance"
                          aria-label={`View attendance for ${emp.fullName}`}
                        >
                          <CalendarCheck size={13} />
                        </button>

                        <button
                          type="button"
                          className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-colors cursor-pointer shadow-2xs focus-visible:outline-2 focus-visible:outline-blue-600"
                          onClick={() => onEditEmployee(emp)}
                          title="Edit Employee / Assign Role"
                          aria-label={`Edit ${emp.fullName}`}
                        >
                          <Edit2 size={13} />
                        </button>

                        <button
                          type="button"
                          className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 hover:border-rose-200 transition-colors cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed shadow-2xs focus-visible:outline-2 focus-visible:outline-rose-600"
                          onClick={() => onDeleteEmployee(emp)}
                          title={isCurrentUser ? 'Cannot delete your own account' : 'Delete Employee'}
                          aria-label={`Delete ${emp.fullName}`}
                          disabled={isCurrentUser || deletingEmployeeId === emp.id}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {!loading && employees.length > 0 && (
        <TablePagination
          page={page}
          totalPages={totalPages}
          totalCount={totalCount}
          limit={limit}
          onPageChange={onPageChange}
          entityName="employees"
        />
      )}
    </div>
  );
};
