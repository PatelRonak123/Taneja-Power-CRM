import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { QuotationDetailedView, QuotationRevision } from '../types/quotation.types';
import { quotationService } from '../services/quotationService';
import { Mail, Send, X, FileText, CheckCircle2, AlertCircle, Loader2, Building2, User } from 'lucide-react';
import { toast } from '../../../utils/toast';

interface SendQuotationEmailModalProps {
  isOpen: boolean;
  quotation: QuotationDetailedView;
  revision?: QuotationRevision | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export const SendQuotationEmailModal: React.FC<SendQuotationEmailModalProps> = ({
  isOpen,
  quotation,
  revision,
  onClose,
  onSuccess,
}) => {
  const activeRev = revision || quotation.currentRevision;
  const initialEmail = quotation.customer?.email || activeRev?.customerEmail || '';
  const customerName = quotation.customer?.name || activeRev?.customerName || 'Customer';

  const [recipientEmail, setRecipientEmail] = useState(initialEmail);
  const [customSubject, setCustomSubject] = useState(
    `Commercial Quotation ${quotation.quotationNumber} (Rev ${activeRev?.revisionNumber || 1}) - Taneja Power Systems`
  );
  const [customNotes, setCustomNotes] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!recipientEmail || !recipientEmail.includes('@')) {
      setErrorMessage('Please provide a valid recipient customer email address.');
      return;
    }

    try {
      setIsSending(true);
      const res = await quotationService.sendQuotationEmail(quotation.id, {
        customEmail: recipientEmail,
        customSubject: customSubject,
        customNotes: customNotes,
      });

      const successText = res?.data?.message || `Quotation PDF successfully emailed to ${recipientEmail}`;
      setSuccessMessage(successText);
      toast.success('Email Sent', successText);
      if (onSuccess) {
        onSuccess();
      }
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to send email via Resend.';
      setErrorMessage(msg);
      toast.error('Failed to send email', msg);
    } finally {
      setIsSending(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-100 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      {/* Full Viewport Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white p-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-500/20 backdrop-blur-md rounded-xl border border-indigo-400/30">
              <Mail className="w-6 h-6 text-indigo-200" />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight text-white">Send Quotation PDF Email</h3>
              <p className="text-xs text-indigo-200/90 font-medium">
                Dispatch official PDF directly to customer via Resend mail service
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSending}
            className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content & Form */}
        <form onSubmit={handleSendEmail} className="p-6 space-y-5 flex-1">
          {/* Status Banners */}
          {errorMessage && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-3 text-rose-800 text-xs leading-relaxed animate-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-rose-900 block mb-0.5">Email Delivery Error</span>
                {errorMessage}
              </div>
            </div>
          )}

          {successMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start space-x-3 text-emerald-800 text-xs leading-relaxed animate-in slide-in-from-top-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-emerald-900 block mb-0.5">Email Dispatched</span>
                {successMessage}
              </div>
            </div>
          )}

          {/* Customer Summary Card */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-500 font-semibold border-b border-slate-200/60 pb-2">
              <span className="flex items-center gap-1.5 text-slate-700">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>{quotation.customer?.companyName || customerName}</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-mono font-bold text-[11px]">
                {quotation.quotationNumber} (Rev {activeRev?.revisionNumber || 1})
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-600 pt-1">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Contact Person: <strong>{customerName}</strong>
              </span>
              <span className="flex items-center gap-1 text-slate-700">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                PDF Attached Automatically
              </span>
            </div>
          </div>

          {/* Recipient Email Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Customer Email Address <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="customer@company.com"
                className="w-full px-3.5 py-2.5 text-sm font-semibold text-slate-900 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-xs"
              />
              {!initialEmail && (
                <p className="mt-1 text-[11px] text-amber-600 font-medium">
                  Note: No email was found on the customer profile. Please enter the email address above.
                </p>
              )}
            </div>
          </div>

          {/* Subject Line Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Subject Line
            </label>
            <input
              type="text"
              required
              value={customSubject}
              onChange={(e) => setCustomSubject(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Custom Message / Note Textarea */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Custom Message to Customer <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              rows={3}
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              placeholder="Add any specific instructions, payment reminders, or greetings..."
              className="w-full px-3.5 py-2.5 text-xs text-slate-800 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Footer Action Buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSending}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSending || !!successMessage}
              className="inline-flex items-center px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-md transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending Email...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Quotation PDF
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
