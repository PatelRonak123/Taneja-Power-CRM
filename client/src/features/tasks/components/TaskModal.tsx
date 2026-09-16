import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  MapPin,
  User,
  AlertCircle,
  Calendar,
  CheckSquare,
  FileText,
  Clock,
  Flag,
} from 'lucide-react';
import { Customer, CustomerDestination } from '../../customers/types/customer.types';
import { TaskPriority, TaskStatus } from '../types/task.types';
import { customerService } from '../../customers/services/customerService';

interface TaskModalProps {
  modalMode: 'create' | 'edit' | null;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  formData: {
    title: string;
    description: string;
    customerId: string;
    destinationId: string;
    assignedTo: string;
    priority: TaskPriority;
    status: TaskStatus;
    scheduledAt: string;
    dueAt: string;
  };
  onInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => void;
  customers: Customer[];
  employees: { id: string; fullName: string; designation?: string | null }[];
  formSubmitting: boolean;
  formError: string | null;
  onCustomerChange: (customerId: string) => void;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  modalMode,
  onClose,
  onSubmit,
  formData,
  onInputChange,
  customers,
  employees,
  formSubmitting,
  formError,
  onCustomerChange,
}) => {
  const [destinations, setDestinations] = useState<CustomerDestination[]>([]);
  const [loadingDestinations, setLoadingDestinations] = useState<boolean>(false);

  useEffect(() => {
    if (formData.customerId) {
      setLoadingDestinations(true);
      customerService
        .getDestinations(formData.customerId)
        .then((res) => {
          if (res.success && Array.isArray(res.data)) {
            setDestinations(res.data.filter((d) => d.status === 'ACTIVE'));
          } else {
            setDestinations([]);
          }
        })
        .catch(() => {
          setDestinations([]);
        })
        .finally(() => {
          setLoadingDestinations(false);
        });
    } else {
      setDestinations([]);
    }
  }, [formData.customerId]);

  if (!modalMode) return null;

  const handleCustomerSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const customerId = e.target.value;
    onCustomerChange(customerId);
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
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/60 flex items-center justify-center">
              <CheckSquare size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">
                {modalMode === 'create' ? 'Create Field Task / Work Order' : 'Edit Field Task Details'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {modalMode === 'create'
                  ? 'Dispatch customer destination work orders to field engineers'
                  : 'Update instructions, schedules, or employee assignments'}
              </p>
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

        {/* Form Body */}
        <form onSubmit={onSubmit} className="p-6 overflow-y-auto space-y-4">
          {formError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0 text-rose-600" />
              <span>{formError}</span>
            </div>
          )}

          {/* Task Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Task Title <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <FileText size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={onInputChange}
                required
                placeholder="e.g. Transformer Maintenance & Diagnostics"
                className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>
          </div>

          {/* Customer & Destination Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Customer Dropdown */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Customer <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Building2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <select
                  name="customerId"
                  value={formData.customerId}
                  onChange={handleCustomerSelect}
                  required
                  className="w-full h-11 pl-10 pr-8 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 cursor-pointer"
                >
                  <option value="">Select Customer</option>
                  {customers
                    .filter((c) => c.status === 'ACTIVE')
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.companyName ? `(${c.companyName})` : ''}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Destination Site Dropdown */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Destination Site <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <select
                  name="destinationId"
                  value={formData.destinationId}
                  onChange={onInputChange}
                  required
                  disabled={!formData.customerId || loadingDestinations}
                  className="w-full h-11 pl-10 pr-8 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {!formData.customerId
                      ? 'Select customer first'
                      : loadingDestinations
                      ? 'Loading destinations...'
                      : destinations.length === 0
                      ? 'No active destinations found'
                      : 'Select Destination Site'}
                  </option>
                  {destinations.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} {d.city ? `• ${d.city}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Assigned Employee & Priority */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Employee Dropdown */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Assign to Field Engineer
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <select
                  name="assignedTo"
                  value={formData.assignedTo}
                  onChange={onInputChange}
                  className="w-full h-11 pl-10 pr-8 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 cursor-pointer"
                >
                  <option value="">Unassigned (Pending Allocation)</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} {emp.designation ? `(${emp.designation})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Priority Level <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Flag size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={onInputChange}
                  className="w-full h-11 pl-10 pr-8 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 cursor-pointer"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium (Default)</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
            </div>
          </div>

          {/* Scheduled Date & Due Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Scheduled Date & Time
              </label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="datetime-local"
                  name="scheduledAt"
                  value={formData.scheduledAt}
                  onChange={onInputChange}
                  className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Due Date & Time
              </label>
              <div className="relative">
                <Clock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="datetime-local"
                  name="dueAt"
                  value={formData.dueAt}
                  onChange={onInputChange}
                  className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
          </div>

          {/* Status (Edit mode only) */}
          {modalMode === 'edit' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Task Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={onInputChange}
                className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 cursor-pointer"
              >
                <option value="CREATED">Created</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="IN_PROGRESS">In Progress</option>
              </select>
            </div>
          )}

          {/* Description / Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Instructions / Field Notes
            </label>
            <textarea
              name="description"
              rows={3}
              value={formData.description}
              onChange={onInputChange}
              placeholder="Provide specific technical guidelines, equipment numbers, or customer contact instructions..."
              className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
            />
          </div>

          {/* Modal Actions Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={formSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {formSubmitting && (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              <span>{modalMode === 'create' ? 'Create Task' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
