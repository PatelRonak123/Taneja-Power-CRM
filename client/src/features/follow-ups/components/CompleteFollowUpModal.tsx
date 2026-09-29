import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle2, Calendar, AlertCircle } from 'lucide-react';
import { FollowUpItem, FollowUpType } from '../types/follow-up.types';
import { useCompleteFollowUp } from '../hooks/useFollowUps';
import { Button } from '../../../components/ui/Button';

interface CompleteFollowUpModalProps {
  isOpen: boolean;
  followUp: FollowUpItem | null;
  onClose: () => void;
}

export const CompleteFollowUpModal: React.FC<CompleteFollowUpModalProps> = ({
  isOpen,
  followUp,
  onClose,
}) => {
  const completeMutation = useCompleteFollowUp();

  const [outcome, setOutcome] = useState('');
  const [notes, setNotes] = useState('');
  const [createNext, setCreateNext] = useState(false);
  const [nextDate, setNextDate] = useState('');
  const [nextTime, setNextTime] = useState('11:00');
  const [nextTitle, setNextTitle] = useState('');
  const [nextType, setNextType] = useState<FollowUpType>('CALL');
  const [nextNotes, setNextNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setOutcome('');
    setNotes('');
    setCreateNext(false);
    setFormError(null);

    // Default next date = 3 days later
    const d = new Date();
    d.setDate(d.getDate() + 3);
    const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d);
    setNextDate(dateStr);
    setNextTime('11:00');
    setNextTitle(followUp?.title ? `Next follow-up: ${followUp.title}` : 'Next follow-up');
    setNextType(followUp?.type || 'CALL');
    setNextNotes('');
  }, [isOpen, followUp]);

  if (!isOpen || !followUp) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!outcome.trim()) {
      setFormError('Please enter the interaction outcome.');
      return;
    }

    if (createNext && !nextDate) {
      setFormError('Please select a date for the next follow-up.');
      return;
    }

    try {
      await completeMutation.mutateAsync({
        id: followUp.id,
        payload: {
          outcome: outcome.trim(),
          notes: notes.trim() || null,
          createNextFollowUp: createNext,
          nextFollowUpDate: createNext ? nextDate : null,
          nextFollowUpTime: createNext ? nextTime || null : null,
          nextFollowUpTitle: createNext ? nextTitle.trim() : null,
          nextFollowUpType: createNext ? nextType : null,
          nextFollowUpNotes: createNext ? nextNotes.trim() || null : null,
        },
      });
      onClose();
    } catch (err: any) {
      setFormError(err?.message || 'Unable to complete follow-up');
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Complete Follow-up</h3>
              <p className="text-xs text-slate-500 font-mono">{followUp.followUpNumber} • {followUp.title}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4 flex-1">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {/* Outcome */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Interaction Outcome & Discussion Result <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              placeholder="e.g. Customer requested revised quotation with 15% discount; agreed to confirm by Tuesday."
              className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white resize-none"
            />
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Internal Remarks (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any other internal notes, observations, or action points..."
              className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white resize-none"
            />
          </div>

          {/* Schedule Next Follow-up Toggle */}
          <div className="pt-2 border-t border-slate-100">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={createNext}
                onChange={(e) => setCreateNext(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
              />
              <span className="text-sm font-semibold text-slate-800">
                Schedule a follow-up action for this customer?
              </span>
            </label>
          </div>

          {/* Next Follow-up fields */}
          {createNext && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 animate-fade-in text-xs">
              <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                <Calendar className="w-4 h-4 text-emerald-600" />
                Next Scheduled Interaction
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required={createNext}
                  value={nextTitle}
                  onChange={(e) => setNextTitle(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    required={createNext}
                    value={nextDate}
                    onChange={(e) => setNextDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Time</label>
                  <input
                    type="time"
                    value={nextTime}
                    onChange={(e) => setNextTime(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Type</label>
                <select
                  value={nextType}
                  onChange={(e) => setNextType(e.target.value as FollowUpType)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                >
                  <option value="CALL">Phone Call</option>
                  <option value="MEETING">Meeting</option>
                  <option value="EMAIL">Email</option>
                  <option value="SITE_VISIT">Site Visit</option>
                  <option value="QUOTATION_FOLLOW_UP">Quotation Follow-up</option>
                  <option value="PAYMENT_FOLLOW_UP">Payment Follow-up</option>
                  <option value="AMC_RENEWAL">AMC Renewal</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={onClose} disabled={completeMutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={completeMutation.isPending}>
              Complete Follow-up
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
