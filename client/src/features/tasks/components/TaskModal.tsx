import React, { useState, useEffect } from 'react';
import {
  Building2,
  MapPin,
  User,
  AlertCircle,
  Calendar,
  FileText,
  Clock,
  Flag,
} from 'lucide-react';
import { Customer, CustomerDestination } from '../../customers/types/customer.types';
import { TaskPriority, TaskStatus } from '../types/task.types';
import { customerService } from '../../customers/services/customerService';
import { Drawer } from '../../../components/ui/Drawer';
import { Button } from '../../../components/ui/Button';

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
  employees: { id: string; fullName: string; designation?: string | null; workType?: string }[];
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

  // Filter employees to only Field Engineers (Sales, Services, etc. with FIELD workType / designations)
  const fieldEngineers = employees.filter((emp) => {
    if (formData.assignedTo && emp.id === formData.assignedTo) {
      return true;
    }
    if (emp.workType === 'FIELD') {
      return true;
    }
    if (emp.workType === 'OFFICE') {
      return false;
    }
    const des = (emp.designation || '').toLowerCase();
    if (des.includes('office') || des.includes('hr') || des.includes('accountant') || des.includes('admin') || des.includes('operations')) {
      return false;
    }
    return true;
  });

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

  const handleCustomerSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const customerId = e.target.value;
    onCustomerChange(customerId);
  };

  return (
    <Drawer
      isOpen={modalMode !== null}
      onClose={onClose}
      title={
        <div>
          <div className="text-base font-semibold text-slate-900">
            {modalMode === 'create' ? 'Create Field Task / Work Order' : 'Edit Field Task Details'}
          </div>
          <p className="text-xs text-slate-500 font-normal mt-0.5">
            {modalMode === 'create'
              ? 'Dispatch customer destination work orders to field engineers'
              : 'Update instructions, schedules, or employee assignments'}
          </p>
        </div>
      }
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-end gap-2.5 w-full">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={onClose}
            disabled={formSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="task-form"
            variant="primary"
            size="md"
            disabled={formSubmitting}
          >
            {formSubmitting && (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" />
            )}
            <span>{modalMode === 'create' ? 'Create Task' : 'Save Changes'}</span>
          </Button>
        </div>
      }
    >
      <form id="task-form" onSubmit={onSubmit} className="space-y-4">
        {formError && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0 text-rose-600" />
            <span>{formError}</span>
          </div>
        )}

        {/* Task Title */}
        <div>
          <label className="block text-[12px] font-medium text-slate-700 mb-1">
            Task Title <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <FileText size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={onInputChange}
              required
              placeholder="e.g. Transformer Maintenance & Diagnostics"
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-white border border-border text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
            />
          </div>
        </div>

        {/* Customer & Destination Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Customer Dropdown */}
          <div>
            <label className="block text-[12px] font-medium text-slate-700 mb-1">
              Customer <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                name="customerId"
                value={formData.customerId}
                onChange={handleCustomerSelect}
                required
                className="w-full h-9 pl-9 pr-7 rounded-lg bg-white border border-border text-[13px] text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 cursor-pointer"
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
            <label className="block text-[12px] font-medium text-slate-700 mb-1">
              Destination Site <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                name="destinationId"
                value={formData.destinationId}
                onChange={onInputChange}
                required
                disabled={!formData.customerId || loadingDestinations}
                className="w-full h-9 pl-9 pr-7 rounded-lg bg-white border border-border text-[13px] text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Employee Dropdown */}
          <div>
            <label className="block text-[12px] font-medium text-slate-700 mb-1">
              Assign to Field Engineer
            </label>
            <div className="relative">
              <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                name="assignedTo"
                value={formData.assignedTo}
                onChange={onInputChange}
                className="w-full h-9 pl-9 pr-7 rounded-lg bg-white border border-border text-[13px] text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 cursor-pointer"
              >
                <option value="">Unassigned (Pending Allocation)</option>
                {fieldEngineers.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName} {emp.designation ? `(${emp.designation})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-[12px] font-medium text-slate-700 mb-1">
              Priority Level <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Flag size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                name="priority"
                value={formData.priority}
                onChange={onInputChange}
                className="w-full h-9 pl-9 pr-7 rounded-lg bg-white border border-border text-[13px] text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 cursor-pointer"
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-[12px] font-medium text-slate-700 mb-1">
              Scheduled Date & Time
            </label>
            <div className="relative">
              <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="datetime-local"
                name="scheduledAt"
                value={formData.scheduledAt}
                onChange={onInputChange}
                className="w-full h-9 pl-9 pr-3 rounded-lg bg-white border border-border text-[13px] text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-slate-700 mb-1">
              Due Date & Time
            </label>
            <div className="relative">
              <Clock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="datetime-local"
                name="dueAt"
                value={formData.dueAt}
                onChange={onInputChange}
                className="w-full h-9 pl-9 pr-3 rounded-lg bg-white border border-border text-[13px] text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
            </div>
          </div>
        </div>

        {/* Status (Edit mode only) */}
        {modalMode === 'edit' && (
          <div>
            <label className="block text-[12px] font-medium text-slate-700 mb-1">
              Task Status
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={onInputChange}
              className="w-full h-9 px-3 rounded-lg bg-white border border-border text-[13px] text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 cursor-pointer"
            >
              <option value="CREATED">Created</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
            </select>
          </div>
        )}

        {/* Description / Notes */}
        <div>
          <label className="block text-[12px] font-medium text-slate-700 mb-1">
            Instructions / Field Notes
          </label>
          <textarea
            name="description"
            rows={3}
            value={formData.description}
            onChange={onInputChange}
            placeholder="Provide specific technical guidelines, equipment numbers, or customer contact instructions..."
            className="w-full p-2.5 rounded-lg bg-white border border-border text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all resize-none"
          />
        </div>
      </form>
    </Drawer>
  );
};
