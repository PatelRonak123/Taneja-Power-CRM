import React, { useState } from 'react';
import { X, Check, IndianRupee } from 'lucide-react';
import { invoiceService } from '../services/invoiceService';
import { toast } from '../../../utils/toast';

interface RecordPaymentModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onSuccess: () => void;
  // Context when opening from a specific invoice or contract
  invoice?: {
    id: string;
    invoiceNumber: string;
    customerId?: string;
    customerName?: string;
    totalAmount: string | number;
    paidAmount?: string | number;
  } | null;
  amcContract?: {
    id: string;
    contractNumber: string;
    customerId?: string;
    customerName?: string;
    totalAmount: string | number;
  } | null;
  customer?: {
    id: string;
    name: string;
  } | null;
  customerId?: string;
  customerName?: string;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen = true,
  onClose,
  onSuccess,
  invoice,
  amcContract,
  customer,
  customerId: initialCustomerId,
  customerName: initialCustomerName,
}) => {
  if (!isOpen) return null;

  const customerId = invoice?.customerId || amcContract?.customerId || customer?.id || initialCustomerId || '';
  const customerName = invoice?.customerName || (invoice as any)?.customerNameSnapshot || (invoice as any)?.customer?.name || amcContract?.customerName || customer?.name || initialCustomerName || 'Customer';

  // Calculate remaining balance if available
  const defaultAmount = invoice
    ? Math.max(0, Number(invoice.totalAmount) - Number(invoice.paidAmount || 0))
    : amcContract
    ? Number(amcContract.totalAmount)
    : '';

  const [amount, setAmount] = useState<string>(defaultAmount ? String(defaultAmount) : '');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [paymentMode, setPaymentMode] = useState<'BANK_TRANSFER' | 'NEFT_RTGS' | 'UPI' | 'CHEQUE' | 'CASH' | 'OTHER'>('NEFT_RTGS');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Invalid Amount', 'Please enter a valid payment amount greater than zero.');
      return;
    }

    try {
      setIsSubmitting(true);
      await invoiceService.recordPayment({
        customerId,
        salesInvoiceId: invoice?.id,
        amcContractId: amcContract?.id,
        amount: parsedAmount,
        paymentDate,
        paymentMode,
        referenceNumber: referenceNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      toast.success(
        'Payment Recorded',
        `₹${parsedAmount.toLocaleString('en-IN')} received successfully via ${paymentMode.replace('_', ' ')}.`
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to record payment:', err);
      toast.error('Payment Error', err?.response?.data?.message || err?.message || 'Failed to record payment receipt');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] overflow-y-auto select-none">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={onClose}
      />

      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                <IndianRupee size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Record Payment Received</h3>
                <p className="text-xs text-slate-500">
                  {invoice
                    ? `Against Invoice: ${invoice.invoiceNumber}`
                    : amcContract
                    ? `Against AMC Contract: ${amcContract.contractNumber}`
                    : `Customer Account: ${customerName}`}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors border border-slate-200"
            >
              <X size={16} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Context Summary Banner */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Customer:</span>
                <span className="font-bold text-slate-800">{customerName}</span>
              </div>
              {invoice && (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Invoice Total:</span>
                    <span className="font-semibold text-slate-700">₹{Number(invoice.totalAmount).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Current Paid / Remaining Due:</span>
                    <span className="font-bold text-rose-600">
                      ₹{Math.max(0, Number(invoice.totalAmount) - Number(invoice.paidAmount || 0)).toLocaleString('en-IN')} Due
                    </span>
                  </div>
                </>
              )}
              {amcContract && (
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">AMC Total Value:</span>
                  <span className="font-bold text-slate-800">₹{Number(amcContract.totalAmount).toLocaleString('en-IN')}</span>
                </div>
              )}
            </div>

            {/* Payment Amount */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Amount Received (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold">
                  ₹
                </span>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Payment Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Payment Date <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>

              {/* Payment Mode */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Payment Mode <span className="text-rose-500">*</span>
                </label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                >
                  <option value="NEFT_RTGS">NEFT / RTGS</option>
                  <option value="BANK_TRANSFER">Bank Transfer (IMPS)</option>
                  <option value="UPI">UPI / QR Code</option>
                  <option value="CHEQUE">Cheque / Demand Draft</option>
                  <option value="CASH">Cash</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>

            {/* Reference / UTR Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Reference / UTR / Cheque No.
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. UTR123456789, CHQ-88291..."
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>

            {/* Notes / Remarks */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Internal Remarks / Notes
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional payment notes (e.g. received via HDFC Current A/c)..."
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
              />
            </div>

            {/* Footer Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <Check size={14} />
                {isSubmitting ? 'Recording...' : 'Confirm Payment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
