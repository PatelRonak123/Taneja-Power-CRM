import React from 'react';
import {
  X,
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
  ClipboardList,
} from 'lucide-react';
import { TaskItem, TaskPriority, TaskStatus } from '../types/task.types';

interface TaskDetailModalProps {
  task: TaskItem | null;
  onClose: () => void;
  onEdit: (task: TaskItem) => void;
  onCancel: (task: TaskItem) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  onClose,
  onEdit,
  onCancel,
}) => {
  if (!task) return null;

  const isFinalized = task.status === 'COMPLETED' || task.status === 'CANCELLED';

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
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-50 text-rose-600 border border-rose-200">
            URGENT
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            HIGH
          </span>
        );
      case 'LOW':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            LOW
          </span>
        );
      case 'MEDIUM':
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            MEDIUM
          </span>
        );
    }
  };

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Completed
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            In Progress
          </span>
        );
      case 'ASSIGNED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
            Assigned
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            Cancelled
          </span>
        );
      case 'CREATED':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            Created
          </span>
        );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white border border-slate-200 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/70">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/60 flex items-center justify-center shrink-0 mt-0.5">
              <ClipboardList size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                {getStatusBadge(task.status)}
                {getPriorityBadge(task.priority)}
              </div>
              <h2 className="text-base font-black text-slate-900 leading-snug">{task.title}</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Instructions Box */}
          {task.description && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2 font-bold text-slate-900 mb-1.5 text-xs">
                <FileText size={15} className="text-blue-600" />
                <span>Task Instructions & Field Notes</span>
              </div>
              <p className="text-slate-600 text-xs leading-relaxed whitespace-pre-wrap">
                {task.description}
              </p>
            </div>
          )}

          {/* Customer & Destination Side-by-Side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Customer Box */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-xs pb-2 border-b border-slate-100 mb-2.5">
                <Building2 size={15} className="text-blue-600" />
                <span>Customer Information</span>
              </div>
              <div className="space-y-1.5 text-slate-600">
                <div className="font-extrabold text-slate-900 text-sm">{task.customer?.name || 'Unknown Client'}</div>
                {task.customer?.companyName && (
                  <div className="text-slate-500 font-medium">{task.customer.companyName}</div>
                )}
                {task.customer?.phone && (
                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px] pt-0.5">
                    <Phone size={12} className="text-slate-400" />
                    <span>{task.customer.phone}</span>
                  </div>
                )}
                {task.customer?.email && (
                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                    <Mail size={12} className="text-slate-400" />
                    <span>{task.customer.email}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Destination Site Box */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-xs pb-2 border-b border-slate-100 mb-2.5">
                <MapPin size={15} className="text-blue-600" />
                <span>Destination Site</span>
              </div>
              <div className="space-y-1.5 text-slate-600">
                <div className="font-extrabold text-slate-900 text-sm">{task.destination?.name || 'Site location'}</div>
                {task.destination?.address && (
                  <div className="text-slate-500">{task.destination.address}</div>
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
                    <Navigation size={12} />
                    <span>GPS: {task.destination.latitude}, {task.destination.longitude}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Assignment & Schedule */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Engineer Box */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-xs pb-2 border-b border-slate-100 mb-2.5">
                <User size={15} className="text-blue-600" />
                <span>Assigned Field Engineer</span>
              </div>
              {task.assignedUser ? (
                <div className="space-y-1 text-slate-600">
                  <div className="font-extrabold text-slate-900 text-sm">{task.assignedUser.fullName}</div>
                  {task.assignedUser.designation && (
                    <div className="text-slate-500">{task.assignedUser.designation}</div>
                  )}
                  {task.assignedUser.phone && (
                    <div className="flex items-center gap-1.5 text-slate-500 text-[11px] pt-1">
                      <Phone size={12} className="text-slate-400" />
                      <span>{task.assignedUser.phone}</span>
                    </div>
                  )}
                  {task.assignedUser.email && (
                    <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                      <Mail size={12} className="text-slate-400" />
                      <span>{task.assignedUser.email}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-slate-400 italic py-1">
                  No engineer assigned yet (Pending Assignment)
                </div>
              )}
            </div>

            {/* Schedule Box */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-xs pb-2 border-b border-slate-100 mb-2.5">
                <Clock size={15} className="text-blue-600" />
                <span>Schedule & Deadlines</span>
              </div>
              <div className="space-y-2">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Scheduled Time</span>
                  <span className="font-extrabold text-slate-900 text-xs">{formatDateTime(task.scheduledAt)}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Due Time</span>
                  <span className="font-extrabold text-slate-900 text-xs">{formatDateTime(task.dueAt)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Lifecycle Progression Timeline */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white">
            <h3 className="font-extrabold text-slate-900 text-xs mb-3">Task Lifecycle Progression</h3>
            <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {/* Step 1: Created */}
              <div className="relative">
                <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-emerald-100 border-2 border-emerald-500 flex items-center justify-center"></div>
                <div className="font-bold text-slate-900 text-xs">Task Created</div>
                <div className="text-slate-500 text-[11px]">
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
                ></div>
                <div className="font-bold text-slate-900 text-xs">
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
                ></div>
                <div className="font-bold text-slate-900 text-xs">Task Started</div>
                <div className="text-slate-500 text-[11px]">
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
                ></div>
                <div className="font-bold text-slate-900 text-xs">
                  {task.status === 'COMPLETED'
                    ? 'Task Completed'
                    : task.status === 'CANCELLED'
                    ? 'Task Cancelled'
                    : 'Resolution'}
                </div>
                <div className="text-slate-500 text-[11px]">
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

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            {!isFinalized && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEdit(task);
                  }}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/50 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                >
                  <Edit2 size={14} />
                  <span>Edit Task</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onCancel(task);
                  }}
                  className="px-3.5 py-2 rounded-xl border border-rose-200 bg-white text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                >
                  <XCircle size={14} />
                  <span>Cancel Task</span>
                </button>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer shadow-2xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
