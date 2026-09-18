import React, { useState } from 'react';
import { GitBranch, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  quotationNumber: string;
  currentRevisionNumber: number;
  onClose: () => void;
  onSubmit: (revisionReason: string) => Promise<void>;
}

export const QuotationRevisionModal: React.FC<Props> = ({
  isOpen,
  quotationNumber,
  currentRevisionNumber,
  onClose,
  onSubmit,
}) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const nextRevisionNumber = currentRevisionNumber + 1;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please specify a reason for creating this formal revision.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit(reason.trim());
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create revision.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <GitBranch size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Create Formal Revision</h3>
              <p className="text-xs text-slate-500">
                {quotationNumber} (Upgrading Rev {currentRevisionNumber} ➔ Rev {nextRevisionNumber})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div className="p-3 bg-purple-50/70 border border-purple-200/60 rounded-xl text-xs text-purple-900 leading-relaxed">
            <strong>Revision Policy:</strong> Creating Revision {nextRevisionNumber} will preserve Revision{' '}
            {currentRevisionNumber} permanently as historical. The new revision will start as Draft and require management approval before dispatch.
          </div>

          {error && (
            <div className="p-3 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700">
              Revision Reason / Scope Changes <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Client requested 5% additional discount on equipment and extended AMC duration..."
              className="w-full px-3.5 py-2.5 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all placeholder:text-slate-400"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-sm shadow-purple-600/30 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <GitBranch size={14} />
              <span>{isSubmitting ? 'Creating...' : `Create Revision ${nextRevisionNumber}`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
