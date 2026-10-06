import React, { useState } from 'react';
import { X, Check, ShieldCheck } from 'lucide-react';
import { invoiceService } from '../../invoices/services/invoiceService';
import { toast } from '../../../utils/toast';

interface UpdateAmcPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  contract: {
    id: string;
    contractNumber: string;
    customerName: string;
    customerId: string;
    totalAmount: string | number;
    paymentStatus: string;
  };
}

export const UpdateAmcPaymentModal: React.FC<UpdateAmcPaymentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  contract,
}) => {
  const [paymentStatus, setPaymentStatus] = useState<string>(contract.paymentStatus || 'PENDING');
  const [recordReceipt, setRecordReceipt] = useState<boolean>(paymentStatus === 'PAID');
  const [amount, setAmount] = useState<string>(String(contract.totalAmount || ''));
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [paymentMode, setPaymentMode] = useState<'BANK_TRANSFER' | 'NEFT_RTGS' | 'UPI' | 'CHEQUE' | 'CASH' | 'OTHER'>('NEFT_RTGS');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);

      // If user also wants to log an official payment receipt
      if (recordReceipt && Number(amount) > 0) {
        await invoiceService.recordPayment({
          customerId: contract.customerId,
          amcContractId: contract.id,
          amount: Number(amount),
          paymentDate,
          paymentMode,
          referenceNumber: referenceNumber.trim() || undefined,
          notes: notes.trim() || `Payment for AMC contract ${contract.contractNumber}`,
        });
      }

      // Explicitly update the AMC contract payment status
      await invoiceService.updateAmcPaymentStatus(
        contract.id,
        paymentStatus,
        notes.trim() || undefined
      );

      toast.success(
        'AMC Payment Status Updated',
        `Contract ${contract.contractNumber} payment status set to ${paymentStatus}.`
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to update AMC payment status:', err);
      toast.error('Error', err?.response?.data?.message || err?.message || 'Failed to update payment status');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] overflow-y-auto select-none">
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={onClose}
      />

      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-indigo-50/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Update AMC Payment Status</h3>
                <p className="text-xs text-slate-500">{contract.contractNumber} &bull; {contract.customerName}</p>
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

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Status Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Payment Status <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'PAID', label: 'PAID', cls: 'border-emerald-500 bg-emerald-50 text-emerald-800' },
                  { value: 'PARTIALLY_PAID', label: 'PARTIALLY PAID', cls: 'border-blue-500 bg-blue-50 text-blue-800' },
                  { value: 'PENDING', label: 'PENDING', cls: 'border-amber-500 bg-amber-50 text-amber-800' },
                  { value: 'OVERDUE', label: 'OVERDUE', cls: 'border-rose-500 bg-rose-50 text-rose-800' },
                ].map((s) => (
                  <button
                    type="button"
                    key={s.value}
                    onClick={() => {
                      setPaymentStatus(s.value);
                      if (s.value === 'PAID') setRecordReceipt(true);
                    }}
                    className={`px-3 py-2 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                      paymentStatus === s.value
                        ? `${s.cls} ring-2 ring-indigo-500/30`
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Checkbox to also record receipt */}
            <div className="pt-2 border-t border-slate-100">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={recordReceipt}
                  onChange={(e) => setRecordReceipt(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                Record payment receipt details (for account ledger)
              </label>
            </div>

            {recordReceipt && (
              <div className="space-y-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 animate-fade-in text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Amount Received (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Payment Date</label>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Payment Mode</label>
                    <select
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800"
                    >
                      <option value="NEFT_RTGS">NEFT / RTGS</option>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                      <option value="UPI">UPI</option>
                      <option value="CHEQUE">Cheque</option>
                      <option value="CASH">Cash</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Reference / UTR No.</label>
                  <input
                    type="text"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder="UTR / Cheque number..."
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Notes / Audit Remarks
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional remarks (e.g. 100% advance received via PO)..."
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-800 resize-none"
              />
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
              >
                <Check size={14} />
                {isSubmitting ? 'Updating...' : 'Save Payment Status'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
