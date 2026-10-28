import React, { useState, useEffect } from 'react';
import { X, Check, IndianRupee, Building2 } from 'lucide-react';
import { invoiceService } from '../services/invoiceService';
import { customerService } from '../../customers/services/customerService';
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
  proformaInvoice?: {
    id: string;
    proformaInvoiceNumber: string;
    customerId?: string;
    customerName?: string;
    totalAmount: string | number;
    paidAmount?: string | number;
    advanceAmountRequested?: string | number;
    salesOrderId?: string;
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
  proformaInvoice,
  amcContract,
  customer,
  customerId: initialCustomerId,
  customerName: initialCustomerName,
}) => {
  if (!isOpen) return null;

  const defaultCustomerId = proformaInvoice?.customerId || invoice?.customerId || amcContract?.customerId || customer?.id || initialCustomerId || '';
  const defaultCustomerName = proformaInvoice?.customerName || invoice?.customerName || (invoice as any)?.customerNameSnapshot || (invoice as any)?.customer?.name || amcContract?.customerName || customer?.name || initialCustomerName || '';

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(defaultCustomerId);
  const [customersList, setCustomersList] = useState<any[]>([]);
  const [customerDue, setCustomerDue] = useState<any>(null);
  const [loadingDue, setLoadingDue] = useState<boolean>(false);

  useEffect(() => {
    if (defaultCustomerId && !selectedCustomerId) {
      setSelectedCustomerId(defaultCustomerId);
    }
  }, [defaultCustomerId]);

  useEffect(() => {
    if (!invoice && !proformaInvoice && !amcContract) {
      customerService.getCustomers({ limit: 500 }).then((res: any) => {
        const list = res?.data || [];
        if (defaultCustomerId && customer && !list.some((c: any) => c.id === defaultCustomerId)) {
          list.unshift({ id: customer.id, name: customer.name, companyName: (customer as any).companyName });
        }
        setCustomersList(list);
      }).catch(console.error);
    }
  }, [invoice, proformaInvoice, amcContract, defaultCustomerId, customer]);

  const customerId = selectedCustomerId || defaultCustomerId;
  const chosenCustomerObj = customersList.find((c) => c.id === customerId);
  const customerName = defaultCustomerName || chosenCustomerObj?.name || customerDue?.customerName || 'Customer';

  // Fetch actual due amount whenever a customer is selected
  useEffect(() => {
    const cid = selectedCustomerId || defaultCustomerId;
    if (cid && !invoice && !proformaInvoice && !amcContract) {
      setLoadingDue(true);
      invoiceService
        .getCustomerDue(cid)
        .then((data: any) => {
          setCustomerDue(data);
          if (data && typeof data.dueAmount === 'number') {
            setAmount((prev) => {
              if (!prev || prev === '0' || prev === '0.00') {
                return data.dueAmount > 0 ? String(data.dueAmount) : '';
              }
              return prev;
            });
          }
        })
        .catch((err: any) => {
          console.error('Failed to fetch customer due details:', err);
          setCustomerDue(null);
        })
        .finally(() => {
          setLoadingDue(false);
        });
    } else {
      setCustomerDue(null);
    }
  }, [selectedCustomerId, defaultCustomerId, invoice, proformaInvoice, amcContract]);

  // Calculate remaining balance if available
  const defaultAmount = proformaInvoice
    ? Math.max(0, Number(proformaInvoice.advanceAmountRequested || proformaInvoice.totalAmount) - Number(proformaInvoice.paidAmount || 0))
    : invoice
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
        salesInvoiceId: proformaInvoice ? undefined : invoice?.id,
        proformaInvoiceId: proformaInvoice?.id,
        salesOrderId: proformaInvoice?.salesOrderId,
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
                  {proformaInvoice
                    ? `Advance against PI: ${proformaInvoice.proformaInvoiceNumber}`
                    : invoice
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
            {/* Customer Picker when opened without a specific invoice/contract context */}
            {!invoice && !proformaInvoice && !amcContract && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Select Customer <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => {
                      setSelectedCustomerId(e.target.value);
                      setAmount('');
                    }}
                    required
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer"
                  >
                    <option value="">-- Select Customer --</option>
                    {customersList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.companyName ? `(${c.companyName})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Customer Due Amount Card */}
                {selectedCustomerId && (
                  <div className="p-4 bg-emerald-50/40 rounded-xl border border-emerald-200/80 shadow-2xs">
                    <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                      <Building2 size={16} className="text-emerald-600 shrink-0" />
                      <span>
                        {chosenCustomerObj?.companyName ||
                          chosenCustomerObj?.name ||
                          customerDue?.companyName ||
                          customerDue?.customerName ||
                          customerName ||
                          'Customer'}
                      </span>
                    </div>

                    <div className="border-b border-emerald-100/80 my-3" />

                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs sm:text-sm font-semibold text-slate-800">
                          Due Amount to be Paid:
                        </div>
                        <div className="text-[11px] sm:text-xs text-slate-500">
                          Outstanding Customer Balance
                        </div>
                      </div>
                      <div className="text-xl sm:text-2xl font-bold text-rose-600 tracking-tight tabular-nums">
                        {loadingDue ? (
                          <span className="text-xs text-slate-400 font-medium animate-pulse">
                            Fetching due...
                          </span>
                        ) : (
                          `₹${Number(customerDue?.dueAmount ?? 0).toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}`
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Context Summary Banner for Specific Invoice, PI or AMC */}
            {(invoice || proformaInvoice || amcContract) && (
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Customer:</span>
                  <span className="font-bold text-slate-800">{customerName}</span>
                </div>
                {proformaInvoice && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Pro Forma Invoice:</span>
                      <span className="font-mono font-bold text-indigo-700">{proformaInvoice.proformaInvoiceNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Advance Requested:</span>
                      <span className="font-semibold text-amber-700 font-mono">
                        ₹{Number(proformaInvoice.advanceAmountRequested || proformaInvoice.totalAmount).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Advance Balance Due:</span>
                      <span className="font-bold text-rose-600 font-mono">
                        ₹{Math.max(0, Number(proformaInvoice.advanceAmountRequested || proformaInvoice.totalAmount) - Number(proformaInvoice.paidAmount || 0)).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </>
                )}
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
            )}

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
                placeholder="Optional notes (e.g. received in HDFC Bank A/c, verified with statement)..."
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
