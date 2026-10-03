import React, { useState } from 'react';
import { CheckCircle, X, FileCheck2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  quotationNumber: string;
  revisionNumber: number;
  onClose: () => void;
  onSubmit: (data: { customerPoNumber?: string; notes?: string }) => Promise<void>;
}

export const RecordCustomerAcceptanceModal: React.FC<Props> = ({
  isOpen,
  quotationNumber,
  revisionNumber,
  onClose,
  onSubmit,
}) => {
  const [customerPoNumber, setCustomerPoNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit({
        customerPoNumber: customerPoNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to record customer acceptance.');
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
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-50 text-emerald-600">
              <FileCheck2 size={20} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 leading-tight">
                Record Customer Acceptance
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {quotationNumber} (Rev {revisionNumber})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 leading-relaxed">
            Recording customer acceptance marks this quotation as commercially accepted, enabling the creation of downstream Sales Orders.
          </div>

          {error && (
            <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Customer PO Number (Optional)
            </label>
            <input
              type="text"
              value={customerPoNumber}
              onChange={(e) => setCustomerPoNumber(e.target.value)}
              placeholder="e.g. PO/2026/0987"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Acceptance Notes / Communication Details
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Confirmed via email by Mr. Sharma, PO signed copy received on 02-Oct-2026."
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <CheckCircle size={16} />
              {isSubmitting ? 'Recording...' : 'Confirm Acceptance'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
