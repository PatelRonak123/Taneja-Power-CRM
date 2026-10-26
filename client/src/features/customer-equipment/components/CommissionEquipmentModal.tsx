import React, { useState, useMemo } from 'react';
import type {
  CustomerEquipment,
  CustomerEquipmentWarrantyDurationUnit,
  CommissioningResult,
} from '../types/customer-equipment.types';
import { customerEquipmentService } from '../services/customerEquipmentService';
import { calculateWarrantyDates } from '../utils/warranty-date.util';
import { toast } from '../../../utils/toast';
import { Drawer } from '../../../components/ui/Drawer';
import {
  Loader2,
  ShieldCheck,
  Clock,
  Sparkles,
  Info,
  AlertCircle,
} from 'lucide-react';

interface CommissionEquipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipment: CustomerEquipment;
  onSuccess: (result: CommissioningResult) => void;
  onConflict?: () => void;
}

export const CommissionEquipmentModal: React.FC<CommissionEquipmentModalProps> = ({
  isOpen,
  onClose,
  equipment,
  onSuccess,
  onConflict,
}) => {
  // Today's date as YYYY-MM-DD
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [installationDate, setInstallationDate] = useState<string>(
    equipment.installationDate ? equipment.installationDate.slice(0, 10) : todayStr
  );
  const [durationValue, setDurationValue] = useState<number>(
    equipment.warrantyDurationValue && equipment.warrantyDurationValue > 0
      ? equipment.warrantyDurationValue
      : 12
  );
  const [durationUnit, setDurationUnit] = useState<CustomerEquipmentWarrantyDurationUnit>(
    equipment.warrantyDurationUnit || 'MONTHS'
  );
  const [notes, setNotes] = useState<string>(equipment.commissioningNotes || '');
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Live preview calculation using shared date utility
  const datePreview = useMemo(() => {
    if (!installationDate || !durationValue || durationValue <= 0) {
      return null;
    }
    try {
      return calculateWarrantyDates({
        installationDate,
        durationValue: Math.floor(durationValue),
        durationUnit,
      });
    } catch {
      return null;
    }
  }, [installationDate, durationValue, durationUnit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    // Field validations
    if (!installationDate || !installationDate.trim()) {
      setValidationError('Installation date is required.');
      return;
    }

    const intDuration = Math.floor(durationValue);
    if (isNaN(intDuration) || intDuration <= 0) {
      setValidationError('Warranty duration must be a positive whole number (e.g. 12).');
      return;
    }

    if (durationUnit !== 'MONTHS' && durationUnit !== 'YEARS') {
      setValidationError('Warranty duration unit must be MONTHS or YEARS.');
      return;
    }

    if (notes && notes.length > 1000) {
      setValidationError('Commissioning notes cannot exceed 1000 characters.');
      return;
    }

    setValidationError(null);
    setSubmitting(true);

    try {
      const result = await customerEquipmentService.commissionEquipment(equipment.id, {
        installationDate,
        warrantyDurationValue: intDuration,
        warrantyDurationUnit: durationUnit,
        commissioningNotes: notes.trim() ? notes.trim() : null,
      });

      const expiryStr = result.warranty?.warrantyEndDate
        ? new Date(result.warranty.warrantyEndDate).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })
        : result.warranty?.warrantyEndDate || 'N/A';

      toast.success(
        'Equipment Commissioned Successfully',
        `Warranty activated. Expiry Date: ${expiryStr}`
      );

      onSuccess(result);
      onClose();
    } catch (err: any) {
      const statusCode = err?.statusCode || (err?.response?.status as number | undefined);
      const errorCode = err?.code;
      const errorMessage = err?.message || 'Failed to commission equipment';

      if (statusCode === 409 || errorCode === 'ALREADY_COMMISSIONED') {
        toast.error('Equipment Already Commissioned', errorMessage);
        if (onConflict) {
          onConflict();
        }
        onClose();
      } else {
        toast.error('Commissioning Failed', errorMessage);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const drawerTitle = (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shadow-2xs shrink-0">
        <ShieldCheck size={22} />
      </div>
      <div>
        <div className="font-bold text-slate-900 text-base leading-tight">
          Commission & Activate Warranty
        </div>
        <div className="text-xs text-slate-500 font-mono mt-0.5">
          Asset #{equipment.assetNumber} — {equipment.productName}
        </div>
      </div>
    </div>
  );

  const drawerFooter = (
    <div className="flex items-center justify-end gap-3 w-full">
      <button
        type="button"
        onClick={onClose}
        disabled={submitting}
        className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
      >
        Cancel
      </button>
      <button
        type="submit"
        form="commission-equipment-form"
        disabled={submitting || !datePreview}
        className="px-4.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
      >
        {submitting ? (
          <>
            <Loader2 size={13} className="animate-spin" />
            Activating Warranty...
          </>
        ) : (
          <>
            <ShieldCheck size={14} />
            Confirm & Activate Warranty
          </>
        )}
      </button>
    </div>
  );

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      side="right"
      maxWidth="md"
      title={drawerTitle}
      footer={drawerFooter}
    >
      <form id="commission-equipment-form" onSubmit={handleSubmit} className="space-y-4.5 text-xs">
        {validationError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0 text-rose-600" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Info Banner */}
        <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200/80 text-blue-900 text-xs flex items-start gap-2.5">
          <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5 text-[11px]">
            <span className="font-semibold block text-blue-950">
              Official Commissioning Milestone
            </span>
            <p className="text-blue-800 leading-relaxed">
              Commissioning is the authoritative event that activates the warranty lifecycle.
              Once activated, the installation date becomes locked to maintain warranty audit integrity.
            </p>
          </div>
        </div>

        {/* Installation Date */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Installation / Commissioning Date <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              type="date"
              required
              value={installationDate}
              onChange={(e) => {
                setInstallationDate(e.target.value);
                setValidationError(null);
              }}
              disabled={submitting}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 bg-white text-slate-900 disabled:bg-slate-100 disabled:text-slate-500"
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            The date the equipment was physically placed into operational service on site.
          </p>
        </div>

        {/* Warranty Duration & Unit */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Warranty Duration <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              step="1"
              required
              value={durationValue}
              onChange={(e) => {
                setDurationValue(Math.max(1, parseInt(e.target.value, 10) || 1));
                setValidationError(null);
              }}
              disabled={submitting}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 bg-white text-slate-900 disabled:bg-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Duration Unit <span className="text-rose-500">*</span>
            </label>
            <select
              value={durationUnit}
              onChange={(e) => {
                setDurationUnit(e.target.value as CustomerEquipmentWarrantyDurationUnit);
                setValidationError(null);
              }}
              disabled={submitting}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 bg-white text-slate-900 disabled:bg-slate-100"
            >
              <option value="MONTHS">Months</option>
              <option value="YEARS">Years</option>
            </select>
          </div>
        </div>

        {/* Live Preview Card */}
        {datePreview ? (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <Sparkles size={14} className="text-blue-600" />
              <span>Calculated Warranty Schedule Preview</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <span className="text-slate-500 block text-[10px] uppercase tracking-wide">
                  Warranty Start Date
                </span>
                <span className="font-semibold text-slate-900 font-mono">
                  {datePreview.installationDateStr}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <span className="text-slate-500 block text-[10px] uppercase tracking-wide">
                  Warranty Expiry Date
                </span>
                <span className="font-semibold text-emerald-700 font-mono">
                  {datePreview.warrantyEndDateStr}
                </span>
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-[11px] flex items-center justify-between">
              <span className="text-slate-600 font-medium">Proposed AMC Start:</span>
              <span className="font-bold text-blue-700 font-mono">
                {datePreview.proposedAmcStartDateStr}
              </span>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-slate-500 text-[11px] flex items-center gap-2">
            <Clock size={14} />
            <span>Enter a valid installation date and positive duration to preview the calculated schedule.</span>
          </div>
        )}

        {/* Commissioning Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Commissioning Notes & Handover Details (Optional)
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setValidationError(null);
            }}
            disabled={submitting}
            maxLength={1000}
            placeholder="Record technician sign-off, commissioning checklist results, customer acceptance remarks..."
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 bg-white text-slate-900 disabled:bg-slate-100"
          />
          <div className="flex justify-end text-[10px] text-slate-400 mt-0.5">
            {notes.length}/1000
          </div>
        </div>
      </form>
    </Drawer>
  );
};

export const CommissionEquipmentDrawer = CommissionEquipmentModal;
