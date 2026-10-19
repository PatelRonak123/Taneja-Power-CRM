import React from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Clock,
  Zap,
  Building2,
  X,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import type { AmcContract } from '../api/amcContractApi';

interface ActivateAmcContractModalProps {
  isOpen: boolean;
  contract: AmcContract | null;
  isLoading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const ActivateAmcContractModal: React.FC<ActivateAmcContractModalProps> = ({
  isOpen,
  contract,
  isLoading,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !contract) return null;

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const equipmentCount = contract.equipment?.length || 0;

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-y-auto select-none">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300 animate-fade-in"
        onClick={isLoading ? undefined : onClose}
      />

      {/* Modal Container */}
      <div className="min-h-full flex items-center justify-center p-4">
        <div
          className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-200">
                <CheckCircle2 size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Activate AMC Contract
                </h3>
                <p className="text-xs text-slate-500">
                  {contract.contractNumber} &bull; {contract.customerCompanyName || contract.customerName}
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={isLoading}
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer border border-slate-200/80 disabled:opacity-50"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            {/* Contract Summary Card */}
            <div className="bg-slate-50 rounded-xl border border-slate-200/80 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Contract Agreement
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  {contract.contractNumber}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                    <Building2 size={12} className="text-slate-400" /> Customer
                  </span>
                  <span className="font-bold text-slate-900 truncate">
                    {contract.customerCompanyName || contract.customerName}
                  </span>
                </div>

                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                    <ShieldCheck size={12} className="text-slate-400" /> AMC Plan
                  </span>
                  <span className="font-bold text-purple-700 truncate">
                    {contract.amcPlan}
                  </span>
                </div>

                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                    <Calendar size={12} className="text-slate-400" /> Period
                  </span>
                  <span className="font-bold text-slate-900">
                    {formatDate(contract.contractStartDate)} &ndash; {formatDate(contract.contractEndDate)}
                  </span>
                </div>

                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                    <Clock size={12} className="text-slate-400" /> Visits
                  </span>
                  <span className="font-bold text-slate-900">
                    {contract.scheduledVisits} Visits ({contract.serviceFrequency})
                  </span>
                </div>

                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                    <Zap size={12} className="text-slate-400" /> Covered Equipment
                  </span>
                  <span className="font-bold text-slate-900">
                    {equipmentCount} unit{equipmentCount !== 1 ? 's' : ''} listed
                  </span>
                </div>

                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                    Payment Status
                  </span>
                  <span className={`font-bold inline-flex items-center gap-1 ${
                    contract.paymentStatus === 'PAID'
                      ? 'text-emerald-700'
                      : 'text-blue-700'
                  }`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {contract.paymentStatus}
                  </span>
                </div>
              </div>
            </div>

            {/* Warning Callout */}
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2 text-xs text-emerald-950">
              <div className="flex items-center gap-2 font-bold text-emerald-900">
                <AlertTriangle size={15} className="text-emerald-700 shrink-0" />
                <span>Notice of Activation Effects</span>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-emerald-900 text-[11px] leading-relaxed">
                <li>
                  Contract status will permanently transition to <strong>ACTIVE</strong>.
                </li>
                <li>
                  A full preventive service schedule with <strong>{contract.scheduledVisits} visits</strong> will be automatically generated.
                </li>
                <li>
                  All {equipmentCount} covered customer equipment asset{equipmentCount !== 1 ? 's' : ''} will be updated to <strong>AMC_COVERED</strong>.
                </li>
                <li>
                  Any linked originating warranty-expiry follow-up will be marked as <strong>COMPLETED</strong>.
                </li>
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
            <button
              type="button"
              disabled={isLoading}
              onClick={onClose}
              className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={onConfirm}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50 transition-all shadow-sm"
            >
              {isLoading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Activating Contract...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} />
                  <span>Confirm &amp; Activate Contract</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
