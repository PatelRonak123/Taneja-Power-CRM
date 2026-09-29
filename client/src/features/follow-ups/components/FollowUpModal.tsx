import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Clock, User, Building2, Target, FileSpreadsheet, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../../stores/authStore';
import { FollowUpItem, FollowUpType, FollowUpPriority } from '../types/follow-up.types';
import { useCreateFollowUp, useUpdateFollowUp } from '../hooks/useFollowUps';
import { useQuery } from '@tanstack/react-query';
import { employeeService } from '../../admin/services/employeeService';
import { customerService } from '../../customers/services/customerService';
import { Button } from '../../../components/ui/Button';

interface FollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  followUpToEdit?: FollowUpItem | null;
  initialEntity?: {
    customerId?: string;
    customerName?: string;
    leadId?: string;
    leadCode?: string;
    dealId?: string;
    dealTitle?: string;
    quotationId?: string;
    quotationNumber?: string;
    amcContractId?: string;
    amcContractNumber?: string;
  };
}

export const FollowUpModal: React.FC<FollowUpModalProps> = ({
  isOpen,
  onClose,
  followUpToEdit,
  initialEntity,
}) => {
  const { user } = useAuthStore();
  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const isEditing = !!followUpToEdit;

  const createMutation = useCreateFollowUp();
  const updateMutation = useUpdateFollowUp();

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<FollowUpType>('CALL');
  const [priority, setPriority] = useState<FollowUpPriority>('MEDIUM');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [assignedTo, setAssignedTo] = useState('');

  // Primary Entity Linking states
  const [customerId, setCustomerId] = useState('');
  const [leadId, setLeadId] = useState('');
  const [dealId, setDealId] = useState('');
  const [quotationId, setQuotationId] = useState('');
  const [amcContractId, setAmcContractId] = useState('');

  const [formError, setFormError] = useState<string | null>(null);

  // Fetch active employees if admin/manager
  const { data: employeesRes } = useQuery({
    queryKey: ['active-employees-for-followups'],
    queryFn: () => employeeService.getEmployees({ limit: 100 }),
    enabled: isOpen && isAdminOrManager,
  });

  // Fetch customers for selector if not prefilled
  const { data: customersRes } = useQuery({
    queryKey: ['customers-for-followups'],
    queryFn: () => customerService.getCustomers({ limit: 100 }),
    enabled: isOpen && !initialEntity?.customerId && !followUpToEdit?.customerId,
  });

  const employeesList = Array.isArray(employeesRes)
    ? employeesRes
    : (employeesRes as any)?.data || [];
  const customersList = customersRes?.data || [];

  // Reset or populate fields
  useEffect(() => {
    if (!isOpen) return;

    setFormError(null);

    if (followUpToEdit) {
      setTitle(followUpToEdit.title || '');
      setDescription(followUpToEdit.description || '');
      setType(followUpToEdit.type || 'CALL');
      setPriority(followUpToEdit.priority || 'MEDIUM');
      setScheduledDate(followUpToEdit.scheduledDate || '');
      setScheduledTime(followUpToEdit.scheduledTime || '');
      setAssignedTo(followUpToEdit.assignedTo || user?.id || '');
      setCustomerId(followUpToEdit.customerId || '');
      setLeadId(followUpToEdit.leadId || '');
      setDealId(followUpToEdit.dealId || '');
      setQuotationId(followUpToEdit.quotationId || '');
      setAmcContractId(followUpToEdit.amcContractId || '');
    } else {
      // Default scheduled date = today in IST
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
      setTitle('');
      setDescription('');
      setType('CALL');
      setPriority('MEDIUM');
      setScheduledDate(today);
      setScheduledTime('11:00');
      setAssignedTo(user?.id || '');

      // Apply initial entities if passed from detail pages
      setCustomerId(initialEntity?.customerId || '');
      setLeadId(initialEntity?.leadId || '');
      setDealId(initialEntity?.dealId || '');
      setQuotationId(initialEntity?.quotationId || '');
      setAmcContractId(initialEntity?.amcContractId || '');

      // Auto-suggest title based on entity context
      if (initialEntity?.quotationNumber) {
        setTitle(`Follow-up on Quotation ${initialEntity.quotationNumber}`);
        setType('QUOTATION_FOLLOW_UP');
      } else if (initialEntity?.amcContractNumber) {
        setTitle(`Follow-up on AMC Contract ${initialEntity.amcContractNumber}`);
        setType('AMC_RENEWAL');
      } else if (initialEntity?.customerName) {
        setTitle(`Follow-up with ${initialEntity.customerName}`);
      } else if (initialEntity?.leadCode) {
        setTitle(`Follow-up with Lead ${initialEntity.leadCode}`);
      }
    }
  }, [isOpen, followUpToEdit, initialEntity, user?.id]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!title.trim()) {
      setFormError('Please enter a follow-up title.');
      return;
    }

    if (!scheduledDate) {
      setFormError('Please select a scheduled date.');
      return;
    }

    const hasEntity = Boolean(
      customerId || leadId || dealId || quotationId || amcContractId
    );
    if (!hasEntity) {
      setFormError('Please select at least one related CRM record (Customer, Lead, Quotation, or AMC Contract).');
      return;
    }

    try {
      if (isEditing && followUpToEdit) {
        await updateMutation.mutateAsync({
          id: followUpToEdit.id,
          payload: {
            title: title.trim(),
            description: description.trim() || null,
            type,
            priority,
            scheduledDate,
            scheduledTime: scheduledTime || null,
            assignedTo: assignedTo || null,
            customerId: customerId || null,
            leadId: leadId || null,
            dealId: dealId || null,
            quotationId: quotationId || null,
            amcContractId: amcContractId || null,
          },
        });
      } else {
        await createMutation.mutateAsync({
          title: title.trim(),
          description: description.trim() || null,
          type,
          priority,
          scheduledDate,
          scheduledTime: scheduledTime || null,
          assignedTo: assignedTo || user?.id || null,
          customerId: customerId || null,
          leadId: leadId || null,
          dealId: dealId || null,
          quotationId: quotationId || null,
          amcContractId: amcContractId || null,
        });
      }
      onClose();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save follow-up');
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-hidden select-none">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300 animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 z-[100]">
        <div
          className="w-screen max-w-xl bg-white shadow-2xl flex flex-col border-l border-slate-200 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-200">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {isEditing ? `Edit Follow-up (${followUpToEdit?.followUpNumber})` : 'Schedule New Follow-up'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Plan and log business customer interactions with real-time tracking
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer border border-slate-200/80"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content Form */}
          <form id="followup-form" onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4 flex-1">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {/* Related Entity Banner (if prefilled) */}
          {(initialEntity || followUpToEdit) && (
            <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-xs space-y-1 text-slate-700">
              <div className="font-semibold text-blue-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                Linked CRM Record:
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {(initialEntity?.customerName || followUpToEdit?.customer?.name) && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-blue-200 rounded-md text-slate-800 font-medium">
                    <Building2 className="w-3 h-3 text-blue-600" />
                    {initialEntity?.customerName || followUpToEdit?.customer?.name}
                  </span>
                )}
                {(initialEntity?.quotationNumber || followUpToEdit?.quotation?.quotationNumber) && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-blue-200 rounded-md text-slate-800 font-medium">
                    <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                    Quotation: {initialEntity?.quotationNumber || followUpToEdit?.quotation?.quotationNumber}
                  </span>
                )}
                {(initialEntity?.amcContractNumber || followUpToEdit?.amcContract?.contractNumber) && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-blue-200 rounded-md text-slate-800 font-medium">
                    <ShieldCheck className="w-3 h-3 text-purple-600" />
                    AMC: {initialEntity?.amcContractNumber || followUpToEdit?.amcContract?.contractNumber}
                  </span>
                )}
                {(initialEntity?.leadCode || followUpToEdit?.lead?.leadCode) && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-blue-200 rounded-md text-slate-800 font-medium">
                    <Target className="w-3 h-3 text-amber-600" />
                    Lead: {initialEntity?.leadCode || followUpToEdit?.lead?.leadCode}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Call regarding quotation revision"
              className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          {/* Type & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Interaction Type <span className="text-rose-500">*</span>
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as FollowUpType)}
                className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="CALL">Phone Call</option>
                <option value="MEETING">In-Person Meeting</option>
                <option value="EMAIL">Email Follow-up</option>
                <option value="SITE_VISIT">Site Visit</option>
                <option value="QUOTATION_FOLLOW_UP">Quotation Follow-up</option>
                <option value="PAYMENT_FOLLOW_UP">Payment Follow-up</option>
                <option value="AMC_RENEWAL">AMC Renewal</option>
                <option value="AMC_EXPIRY">AMC Expiry</option>
                <option value="CUSTOMER_VISIT">Customer Visit</option>
                <option value="OTHER">Other / General</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as FollowUpPriority)}
                className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Scheduled Date <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="date"
                  required
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Scheduled Time
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Assigned Employee (for Admin/Manager) */}
          {isAdminOrManager ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Assigned Employee
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value={user?.id || ''}>Assigned to Me ({user?.fullName})</option>
                  {employeesList.map((emp: any) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} ({emp.designation || emp.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <input type="hidden" value={assignedTo} />
          )}

          {/* Customer Selector if not prefilled */}
          {!initialEntity?.customerId && !followUpToEdit?.customerId && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Customer Record <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">-- Select Customer --</option>
                  {customersList.map((cust) => (
                    <option key={cust.id} value={cust.id}>
                      {cust.name} {cust.companyName ? `(${cust.companyName})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Description & Agenda Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Notes & Discussion Agenda
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add key talking points, background notes, customer inquiries..."
              className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white resize-none"
            />
          </div>

          </form>

          {/* Sticky Footer */}
          <div className="px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-end gap-3 shrink-0">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" form="followup-form" variant="primary" isLoading={isSubmitting}>
              {isEditing ? 'Save Changes' : 'Schedule Follow-up'}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
