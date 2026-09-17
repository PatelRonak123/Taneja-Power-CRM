import React from 'react';
import {
  Eye,
  Edit2,
  XCircle,
  Building2,
  MapPin,
  Calendar,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
  Radio,
} from 'lucide-react';
import { TaskItem, TaskPriority, TaskStatus } from '../types/task.types';

interface TaskTableProps {
  tasks: TaskItem[];
  loading: boolean;
  searchQuery: string;
  statusFilter: string;
  priorityFilter: string;
  page: number;
  limit: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (newPage: number) => void;
  onOpenCreate: () => void;
  onViewDetails: (task: TaskItem) => void;
  onEditTask: (task: TaskItem) => void;
  onCancelTask: (task: TaskItem) => void;
  onTrackTask?: (task: TaskItem) => void;
}

export const TaskTable: React.FC<TaskTableProps> = ({
  tasks,
  loading,
  searchQuery,
  statusFilter,
  priorityFilter,
  page,
  limit,
  totalPages,
  totalCount,
  onPageChange,
  onOpenCreate,
  onViewDetails,
  onEditTask,
  onCancelTask,
  onTrackTask,
}) => {
  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'URGENT':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200/70">
            URGENT
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200/70">
            HIGH
          </span>
        );
      case 'LOW':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
            LOW
          </span>
        );
      case 'MEDIUM':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200/70">
            MEDIUM
          </span>
        );
    }
  };

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/70">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Completed
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/70">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
            In Progress
          </span>
        );
      case 'ASSIGNED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/70">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            Assigned
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200/70">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Cancelled
          </span>
        );
      case 'CREATED':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Created
          </span>
        );
    }
  };

  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return 'Not scheduled';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Invalid date';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden flex flex-col">
      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3 text-center">
          <RefreshCw size={32} className="animate-spin text-blue-600" />
          <p className="text-sm font-semibold text-slate-500">Fetching field task records from database...</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-400">
            <ClipboardList size={28} />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Field Tasks Found</h3>
          <p className="text-xs text-slate-500 max-w-md">
            {searchQuery || statusFilter !== 'ALL' || priorityFilter !== 'ALL'
              ? 'No field work orders match your current search or filter criteria.'
              : 'No field tasks registered yet. Click "Create Field Task" above to dispatch your first task.'}
          </p>
          {!searchQuery && statusFilter === 'ALL' && priorityFilter === 'ALL' && (
            <button
              onClick={onOpenCreate}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Plus size={16} />
              <span>Create First Task</span>
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-6 min-w-55">Task Title</th>
                  <th className="py-3.5 px-4 min-w-50">Customer & Site</th>
                  <th className="py-3.5 px-4 min-w-40">Assigned Engineer</th>
                  <th className="py-3.5 px-4 min-w-27.5">Priority</th>
                  <th className="py-3.5 px-4 min-w-30">Status</th>
                  <th className="py-3.5 px-4 min-w-37.5">Scheduled Time</th>
                  <th className="py-3.5 px-6 text-right min-w-30">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {tasks.map((task) => {
                  const isFinalized = task.status === 'COMPLETED' || task.status === 'CANCELLED';
                  const assigneeInitials = task.assignedUser
                    ? task.assignedUser.fullName
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)
                    : 'UN';

                  return (
                    <tr key={task.id} className="hover:bg-blue-50/20 transition-colors">
                      {/* Task Title & Details */}
                      <td className="py-3.5 px-6">
                        <div className="flex flex-col max-w-60">
                          <span className="font-bold text-slate-900 text-[13px] truncate">
                            {task.title}
                          </span>
                          {task.description && (
                            <span className="text-[11px] text-slate-500 truncate mt-0.5">
                              {task.description}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Customer & Destination */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col max-w-55">
                          <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs truncate">
                            <Building2 size={12} className="text-blue-600 shrink-0" />
                            <span className="truncate">{task.customer?.name || 'Unknown Client'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-500 text-[11px] truncate mt-0.5">
                            <MapPin size={11} className="text-slate-400 shrink-0" />
                            <span className="truncate">{task.destination?.name || 'Site location'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Assigned Employee */}
                      <td className="py-3.5 px-4">
                        {task.assignedUser ? (
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-linear-to-br from-blue-600 to-indigo-700 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                              {assigneeInitials}
                            </div>
                            <div className="flex flex-col max-w-37.5">
                              <span className="font-bold text-slate-900 text-xs truncate">
                                {task.assignedUser.fullName}
                              </span>
                              {task.assignedUser.designation && (
                                <span className="text-[10px] text-slate-400 truncate">
                                  {task.assignedUser.designation}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Unassigned</span>
                        )}
                      </td>

                      {/* Priority */}
                      <td className="py-3.5 px-4">{getPriorityBadge(task.priority)}</td>

                      {/* Status */}
                      <td className="py-3.5 px-4">{getStatusBadge(task.status)}</td>

                      {/* Scheduled Date */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 whitespace-nowrap">
                          <Calendar size={12} className="text-slate-400 shrink-0" />
                          <span>{formatDateTime(task.scheduledAt)}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {task.status === 'IN_PROGRESS' && onTrackTask && (
                            <button
                              type="button"
                              onClick={() => onTrackTask(task)}
                              className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                              title="Live Route Tracking"
                            >
                              <Radio size={12} className="animate-pulse" />
                              <span>Track</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => onViewDetails(task)}
                            className="p-1.5 rounded-lg border border-slate-200/80 bg-slate-50 hover:bg-blue-50 text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all cursor-pointer shadow-2xs"
                            title="View Full Details"
                          >
                            <Eye size={13} />
                          </button>

                          {!isFinalized && (
                            <>
                              <button
                                type="button"
                                onClick={() => onEditTask(task)}
                                className="p-1.5 rounded-lg border border-slate-200/80 bg-slate-50 hover:bg-blue-50 text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all cursor-pointer shadow-2xs"
                                title="Edit Task"
                              >
                                <Edit2 size={13} />
                              </button>

                              <button
                                type="button"
                                onClick={() => onCancelTask(task)}
                                className="p-1.5 rounded-lg border border-slate-200/80 bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 hover:border-rose-200 transition-all cursor-pointer shadow-2xs"
                                title="Cancel Task"
                              >
                                <XCircle size={13} />
                              </button>
                            </>
                          )}
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
              <span className="font-black text-slate-900">{totalCount}</span> tasks
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
