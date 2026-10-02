import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, CalendarClock, Calendar, Clock, AlertCircle } from 'lucide-react';
import { FollowUpItem } from '../types/follow-up.types';
import { useRescheduleFollowUp } from '../hooks/useFollowUps';
import { Button } from '../../../components/ui/Button';

interface RescheduleFollowUpModalProps {
  isOpen: boolean;
  followUp: FollowUpItem | null;
  onClose: () => void;
}

export const RescheduleFollowUpModal: React.FC<RescheduleFollowUpModalProps> = ({
  isOpen,
  followUp,
  onClose,
}) => {
  const rescheduleMutation = useRescheduleFollowUp();

  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !followUp) return;
    setNewDate(followUp.scheduledDate || '');
    setNewTime(followUp.scheduledTime || '11:00');
    setReason('');
    setFormError(null);
  }, [isOpen, followUp]);

  if (!isOpen || !followUp) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newDate) {
      setFormError('Please select a new scheduled date.');
      return;
    }

    try {
      await rescheduleMutation.mutateAsync({
        id: followUp.id,
        payload: {
          scheduledDate: newDate,
          scheduledTime: newTime || null,
          reason: reason.trim() || null,
        },
      });
      onClose();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to reschedule follow-up');
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in select-none"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-blue-50/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Reschedule Follow-up</h3>
              <p className="text-xs text-slate-500 font-mono">{followUp.followUpNumber}</p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600">
            <span className="font-semibold text-slate-800 block mb-0.5">Currently Scheduled:</span>
            <span>
              {new Date(followUp.scheduledDate).toLocaleDateString('en-IN', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}{' '}
              {followUp.scheduledTime ? `at ${followUp.scheduledTime}` : ''}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                New Date <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="date"
                  required
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                New Time
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reason / Reschedule Note
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Client requested callback next Monday due to out of station travel..."
              className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={onClose} disabled={rescheduleMutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={rescheduleMutation.isPending}>
              Reschedule
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
