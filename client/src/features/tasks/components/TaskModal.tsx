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
  UserPlus,
  Info,
} from 'lucide-react';
import { Customer, CustomerDestination } from '../../customers/types/customer.types';
import { TaskPriority, TaskStatus } from '../types/task.types';
import { customerService } from '../../customers/services/customerService';
import { leadsApi } from '../../leads/api/leadsApi';
import { Lead } from '../../leads/types/lead';
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
    leadId?: string;
    leadDestinationId?: string;
    clientType?: 'customer' | 'lead';
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
  leads?: Lead[];
  employees: { id: string; fullName: string; designation?: string | null; workType?: string }[];
  formSubmitting: boolean;
  formError: string | null;
  onCustomerChange: (customerId: string) => void;
  onLeadChange?: (leadId: string) => void;
  onClientTypeChange?: (clientType: 'customer' | 'lead') => void;
  isServiceOffice?: boolean;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  modalMode,
  onClose,
  onSubmit,
  formData,
  onInputChange,
  customers,
  leads = [],
  employees,
  formSubmitting,
  formError,
  onCustomerChange,
  onLeadChange,
  onClientTypeChange,
  isServiceOffice = false,
}) => {
  const isLead = formData.clientType === 'lead';
  const [destinations, setDestinations] = useState<CustomerDestination[]>([]);
  const [loadingDestinations, setLoadingDestinations] = useState<boolean>(false);
  const [internalLeads, setInternalLeads] = useState<Lead[]>(leads);
  const [loadingLeads, setLoadingLeads] = useState<boolean>(false);

  // Load leads if not provided or when modal opens
  useEffect(() => {
    if (leads && leads.length > 0) {
      setInternalLeads(leads);
    } else if (modalMode !== null && !isServiceOffice) {
      setLoadingLeads(true);
      leadsApi
        .getLeads()
        .then((res) => {
          if (Array.isArray(res)) {
            setInternalLeads(res);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingLeads(false));
    }
  }, [leads, modalMode, isServiceOffice]);

  // Filter employees: If task is for a Lead, ONLY allow Sales employees.
  // Otherwise, allow field engineers.
  const fieldEngineers = employees.filter((emp) => {
    if (formData.assignedTo && emp.id === formData.assignedTo) {
      return true;
    }
    const des = (emp.designation || '').toLowerCase();

    if (isLead) {
      // Pre-sales lead tasks can ONLY be assigned to sales personnel
      return des.includes('sales');
    }

    if (emp.workType === 'FIELD') {
      return true;
    }
    if (emp.workType === 'OFFICE') {
      return false;
    }
    if (
      des.includes('office') ||
      des.includes('hr') ||
      des.includes('accountant') ||
      des.includes('admin') ||
      des.includes('operations')
    ) {
      return false;
    }
    return true;
  });

  // Fetch destinations when customerId or leadId changes
  useEffect(() => {
    if (isLead && formData.leadId) {
      setLoadingDestinations(true);
      leadsApi
        .getLeadDestinations(formData.leadId)
        .then((res) => {
          if (Array.isArray(res)) {
            const active = res.filter((d) => d.status === 'ACTIVE');
            setDestinations(active);
            const currentSelected = formData.leadDestinationId || formData.destinationId;
            if ((!currentSelected || !active.some((d) => d.id === currentSelected)) && active.length > 0) {
              onInputChange({
                target: { name: 'leadDestinationId', value: active[0].id },
              } as any);
              onInputChange({
                target: { name: 'destinationId', value: active[0].id },
              } as any);
            }
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
    } else if (!isLead && formData.customerId) {
      setLoadingDestinations(true);
      customerService
        .getDestinations(formData.customerId)
        .then((res) => {
          if (res.success && Array.isArray(res.data)) {
            const active = res.data.filter((d) => d.status === 'ACTIVE');
            setDestinations(active);
            if ((!formData.destinationId || !active.some((d) => d.id === formData.destinationId)) && active.length > 0) {
              onInputChange({
                target: { name: 'destinationId', value: active[0].id },
              } as any);
            }
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
  }, [isLead, formData.leadId, formData.customerId]);

  const handleCustomerSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const customerId = e.target.value;
    onCustomerChange(customerId);
  };

  const handleLeadSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const leadId = e.target.value;
    if (onLeadChange) {
      onLeadChange(leadId);
    } else {
      onInputChange({
        target: { name: 'leadId', value: leadId },
      } as any);
      onInputChange({
        target: { name: 'destinationId', value: '' },
      } as any);
      onInputChange({
        target: { name: 'leadDestinationId', value: '' },
      } as any);
    }
  };

  const handleDestinationSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (isLead) {
      onInputChange({
        target: { name: 'leadDestinationId', value: val },
      } as any);
      onInputChange({
        target: { name: 'destinationId', value: val },
      } as any);
    } else {
      onInputChange({
        target: { name: 'destinationId', value: val },
      } as any);
    }
  };

  const handleTypeSwitch = (type: 'customer' | 'lead') => {
    if (onClientTypeChange) {
      onClientTypeChange(type);
    }
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
              ? 'Dispatch customer and lead destination work orders to field engineers'
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
              placeholder="e.g. Site Visit & Technical Demonstration"
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-white border border-border text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
            />
          </div>
        </div>

        {/* Client Entity Type Selector (Existing Customer vs Lead) */}
        {!isServiceOffice && (
          <div>
            <label className="block text-[12px] font-medium text-slate-700 mb-1.5">
              Task Target Type <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2.5 p-1 bg-slate-100 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => handleTypeSwitch('customer')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  !isLead
                    ? 'bg-white text-blue-700 shadow-xs border border-blue-200 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <Building2 size={14} className={!isLead ? 'text-blue-600' : 'text-slate-400'} />
                <span>Existing Customer</span>
              </button>
              <button
                type="button"
                onClick={() => handleTypeSwitch('lead')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  isLead
                    ? 'bg-white text-indigo-700 shadow-xs border border-indigo-200 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <UserPlus size={14} className={isLead ? 'text-indigo-600' : 'text-slate-400'} />
                <span>Lead (Pre-Sales)</span>
              </button>
            </div>
          </div>
        )}

        {/* Customer / Lead & Destination Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Target Entity Dropdown */}
          {isLead ? (
            <div>
              <label className="block text-[12px] font-medium text-slate-700 mb-1">
                Lead <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <UserPlus size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <select
                  name="leadId"
                  value={formData.leadId || ''}
                  onChange={handleLeadSelect}
                  required
                  className="w-full h-9 pl-9 pr-7 rounded-lg bg-white border border-border text-[13px] text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 cursor-pointer"
                >
                  <option value="">{loadingLeads ? 'Loading leads...' : 'Select Lead'}</option>
                  {internalLeads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.customerName} {l.companyName ? `(${l.companyName})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-[12px] font-medium text-slate-700 mb-1">
                Existing Customer <span className="text-rose-500">*</span>
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
                  <option value="">Select Existing Customer</option>
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
          )}

          {/* Destination Site Dropdown */}
          <div>
            <label className="block text-[12px] font-medium text-slate-700 mb-1">
              Destination Site <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                name="destinationId"
                value={isLead ? (formData.leadDestinationId || formData.destinationId || '') : formData.destinationId}
                onChange={handleDestinationSelect}
                required
                disabled={!(isLead ? formData.leadId : formData.customerId) || loadingDestinations}
                className="w-full h-9 pl-9 pr-7 rounded-lg bg-white border border-border text-[13px] text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">
                  {!(isLead ? formData.leadId : formData.customerId)
                    ? (isLead ? 'Select lead first' : 'Select customer first')
                    : loadingDestinations
                    ? 'Loading destinations...'
                    : destinations.length === 0
                    ? 'No destination sites registered'
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
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[12px] font-medium text-slate-700">
                {isLead ? 'Assign to Sales Employee' : 'Assign to Field Engineer'}
              </label>
              {isLead && (
                <span className="text-[10px] text-indigo-600 font-medium">
                  Sales Only
                </span>
              )}
            </div>
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
            {isLead && (
              <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                <Info size={12} className="text-indigo-500 shrink-0" />
                <span>Pre-sales lead tasks can only be assigned to Sales field employees.</span>
              </p>
            )}
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
            placeholder="Provide specific technical guidelines, equipment numbers, or contact instructions..."
            className="w-full p-2.5 rounded-lg bg-white border border-border text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all resize-none"
          />
        </div>
      </form>
    </Drawer>
  );
};
