import React, { useState } from 'react';
import { X, Mail, Send, RefreshCw, FileText } from 'lucide-react';
import type { ProformaInvoice } from '../types/proforma-invoice.types';
import { proformaInvoiceApi } from '../api/proformaInvoiceApi';
import { toast } from '../../../utils/toast';

interface Props {
  invoice: ProformaInvoice;
  onClose: () => void;
  onSuccess?: () => void;
}

export const SendProformaEmailModal: React.FC<Props> = ({
  invoice,
  onClose,
  onSuccess,
}) => {
  const defaultEmail = invoice.customerEmail || invoice.customer?.email || '';
  const [to, setTo] = useState(defaultEmail);
  const [subject, setSubject] = useState(
    `Pro Forma Invoice ${invoice.proformaInvoiceNumber} - Taneja Power Systems`
  );
  const [customMessage, setCustomMessage] = useState(
    `Dear ${invoice.customerName || 'Customer'},\n\nPlease find attached Pro Forma Invoice ${invoice.proformaInvoiceNumber} for your commercial reference.\n\nKindly arrange the advance payment to initiate fulfillment.\n\nBest regards,\nAccounts Department\nTaneja Power Systems`
  );
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!to.trim()) {
      toast.error('Recipient Required', 'Please enter a valid recipient email address.');
      return;
    }

    try {
      setIsSending(true);
      await proformaInvoiceApi.sendEmail(invoice.id, {
        to: to.trim(),
        subject: subject.trim(),
        customMessage: customMessage.trim(),
      });
      toast.success('Email Sent', `Pro Forma Invoice sent to ${to}`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('Failed to send email', err.message || 'An error occurred during email delivery');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Email Pro Forma Invoice</h2>
              <p className="text-xs text-gray-500">Document {invoice.proformaInvoiceNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Recipient Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              required
              placeholder="customer@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Message Body
            </label>
            <textarea
              rows={5}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white leading-relaxed font-sans"
            />
          </div>

          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span>
              Attaches official PDF copy of <strong className="font-mono">{invoice.proformaInvoiceNumber}</strong> with bank instructions and preliminary commercial disclaimer.
            </span>
          </div>

          {/* Footer buttons */}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSending}
              className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSending}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md shadow-blue-500/20 disabled:opacity-50"
            >
              {isSending ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Sending Email…
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  Send to Customer
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
