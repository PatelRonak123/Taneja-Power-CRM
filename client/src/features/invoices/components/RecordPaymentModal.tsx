import React, { useState, useEffect, useMemo } from 'react';
import { X, Check, IndianRupee, AlertCircle, Building2, CheckCircle2 } from 'lucide-react';
import { invoiceService } from '../services/invoiceService';
import { customerService } from '../../customers/services/customerService';
import { toast } from '../../../utils/toast';

export interface PaymentCustomerContext {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  totalInvoiced?: string | number;
  totalPaid?: string | number;
  totalOutstanding?: string | number;
}

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
  customer?: PaymentCustomerContext | null;
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

  // Determine if a customer is already known/selected
  const defaultCustomerId =
    invoice?.customerId ||
    amcContract?.customerId ||
    customer?.id ||
    initialCustomerId ||
    '';

  const defaultCustomerName =
    invoice?.customerName ||
    (invoice as any)?.customerNameSnapshot ||
    (invoice as any)?.customer?.name ||
    amcContract?.customerName ||
    customer?.name ||
    initialCustomerName ||
    '';

  const isCustomerPreselected = Boolean(defaultCustomerId);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(defaultCustomerId);  
  const [customersList, setCustomersList] = useState<any[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState<boolean>(false);

  // Customer's open/unpaid invoices list
  const [openInvoices, setOpenInvoices] = useState<any[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(invoice?.id || '');

  // Active Customer ID and Name
  const effectiveCustomerId = isCustomerPreselected ? defaultCustomerId : selectedCustomerId;
  const chosenCustomerObj = customersList.find((c) => c.id === effectiveCustomerId);
  const effectiveCustomerName =
    defaultCustomerName ||
    chosenCustomerObj?.name ||
    (chosenCustomerObj?.companyName ? `${chosenCustomerObj.name} (${chosenCustomerObj.companyName})` : 'Customer');

  // Load customer list only when no customer was preselected
  useEffect(() => {
    if (!isCustomerPreselected) {
      setLoadingCustomers(true);
      customerService
        .getCustomers({ limit: 200 })
        .then((res: any) => {
          setCustomersList(res?.data || []);
        })
        .catch(console.error)
        .finally(() => setLoadingCustomers(false));
    }
  }, [isCustomerPreselected]);

  // Load open issued/partially-paid invoices for this customer if not already tied to a specific invoice
  useEffect(() => {
    if (effectiveCustomerId && !invoice) {
      invoiceService
        .listSalesInvoices({ customerId: effectiveCustomerId, limit: 50 })
        .then((res) => {
          const unpaid = (res.data || []).filter((inv: any) =>
            ['ISSUED', 'PARTIALLY_PAID'].includes(inv.status)
          );
          setOpenInvoices(unpaid);
        })
        .catch(console.error);
    } else {
      setOpenInvoices([]);
    }
  }, [effectiveCustomerId, invoice]);

  // Calculate Due Amount
  const calculatedDueAmount = useMemo(() => {
    if (invoice) {
      return Math.max(0, Number(invoice.totalAmount) - Number(invoice.paidAmount || 0));
    }
    if (amcContract) {
      return Number(amcContract.totalAmount || 0);
    }
    // If a specific open invoice was picked from dropdown
    if (selectedInvoiceId) {
      const inv = openInvoices.find((i) => i.id === selectedInvoiceId);
      if (inv) {
        return Math.max(0, Number(inv.totalAmount) - Number(inv.paidAmount || 0));
      }
    }
    // If customer has totalOutstanding provided from receivables table
    if (customer?.totalOutstanding !== undefined && Number(customer.totalOutstanding) > 0) {
      return Number(customer.totalOutstanding);
    }
    // Sum from loaded open invoices if available
    if (openInvoices.length > 0) {
      return openInvoices.reduce((sum, inv) => {
        const invDue = Math.max(0, Number(inv.totalAmount) - Number(inv.paidAmount || 0));
        return sum + invDue;
      }, 0);
    }
    return 0;
  }, [invoice, amcContract, selectedInvoiceId, openInvoices, customer]);

  // Payment form states
  const [amount, setAmount] = useState<string>(
    calculatedDueAmount > 0 ? String(calculatedDueAmount) : ''
  );
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [paymentMode, setPaymentMode] = useState<
    'BANK_TRANSFER' | 'NEFT_RTGS' | 'UPI' | 'CHEQUE' | 'CASH' | 'OTHER'
  >('NEFT_RTGS');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Automatically sync amount when calculatedDueAmount becomes available if amount is still blank or initial
  useEffect(() => {
    if (calculatedDueAmount > 0 && (!amount || amount === '0')) {
      setAmount(String(calculatedDueAmount));
    }
  }, [calculatedDueAmount]);

  // Handle invoice dropdown change
  const handleInvoiceSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const invId = e.target.value;
    setSelectedInvoiceId(invId);
    if (invId) {
      const inv = openInvoices.find((i) => i.id === invId);
      if (inv) {
        const invDue = Math.max(0, Number(inv.totalAmount) - Number(inv.paidAmount || 0));
        setAmount(invDue > 0 ? String(invDue) : '');
      }
    } else {
      // Revert to overall customer due
      if (customer?.totalOutstanding !== undefined && Number(customer.totalOutstanding) > 0) {
        setAmount(String(customer.totalOutstanding));
      } else if (openInvoices.length > 0) {
        const totalOpen = openInvoices.reduce(
          (sum, i) => sum + Math.max(0, Number(i.totalAmount) - Number(i.paidAmount || 0)),
          0
        );
        setAmount(totalOpen > 0 ? String(totalOpen) : '');
      }
    }
  };

  const parsedAmount = parseFloat(amount) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveCustomerId) {
      toast.error('Customer Required', 'Please select a customer to record payment for.');
      return;
    }
    if (parsedAmount <= 0) {
      toast.error('Invalid Amount', 'Please enter a valid payment amount greater than zero.');
      return;
    }

    try {
      setIsSubmitting(true);
      await invoiceService.recordPayment({
        customerId: effectiveCustomerId,
        salesInvoiceId: invoice?.id || selectedInvoiceId || undefined,
        amcContractId: amcContract?.id || undefined,
        amount: parsedAmount,
        paymentDate,
        paymentMode,
        referenceNumber: referenceNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      toast.success(
        'Payment Recorded Successfully',
        `₹${parsedAmount.toLocaleString('en-IN')} received from ${effectiveCustomerName} via ${paymentMode.replace('_', ' ')}.`
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
                    : `Customer Account: ${effectiveCustomerName}`}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors border border-slate-200 cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Customer Picker: ONLY shown when opened without a pre-selected customer */}
            {!isCustomerPreselected ? (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Select Customer <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => {
                      setSelectedCustomerId(e.target.value);
                      setSelectedInvoiceId('');
                    }}
                    required
                    disabled={loadingCustomers}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  >
                    <option value="">-- Choose Customer Account --</option>
                    {customersList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.companyName ? `(${c.companyName})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : null}

            {/* Selected Customer & Due Amount Banner */}
            {effectiveCustomerId && (
              <div className="bg-gradient-to-br from-emerald-50/90 via-slate-50 to-teal-50/50 p-4 rounded-xl border border-emerald-200/70 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-800">{effectiveCustomerName}</span>
                  </div>
                  {customer?.phone && (
                    <span className="text-[11px] text-slate-500 font-mono">{customer.phone}</span>
                  )}
                </div>

                {/* Prominent Due Amount Indicator */}
                <div className="flex items-baseline justify-between pt-2 border-t border-emerald-200/50">
                  <div>
                    <span className="text-xs font-bold text-slate-700">Due Amount to be Paid:</span>
                    <span className="block text-[11px] text-slate-500">
                      {invoice
                        ? `Invoice #${invoice.invoiceNumber}`
                        : selectedInvoiceId
                        ? 'Selected Invoice'
                        : 'Outstanding Customer Balance'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-extrabold font-mono text-rose-600">
                      ₹{calculatedDueAmount.toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                    {calculatedDueAmount > 0 && parsedAmount !== calculatedDueAmount && (
                      <button
                        type="button"
                        onClick={() => setAmount(String(calculatedDueAmount))}
                        className="block text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 underline mt-0.5 cursor-pointer ml-auto"
                      >
                        Auto-fill full due
                      </button>
                    )}
                  </div>
                </div>

                {/* Invoiced vs Paid breakdown if available */}
                {customer?.totalInvoiced !== undefined && !invoice && (
                  <div className="flex justify-between text-[11px] text-slate-500 pt-1.5 border-t border-slate-200/60 font-mono">
                    <span>Total Invoiced: ₹{Number(customer.totalInvoiced).toLocaleString('en-IN')}</span>
                    <span className="text-emerald-700 font-semibold">
                      Received: ₹{Number(customer.totalPaid || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Optional Specific Invoice Allocation (when not opened directly for an invoice) */}
            {!invoice && !amcContract && openInvoices.length > 0 && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Allocate Against Specific Invoice (Optional)</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {openInvoices.length} open invoice(s)
                  </span>
                </label>
                <select
                  value={selectedInvoiceId}
                  onChange={handleInvoiceSelectChange}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                >
                  <option value="">
                    General Customer Account (Apply to Outstanding Balance)
                  </option>
                  {openInvoices.map((inv) => {
                    const due = Math.max(0, Number(inv.totalAmount) - Number(inv.paidAmount || 0));
                    return (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} — Total ₹{Number(inv.totalAmount).toLocaleString('en-IN')} (Due: ₹{due.toLocaleString('en-IN')})
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* Payment Amount Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Amount Received (₹) <span className="text-rose-500">*</span>
                </label>
                {calculatedDueAmount > 0 && (
                  <span className="text-[11px] font-semibold text-slate-500">
                    Expected Due: ₹{calculatedDueAmount.toLocaleString('en-IN')}
                  </span>
                )}
              </div>
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

              {/* Dynamic Payment State Helper */}
              {parsedAmount > 0 && calculatedDueAmount > 0 && (
                <div className="mt-1.5 text-[11px] flex items-center gap-1.5">
                  {parsedAmount < calculatedDueAmount ? (
                    <span className="text-amber-700 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                      Partial payment: ₹{(calculatedDueAmount - parsedAmount).toLocaleString('en-IN')} will remain due.
                    </span>
                  ) : parsedAmount === calculatedDueAmount ? (
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Full settlement: Outstanding due will be completely settled.
                    </span>
                  ) : (
                    <span className="text-blue-700 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                      Payment exceeds due by ₹{(parsedAmount - calculatedDueAmount).toLocaleString('en-IN')} (advance credit).
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Date & Payment Mode */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Payment Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>

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

            {/* Reference Number */}
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

            {/* Remarks */}
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
                disabled={isSubmitting || !effectiveCustomerId}
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
