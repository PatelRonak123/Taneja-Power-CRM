import React, { useState, useEffect } from 'react';
import {
  X,
  AlertCircle,
  Receipt,
  RefreshCw,
} from 'lucide-react';
import { useSalesOrders, useSalesOrder } from '../../sales-orders/hooks';
import { useCreateSalesInvoiceFromSo } from '../hooks';
import type { CreateSalesInvoiceFromSoPayload } from '../types/invoice.types';
import type { SalesOrder } from '../../sales-orders/types/salesOrder.types';

export interface CreateSalesInvoiceModalProps {
  onClose: () => void;
  initialSalesOrderId?: string;
  preloadedSalesOrder?: SalesOrder | null;
  onSuccess?: (createdInvoice: any) => void;
}

const fmt = (val: string | number | null | undefined) => {
  const n = Number(val || 0);
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export const CreateSalesInvoiceModal: React.FC<CreateSalesInvoiceModalProps> = ({
  onClose,
  initialSalesOrderId,
  preloadedSalesOrder,
  onSuccess,
}) => {
  const [salesOrderId, setSalesOrderId] = useState<string>(
    initialSalesOrderId || preloadedSalesOrder?.id || ''
  );
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    if (initialSalesOrderId) {
      setSalesOrderId(initialSalesOrderId);
    }
  }, [initialSalesOrderId]);

  // Fetch all eligible sales orders if no preloaded SO
  const { data: soRes, isLoading: loadingSos } = useSalesOrders({ limit: 100 });
  const eligibleSos = (soRes?.data || []).filter(
    (s: any) => s.status === 'CONFIRMED' || s.status === 'PARTIALLY_INVOICED'
  );

  // If we have a salesOrderId but no preloadedSalesOrder, load details
  const { data: fetchedSoData, isLoading: loadingFetchedSo } = useSalesOrder(
    !preloadedSalesOrder && salesOrderId ? salesOrderId : ''
  );

  const activeSo: SalesOrder | null =
    preloadedSalesOrder || (fetchedSoData as any)?.data || (fetchedSoData as any) || null;

  // Auto-fill defaults from sales order view data
  useEffect(() => {
    if (activeSo) {
      if (!dueDate && activeSo.expectedDeliveryDate) {
        try {
          const dateStr = new Date(activeSo.expectedDeliveryDate).toISOString().split('T')[0];
          setDueDate(dateStr);
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

  const createInvoice = useCreateSalesInvoiceFromSo();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetSoId = activeSo?.id || salesOrderId;
    if (!targetSoId) return;

    try {
      const payload: CreateSalesInvoiceFromSoPayload = {
        notes: notes.trim() || undefined,
        dueDate: dueDate || undefined,
      };
      const result = await createInvoice.mutateAsync({ salesOrderId: targetSoId, payload });
      if (onSuccess) onSuccess(result);
      onClose();
    } catch (_) {}
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50/60 to-indigo-50/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Generate Sales Invoice</h2>
              <p className="text-xs text-gray-500">
                {activeSo
                  ? `Auto-filled from Sales Order ${activeSo.salesOrderNumber}`
                  : 'From a confirmed or partially invoiced Sales Order'}
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
          {/* Sales Order Selection (if not preloaded or can change) */}
          {!preloadedSalesOrder && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Select Sales Order <span className="text-red-500">*</span>
              </label>
              {loadingSos ? (
                <div className="py-2.5 px-3 border border-gray-200 rounded-xl text-xs text-gray-400 flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Loading confirmed sales orders…
                </div>
              ) : eligibleSos.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  No confirmed sales orders awaiting invoice.
                </div>
              ) : (
                <select
                  id="create-inv-so-select"
                  value={salesOrderId}
                  onChange={(e) => setSalesOrderId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">— Select Confirmed Sales Order —</option>
                  {activeSo && !eligibleSos.some((s: any) => s.id === activeSo.id) && (
                    <option key={activeSo.id} value={activeSo.id}>
                      {activeSo.salesOrderNumber} · {activeSo.customer?.name || 'Customer'} · {fmt(activeSo.totalAmount)}
                    </option>
                  )}
                  {eligibleSos.map((so: any) => (
                    <option key={so.id} value={so.id}>
                      {so.salesOrderNumber} · {so.customer?.name || 'Customer'} · {fmt(so.totalAmount)}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Auto-filled Sales Order Overview */}
          {loadingFetchedSo ? (
            <div className="py-8 text-center text-xs text-gray-400 flex flex-col items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
              Loading Sales Order details…
            </div>
          ) : activeSo ? (
            <div className="space-y-4">
              {/* Customer & Order Card */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4">
                <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-200">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-blue-700">
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
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 text-xs">
                  <div>
                    <span className="text-gray-400 font-medium">Billing Address:</span>
                    <p className="text-gray-700 font-medium truncate">
                      {[activeSo.billingAddress, activeSo.billingCity, activeSo.billingState]
                        .filter(Boolean)
                        .join(', ') || 'Standard Registered Address'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400 font-medium">Customer PO:</span>
                    <p className="text-gray-700 font-medium">
                      {activeSo.customerPoNumber ? `${activeSo.customerPoNumber} (${fmtDate(activeSo.customerPoDate)})` : 'None'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Line Items Table Snapshot */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Authoritative Line Items ({activeSo.items?.length || 0})
                  </span>
                  <span className="text-xs text-gray-500">Auto-filled from Sales Order</span>
                </div>
                <div className="border border-gray-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-50 text-gray-500 border-b border-gray-200 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 font-medium">Item</th>
                        <th className="px-3 py-2 font-medium text-center">Qty</th>
                        <th className="px-3 py-2 font-medium text-right">Unit Rate</th>
                        <th className="px-3 py-2 font-medium text-right">Tax Rate</th>
                        <th className="px-3 py-2 font-medium text-right">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(activeSo.items || []).map((it, idx) => (
                        <tr key={it.id || idx} className="hover:bg-gray-50/50">
                          <td className="px-3 py-2 font-medium text-gray-800">
                            <div>{it.productNameSnapshot}</div>
                            {it.skuSnapshot && (
                              <div className="text-[10px] font-mono text-gray-400">{it.skuSnapshot}</div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center font-mono">
                            {it.quantity} {it.unitSnapshot || ''}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-gray-600">
                            {fmt(it.unitPrice)}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-gray-500">
                            {it.taxRate}%
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-semibold text-gray-900">
                            {fmt(it.lineTotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Totals Summary */}
              <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 space-y-1.5 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal:</span>
                  <span className="font-mono">{fmt(activeSo.subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Tax Amount (GST):</span>
                  <span className="font-mono">{fmt(activeSo.taxAmount)}</span>
                </div>
                <div className="flex justify-between font-bold text-gray-900 text-sm border-t border-blue-200/60 pt-1.5">
                  <span>Invoice Grand Total:</span>
                  <span className="font-mono text-blue-700">{fmt(activeSo.totalAmount)}</span>
                </div>
              </div>
            </div>
          ) : null}

          {/* Form Fields: Due Date & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Payment Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[11px] text-gray-400 mt-1">Pre-filled or defaults to delivery date</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Internal Remarks / Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes or PO reference..."
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[11px] text-gray-400 mt-1">Appears on invoice details</p>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              id="create-inv-submit-btn"
              type="submit"
              disabled={(!salesOrderId && !activeSo) || createInvoice.isPending}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm shadow-blue-500/20"
            >
              {createInvoice.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Generating Invoice…
                </>
              ) : (
                <>
                  <Receipt className="w-4 h-4" />
                  Confirm & Generate Invoice
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
