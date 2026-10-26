import React, { useState } from 'react';
import {
  Building2,
  MapPin,
  User,
  Clock,
  FileText,
  Phone,
  Mail,
  Navigation,
  Edit2,
  XCircle,
  Play,
  CheckCircle2,
  Wrench,
} from 'lucide-react';
import { TaskItem, TaskPriority, TaskStatus } from '../types/task.types';
import { Drawer } from '../../../components/ui/Drawer';
import { Button } from '../../../components/ui/Button';
import { StatusPill } from '../../../components/ui/StatusPill';
import { AmcServiceReportModal } from '../../amc-contracts/components/AmcServiceReportModal';

interface TaskDetailModalProps {
  task: TaskItem | null;
  onClose: () => void;
  onEdit: (task: TaskItem) => void;
  onCancel: (task: TaskItem) => void;
  onStartTask?: (task: TaskItem) => void;
  onCompleteTask?: (task: TaskItem) => void;
  isManagement?: boolean;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  onClose,
  onEdit,
  onCancel,
  onStartTask,
  onCompleteTask,
  isManagement = true,
}) => {
  const [activeAmcVisitId, setActiveAmcVisitId] = useState<string | null>(null);

  if (!task) return null;

  const isFinalized = task.status === 'COMPLETED' || task.status === 'CANCELLED';

  const formatDuration = (startStr?: string | null, endStr?: string | null) => {
    if (!startStr) return null;
    const start = new Date(startStr).getTime();
    const end = endStr ? new Date(endStr).getTime() : Date.now();
    if (isNaN(start) || isNaN(end) || end < start) return null;
    const diffMins = Math.floor((end - start) / (1000 * 60));
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    if (hours === 0) return `${mins} min${mins === 1 ? '' : 's'}`;
    return `${hours} hr${hours === 1 ? '' : 's'} ${mins} min${mins === 1 ? '' : 's'}`;
  };

  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'URGENT':
        return <StatusPill variant="danger" size="xs">URGENT</StatusPill>;
      case 'HIGH':
        return <StatusPill variant="warning" size="xs">HIGH</StatusPill>;
      case 'LOW':
        return <StatusPill variant="neutral" size="xs">LOW</StatusPill>;
      case 'MEDIUM':
      default:
        return <StatusPill variant="info" size="xs">MEDIUM</StatusPill>;
    }
  };

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case 'COMPLETED':
        return <StatusPill variant="success" dot size="xs">Completed</StatusPill>;
      case 'IN_PROGRESS':
        return <StatusPill variant="warning" dot dotPulse size="xs">In Progress</StatusPill>;
      case 'ASSIGNED':
        return <StatusPill variant="info" dot size="xs">Assigned</StatusPill>;
      case 'CANCELLED':
        return <StatusPill variant="danger" dot size="xs">Cancelled</StatusPill>;
      case 'CREATED':
      default:
        return <StatusPill variant="neutral" dot size="xs">Created</StatusPill>;
    }
  };

  return (
    <Drawer
      isOpen={task !== null}
      onClose={onClose}
      title={
        <div>
          <div className="text-base font-semibold text-slate-900">{task.title}</div>
          <p className="text-xs text-slate-500 font-normal mt-0.5">
            Field task details, customer site info, and workflow progression
          </p>
        </div>
      }
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            {!isFinalized && isManagement && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onClose();
                    onEdit(task);
                  }}
                >
                  <Edit2 size={13} className="mr-1.5" />
                  <span>Edit Task</span>
                </Button>

                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    onClose();
                    onCancel(task);
                  }}
                >
                  <XCircle size={13} className="mr-1.5" />
                  <span>Cancel Task</span>
                </Button>
              </>
            )}

            {!isFinalized && !isManagement && (
              <>
                {(task.status === 'CREATED' || task.status === 'ASSIGNED') && onStartTask && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      onClose();
                      onStartTask(task);
                    }}
                  >
                    <Play size={13} className="mr-1.5" />
                    <span>Start Task</span>
                  </Button>
                )}

                {task.status === 'IN_PROGRESS' && onCompleteTask && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      onClose();
                      onCompleteTask(task);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <CheckCircle2 size={13} className="mr-1.5" />
                    <span>Complete Task</span>
                  </Button>
                )}
              </>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Status & Priority Row */}
        <div className="flex items-center gap-2 pb-1">
          {getStatusBadge(task.status)}
          {getPriorityBadge(task.priority)}
        </div>

        {/* Instructions Box */}
        {task.description && (
          <div className="p-3.5 rounded-lg bg-slate-50 border border-border">
            <div className="flex items-center gap-2 font-medium text-slate-900 mb-1 text-xs">
              <FileText size={14} className="text-blue-600" />
              <span>Task Instructions & Field Notes</span>
            </div>
            <p className="text-slate-600 text-xs leading-relaxed whitespace-pre-wrap">
              {task.description}
            </p>
          </div>
        )}

        {/* Customer & Destination Side-by-Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Customer Box */}
          <div className="p-3.5 rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between gap-1.5 font-medium text-slate-900 text-xs pb-2 border-b border-border/60 mb-2">
              <div className="flex items-center gap-1.5">
                <Building2 size={14} className={task.customer?.isLead || task.leadId ? 'text-indigo-600' : 'text-blue-600'} />
                <span>{task.customer?.isLead || task.leadId ? 'Lead Information' : 'Customer Information'}</span>
              </div>
              {(task.customer?.isLead || task.leadId) && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Lead
                </span>
              )}
            </div>
            <div className="space-y-1 text-slate-600">
              <div className="font-semibold text-slate-900 text-xs">{task.customer?.name || 'Unknown Client'}</div>
              {task.customer?.companyName && (
                <div className="text-slate-500 text-[11px]">{task.customer.companyName}</div>
              )}
              {task.customer?.phone && (
                <div className="flex items-center gap-1.5 text-slate-500 text-[11px] pt-0.5">
                  <Phone size={11} className="text-slate-400" />
                  <span>{task.customer.phone}</span>
                </div>
              )}
              {task.customer?.email && (
                <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                  <Mail size={11} className="text-slate-400" />
                  <span>{task.customer.email}</span>
                </div>
              )}
            </div>
          </div>

          {/* Destination Site Box */}
          <div className="p-3.5 rounded-lg border border-border bg-card">
            <div className="flex items-center gap-1.5 font-medium text-slate-900 text-xs pb-2 border-b border-border/60 mb-2">
              <MapPin size={14} className="text-blue-600" />
              <span>Destination Site</span>
            </div>
            <div className="space-y-1 text-slate-600">
              <div className="font-semibold text-slate-900 text-xs">{task.destination?.name || 'Site location'}</div>
              {task.destination?.address && (
                <div className="text-slate-500 text-[11px]">{task.destination.address}</div>
              )}
              {(task.destination?.city || task.destination?.state) && (
                <div className="text-slate-500 text-[11px]">
                  {[task.destination.city, task.destination.state, task.destination.pincode].filter(Boolean).join(', ')}
                </div>
              )}
              {task.destination?.contactPerson && (
                <div className="text-[11px] text-slate-600 pt-0.5">
                  Contact: <strong className="text-slate-900">{task.destination.contactPerson}</strong>{' '}
                  {task.destination.contactPhone ? `(${task.destination.contactPhone})` : ''}
                </div>
              )}
              {task.destination?.latitude && task.destination?.longitude && (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-0.5">
                  <Navigation size={11} />
                  <span>GPS: {task.destination.latitude}, {task.destination.longitude}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Assignment & Schedule */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Engineer Box */}
          <div className="p-3.5 rounded-lg border border-border bg-card">
            <div className="flex items-center gap-1.5 font-medium text-slate-900 text-xs pb-2 border-b border-border/60 mb-2">
              <User size={14} className="text-blue-600" />
              <span>Assigned Field Engineer</span>
            </div>
            {task.assignedUser ? (
              <div className="space-y-1 text-slate-600">
                <div className="font-semibold text-slate-900 text-xs">{task.assignedUser.fullName}</div>
                {task.assignedUser.designation && (
                  <div className="text-slate-500 text-[11px]">{task.assignedUser.designation}</div>
                )}
                {task.assignedUser.phone && (
                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px] pt-0.5">
                    <Phone size={11} className="text-slate-400" />
                    <span>{task.assignedUser.phone}</span>
                  </div>
                )}
                {task.assignedUser.email && (
                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                    <Mail size={11} className="text-slate-400" />
                    <span>{task.assignedUser.email}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-slate-400 italic py-1 text-xs">
                No engineer assigned yet (Pending Assignment)
              </div>
            )}
          </div>

          {/* Schedule & Timing Box */}
          <div className="p-3.5 rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between pb-2 border-b border-border/60 mb-2">
              <div className="flex items-center gap-1.5 font-medium text-slate-900 text-xs">
                <Clock size={14} className="text-blue-600" />
                <span>Schedule & Execution Timing</span>
              </div>
              {task.startedAt && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Duration: {formatDuration(task.startedAt, task.completedAt) || 'In Progress'}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[11px] font-medium text-slate-400 block">Scheduled Time</span>
                <span className="font-semibold text-slate-900 text-xs tabular-nums">{formatDateTime(task.scheduledAt)}</span>
              </div>
              <div>
                <span className="text-[11px] font-medium text-slate-400 block">Due Time</span>
                <span className="font-semibold text-slate-900 text-xs tabular-nums">{formatDateTime(task.dueAt)}</span>
              </div>
              {task.startedAt && (
                <div>
                  <span className="text-[11px] font-medium text-emerald-600 block">Started At</span>
                  <span className="font-semibold text-slate-900 text-xs tabular-nums">{formatDateTime(task.startedAt)}</span>
                </div>
              )}
              {task.completedAt && (
                <div>
                  <span className="text-[11px] font-medium text-blue-600 block">Completed At</span>
                  <span className="font-semibold text-slate-900 text-xs tabular-nums">{formatDateTime(task.completedAt)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AMC Service Visit & Report Card (When linked to an AMC Contract) */}
        {task.amcVisit && (
          <div className="p-3.5 rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-white shadow-xs">
            <div className="flex items-center justify-between pb-2.5 border-b border-blue-200/60 mb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <Wrench size={14} />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-xs leading-none">
                    AMC Service Visit Integration
                  </h4>
                  <span className="text-[10px] text-slate-500">
                    Preventive Maintenance Contract Execution
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                Visit #{task.amcVisit.visitNumber || 1} • {task.amcVisit.serviceType || 'PREVENTIVE'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs mb-3">
              <div className="bg-white/80 p-2 rounded-lg border border-blue-100">
                <span className="text-[10px] text-slate-400 font-medium block">Contract Reference</span>
                <span className="font-bold text-slate-900">{task.amcVisit.contractNumber || 'AMC Contract'}</span>
              </div>
              <div className="bg-white/80 p-2 rounded-lg border border-blue-100">
                <span className="text-[10px] text-slate-400 font-medium block">AMC Service Report</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      task.amcVisit.report?.status === 'COMPLETED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : task.amcVisit.report?.status === 'DRAFT'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {task.amcVisit.report?.status === 'COMPLETED'
                      ? 'Completed'
                      : task.amcVisit.report?.status === 'DRAFT'
                      ? 'Draft Report'
                      : 'Pending Submission'}
                  </span>
                  {task.amcVisit.report?.reportNumber && (
                    <span className="text-[10px] font-mono text-slate-600 font-medium">
                      {task.amcVisit.report.reportNumber}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveAmcVisitId(task.amcVisit!.id)}
              className="w-full flex items-center justify-center gap-2 bg-white hover:bg-blue-600 hover:text-white border-blue-300 text-blue-700 font-bold transition-all shadow-2xs"
            >
              <FileText size={14} />
              <span>
                {task.amcVisit.report?.status === 'COMPLETED' ? 'View Official AMC Service Report' : 'Review / Open AMC Service Report'}
              </span>
            </Button>
          </div>
        )}

        {/* Lifecycle Progression Timeline */}
        <div className="p-3.5 rounded-lg border border-border bg-card">
          <h3 className="font-semibold text-slate-900 text-xs mb-3">Task Lifecycle Progression</h3>
          <div className="relative pl-6 space-y-3.5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {/* Step 1: Created */}
            <div className="relative">
              <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-emerald-100 border-2 border-emerald-500 flex items-center justify-center" />
              <div className="font-medium text-slate-900 text-xs">Task Created</div>
              <div className="text-slate-500 text-[11px] tabular-nums">
                {formatDateTime(task.createdAt)} {task.createdByUser ? `by ${task.createdByUser.fullName}` : ''}
              </div>
            </div>

            {/* Step 2: Assigned */}
            <div className="relative">
              <div
                className={`absolute -left-6 top-0.5 w-4 h-4 rounded-full flex items-center justify-center ${
                  task.assignedUser
                    ? 'bg-emerald-100 border-2 border-emerald-500'
                    : 'bg-slate-100 border-2 border-slate-300'
                }`}
              />
              <div className="font-medium text-slate-900 text-xs">
                {task.assignedUser ? `Assigned to ${task.assignedUser.fullName}` : 'Awaiting Assignment'}
              </div>
              <div className="text-slate-500 text-[11px]">
                {task.assignedUser ? 'Ready for field dispatch' : 'No engineer assigned'}
              </div>
            </div>

            {/* Step 3: Started */}
            <div className="relative">
              <div
                className={`absolute -left-6 top-0.5 w-4 h-4 rounded-full flex items-center justify-center ${
                  task.startedAt || task.status === 'IN_PROGRESS' || task.status === 'COMPLETED'
                    ? 'bg-emerald-100 border-2 border-emerald-500'
                    : 'bg-slate-100 border-2 border-slate-300'
                }`}
              />
              <div className="font-medium text-slate-900 text-xs">Task Started</div>
              <div className="text-slate-500 text-[11px] tabular-nums">
                {task.startedAt ? formatDateTime(task.startedAt) : 'Pending work commencement'}
              </div>
            </div>

            {/* Step 4: Final Outcome */}
            <div className="relative">
              <div
                className={`absolute -left-6 top-0.5 w-4 h-4 rounded-full flex items-center justify-center ${
                  task.status === 'COMPLETED'
                    ? 'bg-emerald-100 border-2 border-emerald-500'
                    : task.status === 'CANCELLED'
                    ? 'bg-rose-100 border-2 border-rose-500'
                    : 'bg-slate-100 border-2 border-slate-300'
                }`}
              />
              <div className="font-medium text-slate-900 text-xs">
                {task.status === 'COMPLETED'
                  ? 'Task Completed'
                  : task.status === 'CANCELLED'
                  ? 'Task Cancelled'
                  : 'Resolution'}
              </div>
              <div className="text-slate-500 text-[11px] tabular-nums">
                {task.status === 'COMPLETED'
                  ? formatDateTime(task.completedAt)
                  : task.status === 'CANCELLED'
                  ? `${formatDateTime(task.cancelledAt)} — Reason: ${task.cancellationReason || 'Not specified'}`
                  : 'Pending completion'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AMC Service Report Viewer Modal */}
      {activeAmcVisitId && (
        <AmcServiceReportModal
          visitId={activeAmcVisitId}
          isOpen={Boolean(activeAmcVisitId)}
          onClose={() => setActiveAmcVisitId(null)}
        />
      )}
    </Drawer>
  );
};
