import React, { useState } from 'react';
import { CheckCircle2, XCircle, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  mode: 'APPROVE' | 'REJECT';
  quotationNumber: string;
  revisionNumber: number;
  onClose: () => void;
  onSubmit: (comments: string) => Promise<void>;
}

export const QuotationApprovalModal: React.FC<Props> = ({
  isOpen,
  mode,
  quotationNumber,
  revisionNumber,
  onClose,
  onSubmit,
}) => {
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const isApprove = mode === 'APPROVE';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isApprove && !comments.trim()) {
      setError('Please provide a reason for rejecting this quotation.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit(comments.trim());
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to process approval action.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                isApprove ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
              }`}
            >
              {isApprove ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isApprove ? 'Approve Quotation' : 'Reject Quotation'}
              </h3>
              <p className="text-xs text-slate-500">
                {quotationNumber} (Revision {revisionNumber})
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

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {error && (
            <div className="p-3 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700">
              {isApprove ? 'Approval Notes / Remarks (Optional)' : 'Rejection Reason (Required)'}
              {!isApprove && <span className="text-rose-500 ml-0.5">*</span>}
            </label>
            <textarea
              rows={3}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder={
                isApprove
                  ? 'Add any operational guidance or notes for dispatch...'
                  : 'Specify why this quotation is being rejected...'
              }
              className="w-full px-3.5 py-2.5 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all placeholder:text-slate-400"
              required={!isApprove}
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
              className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5 ${
                isApprove
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
                  : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30'
              }`}
            >
              {isSubmitting ? (
                <span>Processing...</span>
              ) : (
                <>
                  {isApprove ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                  <span>{isApprove ? 'Confirm Approval' : 'Confirm Rejection'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
