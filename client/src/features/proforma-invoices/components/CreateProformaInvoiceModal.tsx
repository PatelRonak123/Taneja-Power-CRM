import React, { useState, useEffect } from 'react';
import { X, FileText, RefreshCw, AlertCircle, Calendar, CreditCard, Clock } from 'lucide-react';
import { useSalesOrders, useSalesOrder } from '../../sales-orders/hooks';
import { proformaInvoiceApi } from '../api/proformaInvoiceApi';
import type { SalesOrder } from '../../sales-orders/types/salesOrder.types';
import type { CreateProformaInvoicePayload } from '../types/proforma-invoice.types';
import { toast } from '../../../utils/toast';

export interface CreateProformaInvoiceModalProps {
  onClose: () => void;
  initialSalesOrderId?: string;
  preloadedSalesOrder?: SalesOrder | null;
  onSuccess?: (createdPi: any) => void;
}

const fmt = (val: string | number | null | undefined) => {
  const n = Number(val || 0);
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export const CreateProformaInvoiceModal: React.FC<CreateProformaInvoiceModalProps> = ({
  onClose,
  initialSalesOrderId,
  preloadedSalesOrder,
  onSuccess,
}) => {
  const [salesOrderId, setSalesOrderId] = useState<string>(
    initialSalesOrderId || preloadedSalesOrder?.id || ''
  );
  const [notes, setNotes] = useState('');
  const [validityDate, setValidityDate] = useState('');
  const [advancePercentage, setAdvancePercentage] = useState<number>(100);
  const [advanceAmount, setAdvanceAmount] = useState<string>('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [expectedDeliveryTimeline, setExpectedDeliveryTimeline] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialSalesOrderId) {
      setSalesOrderId(initialSalesOrderId);
    }
  }, [initialSalesOrderId]);

  // Set default validity date to 30 days from now
  useEffect(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    setValidityDate(d.toISOString().split('T')[0]);
  }, []);

  // Fetch eligible confirmed sales orders
  const { data: soRes, isLoading: loadingSos } = useSalesOrders({ limit: 100 });
  const eligibleSos = (soRes?.data || []).filter(
    (s: any) => s.status === 'CONFIRMED' || s.status === 'PARTIALLY_INVOICED'
  );

  // Fetch detailed SO if not preloaded
  const { data: fetchedSoData, isLoading: loadingFetchedSo } = useSalesOrder(
    !preloadedSalesOrder && salesOrderId ? salesOrderId : ''
  );

  const activeSo: SalesOrder | null =
    preloadedSalesOrder || (fetchedSoData as any)?.data || (fetchedSoData as any) || null;

  // Auto-fill from active Sales Order
  useEffect(() => {
    if (activeSo) {
      const total = Number(activeSo.totalAmount || 0);
      setAdvanceAmount(String(total));
      setAdvancePercentage(100);

      if (activeSo.paymentTerms) {
        setPaymentTerms(activeSo.paymentTerms);
      }
      if (activeSo.expectedDeliveryDate) {
        try {
          const dStr = new Date(activeSo.expectedDeliveryDate).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          });
          setExpectedDeliveryTimeline(`Expected by ${dStr}`);
        } catch (_) {}
      }
      if (!notes) {
        const defaultNotes = [
          activeSo.customerPoNumber ? `PO Ref: ${activeSo.customerPoNumber}` : '',
          activeSo.paymentTerms ? `Payment Terms: ${activeSo.paymentTerms}` : '',
        ]
          .filter(Boolean)
          .join(' | ');
        if (defaultNotes) setNotes(defaultNotes);
      }
    }
  }, [activeSo]);

  const handlePercentageChange = (pct: number) => {
    setAdvancePercentage(pct);
    if (activeSo) {
      const total = Number(activeSo.totalAmount || 0);
      const calculated = Math.round((total * pct) / 100);
      setAdvanceAmount(String(calculated));
    }
  };

  const handleCustomAdvanceChange = (val: string) => {
    setAdvanceAmount(val);
    const num = parseFloat(val);
    if (activeSo && !isNaN(num) && Number(activeSo.totalAmount) > 0) {
      const pct = Math.round((num / Number(activeSo.totalAmount)) * 100);
      setAdvancePercentage(pct);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetSoId = activeSo?.id || salesOrderId;
    if (!targetSoId) {
      toast.error('Selection Required', 'Please select a confirmed Sales Order.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: CreateProformaInvoicePayload = {
        validityDate: validityDate ? new Date(validityDate).toISOString() : null,
        advanceAmountRequested: advanceAmount ? parseFloat(advanceAmount) : undefined,
        paymentTerms: paymentTerms.trim() || undefined,
        expectedDeliveryTimeline: expectedDeliveryTimeline.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      const result = await proformaInvoiceApi.createFromSalesOrder(targetSoId, payload);
      toast.success('Pro Forma Invoice Created', `Generated document ${result.proformaInvoiceNumber}`);
      if (onSuccess) onSuccess(result);
      onClose();
    } catch (err: any) {
      toast.error('Failed to generate Pro Forma Invoice', err.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-indigo-50/70 to-blue-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Generate Pro Forma Invoice</h2>
              <p className="text-xs text-gray-500">
                {activeSo
                  ? `Preliminary commercial document for Sales Order ${activeSo.salesOrderNumber}`
                  : 'From a confirmed Sales Order for customer advance & scheduling'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/80 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Sales Order Selection */}
          {!preloadedSalesOrder && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Select Confirmed Sales Order <span className="text-red-500">*</span>
              </label>
              {loadingSos ? (
                <div className="py-2.5 px-3 border border-gray-200 rounded-xl text-xs text-gray-400 flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                  Loading confirmed sales orders…
                </div>
              ) : eligibleSos.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  No confirmed sales orders awaiting Pro Forma Invoice.
                </div>
              ) : (
                <select
                  id="create-pi-so-select"
                  value={salesOrderId}
                  onChange={(e) => setSalesOrderId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="">— Select Confirmed Sales Order —</option>
                  {eligibleSos.map((so: any) => (
                    <option key={so.id} value={so.id}>
                      {so.salesOrderNumber} · {so.customer?.name || 'Customer'} · {fmt(so.totalAmount)}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Active Sales Order Details Snapshot */}
          {loadingFetchedSo ? (
            <div className="py-8 text-center text-xs text-gray-400 flex flex-col items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-indigo-500" />
              Loading Sales Order details…
            </div>
          ) : activeSo ? (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4">
                <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-200">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-indigo-700">
                        {activeSo.salesOrderNumber}
                      </span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {activeSo.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">Order Date: {fmtDate(activeSo.orderDate)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-gray-900">{activeSo.customer?.name || 'Customer'}</p>
                    {activeSo.customer?.companyName && (
                      <p className="text-xs text-gray-500">{activeSo.customer.companyName}</p>
                    )}
                    <p className="text-xs font-bold text-indigo-900 font-mono mt-1">
                      Total: {fmt(activeSo.totalAmount)}
                    </p>
                  </div>
                </div>

                {/* Items preview table */}
                <div className="pt-3">
                  <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Order Items ({activeSo.items?.length || 0})
                  </div>
                  <div className="border border-gray-200 rounded-lg overflow-hidden max-h-36 overflow-y-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-gray-100 text-gray-600 sticky top-0 font-medium">
                        <tr>
                          <th className="px-2.5 py-1.5">Item</th>
                          <th className="px-2 py-1.5 text-center">Qty</th>
                          <th className="px-2 py-1.5 text-right">Rate</th>
                          <th className="px-2.5 py-1.5 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-[11px]">
                        {(activeSo.items || []).map((it, idx) => (
                          <tr key={it.id || idx}>
                            <td className="px-2.5 py-1.5 font-medium text-gray-800">
                              {it.productNameSnapshot}
                            </td>
                            <td className="px-2 py-1.5 text-center font-mono">
                              {Number(it.quantity)} {it.unitSnapshot}
                            </td>
                            <td className="px-2 py-1.5 text-right font-mono text-gray-600">
                              {fmt(it.unitPrice)}
                            </td>
                            <td className="px-2.5 py-1.5 text-right font-mono font-semibold text-gray-900">
                              {fmt(it.lineTotal)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Advance Amount Requested Section */}
              <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-amber-900 uppercase tracking-wide flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-amber-600" />
                    Advance Payment Requested
                  </label>
                  <span className="text-xs font-bold text-amber-800 font-mono">
                    {advancePercentage}% of Total
                  </span>
                </div>

                {/* Percentage preset buttons */}
                <div className="flex items-center gap-2">
                  {[25, 50, 75, 100].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handlePercentageChange(pct)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                        advancePercentage === pct
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'bg-white border border-amber-300 text-amber-800 hover:bg-amber-100'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm font-bold text-gray-500">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={Number(activeSo.totalAmount || 0)}
                    value={advanceAmount}
                    onChange={(e) => handleCustomAdvanceChange(e.target.value)}
                    required
                    placeholder="Enter advance amount"
                    className="w-full pl-8 pr-3 py-2 border border-amber-300 rounded-xl text-sm font-mono font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                  />
                </div>
                <p className="text-[11px] text-amber-800/80">
                  Total Order Value: <span className="font-semibold font-mono">{fmt(activeSo.totalAmount)}</span>. Balance payable on final Tax Invoice: <span className="font-semibold font-mono">{fmt(Math.max(0, Number(activeSo.totalAmount || 0) - Number(advanceAmount || 0)))}</span>.
                </p>
              </div>

              {/* Commercial Terms & Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    Document Validity Until
                  </label>
                  <input
                    type="date"
                    value={validityDate}
                    onChange={(e) => setValidityDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    Delivery Timeline
                  </label>
                  <input
                    type="text"
                    value={expectedDeliveryTimeline}
                    onChange={(e) => setExpectedDeliveryTimeline(e.target.value)}
                    placeholder="e.g. 2-3 Weeks after advance"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Payment Terms
                </label>
                <input
                  type="text"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  placeholder="e.g. 100% advance against Pro Forma Invoice"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Commercial Notes / Instructions
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional commercial notes..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>
            </div>
          ) : null}

          {/* Action buttons */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !activeSo}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  Generate Pro Forma Invoice
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
