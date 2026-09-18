import React, { useEffect, useState } from 'react';
import { quotationService } from '../services/quotationService';
import { QuotationRevision } from '../types/quotation.types';
import { QuotationStatusBadge } from './QuotationStatusBadge';
import { X, History, Calendar, Package, Download } from 'lucide-react';

interface Props {
  quotationId: string;
  revisionNumber: number;
  onClose: () => void;
}

export const QuotationRevisionViewer: React.FC<Props> = ({
  quotationId,
  revisionNumber,
  onClose,
}) => {
  const [revision, setRevision] = useState<QuotationRevision | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRev = async () => {
      try {
        setLoading(true);
        const res = await quotationService.getRevisionByNumber(quotationId, revisionNumber);
        if (res.data) {
          setRevision(res.data);
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to load historical revision.');
      } finally {
        setLoading(false);
      }
    };

    fetchRev();
  }, [quotationId, revisionNumber]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <History size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Historical Revision {revisionNumber}
                </h3>
                {revision && <QuotationStatusBadge status={revision.status} size="sm" />}
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  READ ONLY
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Created on {revision ? new Date(revision.createdAt).toLocaleDateString('en-IN') : '...'}
                {revision?.revisionReason ? ` • "${revision.revisionReason}"` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {revision && (
              <button
                type="button"
                onClick={() => quotationService.downloadQuotationPdf(quotationId, `QT_Rev${revisionNumber}`, revisionNumber)}
                className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Download size={14} />
                <span>Download PDF</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 custom-scrollbar">
          {loading ? (
            <div className="py-16 text-center text-slate-400 text-sm">Loading historical revision data...</div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
              {error}
            </div>
          ) : revision ? (
            <>
              {/* Customer & Address Snapshot Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Customer Snapshot (Frozen)
                  </span>
                  <div className="text-sm font-bold text-slate-900">
                    {revision.companyName || revision.customerName}
                  </div>
                  {revision.companyName && (
                    <div className="text-xs text-slate-600">Contact: {revision.customerName}</div>
                  )}
                  <div className="text-xs text-slate-500">
                    {revision.customerEmail} • {revision.customerPhone}
                  </div>
                  <div className="text-xs text-slate-600 mt-1">
                    {revision.billingAddress}, {revision.billingCity}, {revision.billingState} - {revision.billingPincode}
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Shipping & Validity Details
                  </span>
                  <div className="text-xs text-slate-700">
                    <strong>Site:</strong> {revision.shippingName || 'Same as client billing address'}
                  </div>
                  <div className="text-xs text-slate-600">
                    {revision.shippingAddress}, {revision.shippingCity}, {revision.shippingState} - {revision.shippingPincode}
                  </div>
                  <div className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
                    <Calendar size={13} className="text-blue-600" />
                    <span>Valid for {revision.validityDays} days (until {new Date(revision.validUntil).toLocaleDateString('en-IN')})</span>
                  </div>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Package size={14} className="text-blue-600" />
                  <span>Revision {revisionNumber} Line Items ({revision.items?.length || 0})</span>
                </span>
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100/80 text-slate-600 font-semibold border-b border-slate-200">
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Item / Description</th>
                        <th className="py-2.5 px-3 text-right">Qty</th>
                        <th className="py-2.5 px-3 text-right">Unit Price</th>
                        <th className="py-2.5 px-3 text-right">Taxable</th>
                        <th className="py-2.5 px-3 text-right">GST</th>
                        <th className="py-2.5 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {revision.items && revision.items.length > 0 ? (
                        revision.items.map((item, idx) => (
                          <tr key={item.id} className="hover:bg-slate-50/60">
                            <td className="py-2.5 px-3 text-slate-400">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-medium text-slate-900">
                              <div>{item.productName}</div>
                              {item.description && (
                                <div className="text-[11px] text-slate-500 line-clamp-1">{item.description}</div>
                              )}
                              {item.productSku && (
                                <span className="text-[10px] text-slate-400">SKU: {item.productSku}</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-700">
                              {parseFloat(item.quantity)} {item.unit}
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-700">
                              ₹{parseFloat(item.unitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-700">
                              ₹{parseFloat(item.taxableAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-700">
                              ₹{parseFloat(item.totalTax).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              <div className="text-[10px] text-slate-400">({parseFloat(item.gstRate)}%)</div>
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                              ₹{parseFloat(item.lineTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-slate-400">
                            No line items recorded for this revision.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Totals Summary */}
              <div className="flex flex-col md:flex-row justify-between items-start gap-4 p-4 bg-slate-900 text-white rounded-2xl">
                <div className="flex flex-col gap-1 max-w-md">
                  <span className="text-xs font-bold text-slate-300">Amount in Words:</span>
                  <p className="text-xs text-slate-400 italic">
                    {revision.amountInWords || 'Not specified'}
                  </p>
                </div>
                <div className="w-full md:w-72 flex flex-col gap-1.5 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span>Taxable Subtotal:</span>
                    <span className="font-semibold text-white">
                      ₹{parseFloat(revision.taxableAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  {parseFloat(revision.cgstAmount) > 0 && (
                    <div className="flex justify-between text-slate-400 text-[11px]">
                      <span>CGST:</span>
                      <span>₹{parseFloat(revision.cgstAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {parseFloat(revision.sgstAmount) > 0 && (
                    <div className="flex justify-between text-slate-400 text-[11px]">
                      <span>SGST:</span>
                      <span>₹{parseFloat(revision.sgstAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {parseFloat(revision.igstAmount) > 0 && (
                    <div className="flex justify-between text-slate-400 text-[11px]">
                      <span>IGST:</span>
                      <span>₹{parseFloat(revision.igstAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Total Tax:</span>
                    <span className="font-semibold text-white">
                      ₹{parseFloat(revision.totalTax).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  {parseFloat(revision.freightCharges) > 0 && (
                    <div className="flex justify-between text-slate-400 text-[11px]">
                      <span>Freight Charges:</span>
                      <span>₹{parseFloat(revision.freightCharges).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-800 my-1" />
                  <div className="flex justify-between text-sm font-bold text-emerald-400">
                    <span>Grand Total:</span>
                    <span>₹{parseFloat(revision.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
};
