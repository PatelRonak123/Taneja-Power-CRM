import React from 'react';
import {
  Eye,
  Edit2,
  XCircle,
  Building2,
  MapPin,
  Calendar,
  ClipboardList,
  Radio,
} from 'lucide-react';
import { TaskItem, TaskPriority, TaskStatus } from '../types/task.types';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TablePagination,
  TableEmptyState,
  TableLoadingState,
} from '../../../components/ui/table';
import { StatusPill } from '../../../components/ui/StatusPill';

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
  isManagement?: boolean;
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
  isManagement = true,
}) => {
  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'URGENT':
        return (
          <StatusPill variant="danger" size="xs">
            URGENT
          </StatusPill>
        );
      case 'HIGH':
        return (
          <StatusPill variant="warning" size="xs">
            HIGH
          </StatusPill>
        );
      case 'LOW':
        return (
          <StatusPill variant="neutral" size="xs">
            LOW
          </StatusPill>
        );
      case 'MEDIUM':
      default:
        return (
          <StatusPill variant="info" size="xs">
            MEDIUM
          </StatusPill>
        );
    }
  };

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <StatusPill variant="success" dot size="xs">
            Completed
          </StatusPill>
        );
      case 'IN_PROGRESS':
        return (
          <StatusPill variant="warning" dot dotPulse size="xs">
            In Progress
          </StatusPill>
        );
      case 'ASSIGNED':
        return (
          <StatusPill variant="info" dot size="xs">
            Assigned
          </StatusPill>
        );
      case 'CANCELLED':
        return (
          <StatusPill variant="danger" dot size="xs">
            Cancelled
          </StatusPill>
        );
      case 'CREATED':
      default:
        return (
          <StatusPill variant="neutral" dot size="xs">
            Created
          </StatusPill>
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
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden flex flex-col w-full">
      <div className="w-full overflow-x-auto">
        <Table density="standard" className="min-w-225 md:min-w-0 md:table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="md:w-[22%]">Task Title</TableHead>
              <TableHead className="md:w-[16%]">Customer & Site</TableHead>
              <TableHead className="md:w-[16%]">Assigned Engineer</TableHead>
              <TableHead align="center" className="md:w-[10%]">Priority</TableHead>
              <TableHead align="center" className="md:w-[12%]">Status</TableHead>
              <TableHead className="md:w-[12%]">Scheduled</TableHead>
              <TableHead align="right" className="md:w-[12%]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableLoadingState columns={7} rows={6} />
            ) : tasks.length === 0 ? (
              <TableEmptyState
                colSpan={7}
                icon={<ClipboardList size={24} />}
                title={searchQuery || statusFilter !== 'ALL' || priorityFilter !== 'ALL' ? 'No matching tasks' : 'No tasks recorded'}
                description={
                  searchQuery || statusFilter !== 'ALL' || priorityFilter !== 'ALL'
                    ? 'No field tasks matched your active filter criteria.'
                    : isManagement
                    ? 'Create your first field task to dispatch technician orders.'
                    : 'You have no assigned tasks at this time.'
                }
                action={
                  !searchQuery && statusFilter === 'ALL' && priorityFilter === 'ALL' && isManagement ? (
                    <button
                      type="button"
                      onClick={onOpenCreate}
                      className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium cursor-pointer shadow-xs"
                    >
                      Create Field Task
                    </button>
                  ) : undefined
                }
              />
            ) : (
              tasks.map((task) => {
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
                  <TableRow key={task.id} className="group">
                    {/* Task Title & Details */}
                    <TableCell className="align-middle">
                      <div className="flex flex-col min-w-0 pr-1">
                        <span className="font-semibold text-slate-900 text-xs truncate" title={task.title}>
                          {task.title}
                        </span>
                        {task.description && (
                          <span className="text-[11px] text-slate-500 truncate mt-0.5" title={task.description}>
                            {task.description}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Customer & Destination */}
                    <TableCell className="align-middle">
                      <div className="flex flex-col min-w-0 pr-1">
                        <div className="flex items-center gap-1.5 font-medium text-slate-800 text-xs truncate" title={task.customer?.name || 'Unknown Client'}>
                          <Building2 size={12} className={task.customer?.isLead || task.leadId ? 'text-indigo-600 shrink-0' : 'text-blue-600 shrink-0'} />
                          <span className="truncate">{task.customer?.name || 'Unknown Client'}</span>
                          {(task.customer?.isLead || task.leadId) && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                              Lead
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-slate-500 text-[11px] truncate mt-0.5" title={task.destination?.name || 'Site location'}>
                          <MapPin size={10} className="text-slate-400 shrink-0" />
                          <span className="truncate">{task.destination?.name || 'Site location'}</span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Assigned Employee */}
                    <TableCell className="align-middle">
                      {task.assignedUser ? (
                        <div className="flex items-center gap-2 min-w-0 pr-1">
                          <div className="w-7 h-7 rounded-lg bg-linear-to-br from-blue-600 to-indigo-700 text-white font-bold text-[10px] flex items-center justify-center shrink-0 shadow-2xs">
                            {assigneeInitials}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-slate-900 text-xs truncate" title={task.assignedUser.fullName}>
                              {task.assignedUser.fullName}
                            </span>
                            {task.assignedUser.designation && (
                              <span className="text-[10px] text-slate-400 truncate" title={task.assignedUser.designation}>
                                {task.assignedUser.designation}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Unassigned</span>
                      )}
                    </TableCell>

                    {/* Priority */}
                    <TableCell align="center" className="align-middle">{getPriorityBadge(task.priority)}</TableCell>

                    {/* Status */}
                    <TableCell align="center" className="align-middle">{getStatusBadge(task.status)}</TableCell>

                    {/* Scheduled Date */}
                    <TableCell className="align-middle tabular-nums">
                      <div className="flex items-center gap-1 text-[11px] font-medium text-slate-600 whitespace-nowrap" title={formatDateTime(task.scheduledAt)}>
                        <Calendar size={11} className="text-slate-400 shrink-0" />
                        <span>{formatDateTime(task.scheduledAt)}</span>
                      </div>
                    </TableCell>

                    {/* Actions */}
                    <TableCell align="right" className="align-middle whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                        {task.status === 'IN_PROGRESS' && onTrackTask && (
                          <button
                            type="button"
                            onClick={() => onTrackTask(task)}
                            className="px-2 py-1 rounded-md border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-700 text-[10px] font-medium transition-all cursor-pointer shadow-2xs flex items-center gap-1 shrink-0"
                            title="Live Route Tracking"
                          >
                            <Radio size={11} className="animate-pulse text-orange-600" />
                            <span>Track</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onViewDetails(task)}
                          className="p-1.5 rounded-md border border-border bg-white hover:bg-blue-50 text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all cursor-pointer shadow-2xs shrink-0"
                          title="View Full Details"
                        >
                          <Eye size={13} />
                        </button>

                        {!isFinalized && isManagement && (
                          <>
                            <button
                              type="button"
                              onClick={() => onEditTask(task)}
                              className="p-1.5 rounded-md border border-border bg-white hover:bg-blue-50 text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all cursor-pointer shadow-2xs shrink-0"
                              title="Edit Task"
                            >
                              <Edit2 size={13} />
                            </button>

                            <button
                              type="button"
                              onClick={() => onCancelTask(task)}
                              className="p-1.5 rounded-md border border-border bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 hover:border-rose-200 transition-all cursor-pointer shadow-2xs shrink-0"
                              title="Cancel Task"
                            >
                              <XCircle size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Footer */}
      {!loading && tasks.length > 0 && (
        <TablePagination
          page={page}
          totalPages={totalPages}
          totalCount={totalCount}
          limit={limit}
          onPageChange={onPageChange}
          entityName="tasks"
        />
      )}
    </div>
  );
};
