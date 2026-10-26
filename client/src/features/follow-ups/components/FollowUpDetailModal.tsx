import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Calendar,
  Clock,
  User,
  Building2,
  Target,
  FileSpreadsheet,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  CalendarClock,
  Ban,
  ArrowRight,
  Phone,
  History,
  Cpu,
} from 'lucide-react';
import { FollowUpItem } from '../types/follow-up.types';
import { FollowUpStatusBadge } from './FollowUpStatusBadge';
import { FollowUpPriorityBadge } from './FollowUpPriorityBadge';
import { FollowUpTypeBadge } from './FollowUpTypeBadge';
import { Button } from '../../../components/ui/Button';
import { confirmModal } from '../../../utils/confirmModal';
import { useCancelFollowUp } from '../hooks/useFollowUps';
import { useAuthStore } from '../../../stores/authStore';
import { navigate } from '../../../app/router/navigation';
import { calculateAmcDatesFromWarrantyEnd } from '../../customer-equipment/utils/warranty-date.util';
import { AMC_CONVERSION_STORAGE_KEY } from '../../quotations/utils/amc-conversion-handoff.util';
import { toast } from '../../../utils/toast';

interface FollowUpDetailModalProps {
  isOpen: boolean;
  followUp: FollowUpItem | null;
  onClose: () => void;
  onOpenComplete?: (item: FollowUpItem) => void;
  onOpenReschedule?: (item: FollowUpItem) => void;
  onOpenEdit?: (item: FollowUpItem) => void;
}

export const FollowUpDetailModal: React.FC<FollowUpDetailModalProps> = ({
  isOpen,
  followUp,
  onClose,
  onOpenComplete,
  onOpenReschedule,
}) => {
  const { user } = useAuthStore();
  const cancelMutation = useCancelFollowUp();
  const [isConverting, setIsConverting] = useState(false);

  if (!isOpen || !followUp) return null;

  const isPending = followUp.status === 'PENDING';
  const isAccountantOffice =
    user?.role === 'USER' && user?.designation === 'Accountant Office';
  const canMutate = !isAccountantOffice && isPending;

  const handleConvertToAmcQuotation = () => {
    if (!followUp || !followUp.customerId) {
      toast.error('Missing Customer', 'Cannot convert follow-up without a customer association.');
      return;
    }

    setIsConverting(true);
    const eq = followUp.equipment;
    let amcStartDate = '';
    let amcEndDate = '';
    if (eq?.warrantyEndDate) {
      try {
        const dates = calculateAmcDatesFromWarrantyEnd(eq.warrantyEndDate);
        amcStartDate = dates.proposedAmcStartDate;
        amcEndDate = dates.proposedAmcEndDate;
      } catch (err) {
        console.error('Failed to calculate AMC dates from warranty end date:', err);
      }
    }

    const conversionId = `conv_${followUp.id}_${Date.now()}`;
    const conversionPayload = {
      conversionId,
      followUpId: followUp.id,
      equipmentId: followUp.customerEquipmentId || eq?.id || null,
      customerId: followUp.customerId,
      customerName: followUp.customer?.name || '',
      companyName: followUp.customer?.companyName || null,
      assetNumber: eq?.assetNumber || '',
      productName: eq?.productName || 'STABILIZER AMC',
      make: eq?.make || null,
      model: eq?.model || null,
      capacityRating: eq?.capacityRating || null,
      warrantyEndDate: eq?.warrantyEndDate ? String(eq.warrantyEndDate).split('T')[0] : null,
      amcStartDate,
      amcEndDate,
      createdAt: Date.now(),
    };

    sessionStorage.setItem(AMC_CONVERSION_STORAGE_KEY, JSON.stringify(conversionPayload));
    toast.info('Drafting AMC Quotation', 'Prefilling commercial proposal for expiring warranty equipment.');
    onClose();
    navigate(`/quotations/create?type=AMC&customerId=${followUp.customerId}&conversionId=${conversionId}`);
  };

  const handleCancelClick = async () => {
    const confirmed = await confirmModal.danger(
      'Cancel Follow-up?',
      'Are you sure you want to cancel this scheduled follow-up? This action will mark it as cancelled while keeping its historical record.',
      'Cancel Follow-up'
    );

    if (confirmed) {
      await cancelMutation.mutateAsync({
        id: followUp.id,
        payload: { reason: 'Cancelled by user' },
      });
      onClose();
    }
  };

  const formattedCreatedDate = new Date(followUp.createdAt).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return createPortal(
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in select-none"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-bold text-slate-800 bg-white border border-slate-200 px-2.5 py-1 rounded-lg shadow-2xs">
              {followUp.followUpNumber}
            </span>
            <FollowUpStatusBadge
              status={followUp.status}
              scheduledDate={followUp.scheduledDate}
            />
            <FollowUpPriorityBadge priority={followUp.priority} />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-6 space-y-6 flex-1 text-slate-800">
          {/* Title & Type */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FollowUpTypeBadge type={followUp.type} />
            </div>
            <h2 className="text-xl font-bold text-slate-900 leading-snug">
              {followUp.title}
            </h2>
            {followUp.description && (
              <p className="mt-2 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                {followUp.description}
              </p>
            )}
          </div>

          {/* Schedule & Assignee Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50/80 rounded-xl border border-slate-100 text-xs">
            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
              <div>
                <span className="text-slate-500 block">Scheduled Date</span>
                <span className="font-semibold text-slate-800 text-sm">
                  {new Date(followUp.scheduledDate).toLocaleDateString('en-IN', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-amber-500 shrink-0" />
              <div>
                <span className="text-slate-500 block">Scheduled Time</span>
                <span className="font-semibold text-slate-800 text-sm">
                  {followUp.scheduledTime || 'No specific time set'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-2 border-t border-slate-200/60 sm:border-t-0 sm:pt-0">
              <User className="w-4 h-4 text-indigo-600 shrink-0" />
              <div>
                <span className="text-slate-500 block">Assigned To</span>
                <span className="font-semibold text-slate-800">
                  {followUp.assignedEmployee?.fullName || 'Unassigned'}
                </span>
                {followUp.assignedEmployee?.designation && (
                  <span className="text-slate-500 text-[11px] block">
                    {followUp.assignedEmployee.designation}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-2 border-t border-slate-200/60 sm:border-t-0 sm:pt-0">
              <History className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <span className="text-slate-500 block">Created By</span>
                <span className="font-medium text-slate-700">
                  {followUp.creator?.fullName || 'System'}
                </span>
                <span className="text-slate-400 text-[11px] block">{formattedCreatedDate}</span>
              </div>
            </div>
          </div>

          {/* Linked CRM Entities */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Associated CRM Records
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {followUp.customer && (
                <div
                  onClick={() => {
                    navigate('/customers');
                    onClose();
                  }}
                  className="p-3 rounded-xl border border-slate-200 bg-white hover:border-blue-400 hover:shadow-xs transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="flex items-center gap-1 font-medium">
                      <Building2 className="w-3.5 h-3.5 text-blue-600" /> Customer
                    </span>
                    <ArrowRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <div className="font-bold text-slate-900 text-sm">{followUp.customer.name}</div>
                  {followUp.customer.companyName && (
                    <div className="text-slate-600 text-xs">{followUp.customer.companyName}</div>
                  )}
                  {followUp.customer.phone && (
                    <div className="flex items-center gap-1 text-slate-500 text-[11px] mt-1">
                      <Phone className="w-3 h-3" /> {followUp.customer.phone}
                    </div>
                  )}
                </div>
              )}

              {followUp.quotation && (
                <div
                  onClick={() => {
                    navigate(`/quotations/${followUp.quotationId}`);
                    onClose();
                  }}
                  className="p-3 rounded-xl border border-slate-200 bg-white hover:border-emerald-400 hover:shadow-xs transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="flex items-center gap-1 font-medium text-emerald-700">
                      <FileSpreadsheet className="w-3.5 h-3.5" /> Quotation
                    </span>
                    <ArrowRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <div className="font-bold text-slate-900 text-sm">
                    {followUp.quotation.quotationNumber}
                  </div>
                  <div className="text-slate-600 text-xs">
                    Type: {followUp.quotation.quotationType} • Status: {followUp.quotation.status}
                  </div>
                </div>
              )}

              {followUp.lead && (
                <div
                  onClick={() => {
                    navigate('/leads');
                    onClose();
                  }}
                  className="p-3 rounded-xl border border-slate-200 bg-white hover:border-amber-400 hover:shadow-xs transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="flex items-center gap-1 font-medium text-amber-700">
                      <Target className="w-3.5 h-3.5" /> Lead Opportunity
                    </span>
                    <ArrowRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <div className="font-bold text-slate-900 text-sm">{followUp.lead.customerName}</div>
                  <div className="text-slate-600 text-xs">
                    Code: {followUp.lead.leadCode} • Status: {followUp.lead.status}
                  </div>
                </div>
              )}

              {followUp.amcContract && (
                <div
                  onClick={() => {
                    navigate(`/amc-contracts/${followUp.amcContractId}`);
                    onClose();
                  }}
                  className="p-3 rounded-xl border border-slate-200 bg-white hover:border-purple-400 hover:shadow-xs transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="flex items-center gap-1 font-medium text-purple-700">
                      <ShieldCheck className="w-3.5 h-3.5" /> AMC Contract
                    </span>
                    <ArrowRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <div className="font-bold text-slate-900 text-sm">
                    {followUp.amcContract.contractNumber}
                  </div>
                  <div className="text-slate-600 text-xs">
                    Plan: {followUp.amcContract.amcPlan} • Status: {followUp.amcContract.status}
                  </div>
                </div>
              )}

              {(followUp.equipment || followUp.customerEquipmentId) && (
                <div
                  onClick={() => {
                    const targetEqId = followUp.customerEquipmentId || followUp.equipment?.id;
                    if (targetEqId) {
                      navigate(`/customer-equipment/${targetEqId}`);
                      onClose();
                    }
                  }}
                  className="p-3 rounded-xl border border-slate-200 bg-white hover:border-indigo-400 hover:shadow-xs transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="flex items-center gap-1 font-medium text-indigo-700">
                      <Cpu className="w-3.5 h-3.5 text-indigo-600" /> Customer Equipment
                    </span>
                    <ArrowRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <div className="font-bold text-slate-900 text-sm font-mono">
                    {followUp.equipment?.assetNumber || 'Linked Asset'}
                  </div>
                  {followUp.equipment?.productName && (
                    <div className="text-slate-700 font-medium text-xs mt-0.5">
                      {followUp.equipment.productName}
                      {followUp.equipment.model && (
                        <span className="text-slate-500 font-normal"> • {followUp.equipment.model}</span>
                      )}
                    </div>
                  )}
                  {followUp.equipment?.warrantyEndDate && (
                    <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                      <span>
                        Warranty Expiry: {new Date(followUp.equipment.warrantyEndDate).toLocaleDateString()}
                      </span>
                      {followUp.equipment.warrantyStatus && (
                        <span className="font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded text-[10px]">
                          {followUp.equipment.warrantyStatus}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Completion Details */}
          {followUp.status === 'COMPLETED' && (
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2 text-xs">
              <div className="font-bold text-emerald-900 flex items-center gap-1.5 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Follow-up Outcome & Completion Notes
              </div>
              <p className="text-slate-800 whitespace-pre-wrap leading-relaxed">
                {followUp.outcome || 'Marked completed.'}
              </p>
              <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between text-slate-500">
                <span>Completed by: {followUp.completer?.fullName || 'User'}</span>
                {followUp.completedAt && (
                  <span>
                    {new Date(followUp.completedAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Cancellation Details */}
          {followUp.status === 'CANCELLED' && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
              <div className="font-bold text-slate-800 flex items-center gap-1.5 text-sm">
                <Ban className="w-4 h-4 text-slate-500" />
                Cancellation Reason
              </div>
              <p className="text-slate-600">{followUp.cancellationReason || 'No reason provided.'}</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {canMutate && (
              <button
                type="button"
                onClick={handleCancelClick}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                Cancel Follow-up
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {followUp.type === 'WARRANTY_EXPIRY' && (
              followUp.quotationId ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigate(`/quotations/${followUp.quotationId}`);
                    onClose();
                  }}
                  className="text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                  View AMC Quotation
                </Button>
              ) : (
                canMutate && (
                  <Button
                    variant="primary"
                    size="sm"
                    isLoading={isConverting}
                    onClick={handleConvertToAmcQuotation}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 mr-1" />
                    Convert to AMC Quotation
                  </Button>
                )
              )
            )}

            {canMutate && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onClose();
                    onOpenReschedule?.(followUp);
                  }}
                >
                  <CalendarClock className="w-3.5 h-3.5 mr-1" />
                  Reschedule
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    onClose();
                    onOpenComplete?.(followUp);
                  }}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Complete
                </Button>
              </>
            )}

            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
