import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Search,
  Plus,
  RefreshCw,
  Printer,
  Mail,
  IndianRupee,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  ExternalLink,
  Receipt,
  Eye,
  X,
  FileCheck,
} from 'lucide-react';
import { proformaInvoiceApi } from '../api/proformaInvoiceApi';
import type { ProformaInvoice, ProformaInvoiceStatus } from '../types/proforma-invoice.types';
import { ProformaInvoicePrintDocument } from '../components/ProformaInvoicePrintDocument';
import { CreateProformaInvoiceModal } from '../components/CreateProformaInvoiceModal';
import { SendProformaEmailModal } from '../components/SendProformaEmailModal';
import { RecordPaymentModal } from '../../invoices/components/RecordPaymentModal';
import { navigate } from '../../../app/router/navigation';
import { toast } from '../../../utils/toast';
import { useAuthStore } from '../../../stores/authStore';

const formatINR = (val: number | string | undefined | null) => {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

const formatDate = (dateStr: string | undefined | null) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const STATUS_CONFIG: Record<
  ProformaInvoiceStatus,
  { label: string; badgeCls: string; dotCls: string }
> = {
  DRAFT: {
    label: 'Draft',
    badgeCls: 'bg-slate-100 text-slate-700 border-slate-200',
    dotCls: 'bg-slate-400',
  },
  ISSUED: {
    label: 'Issued',
    badgeCls: 'bg-blue-100 text-blue-800 border-blue-200',
    dotCls: 'bg-blue-500',
  },
  PARTIALLY_PAID: {
    label: 'Partially Paid',
    badgeCls: 'bg-amber-100 text-amber-800 border-amber-200',
    dotCls: 'bg-amber-500',
  },
  PAID: {
    label: 'Paid (Advance Met)',
    badgeCls: 'bg-emerald-50 text-emerald-800 border-emerald-200/90',
    dotCls: 'bg-emerald-500',
  },
  CANCELLED: {
    label: 'Cancelled',
    badgeCls: 'bg-rose-100 text-rose-700 border-rose-200',
    dotCls: 'bg-rose-400',
  },
};

export const ProformaInvoicesPage: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const [invoices, setInvoices] = useState<ProformaInvoice[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [metrics, setMetrics] = useState({
    totalAmount: 0,
    totalAdvanceRequested: 0,
    totalPaid: 0,
    totalCount: 0,
    issuedCount: 0,
    paidCount: 0,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [page, setPage] = useState<number>(1);

  // Modals & Drawers
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [initialSoId, setInitialSoId] = useState<string | undefined>();
  const [previewInvoice, setPreviewInvoice] = useState<ProformaInvoice | null>(null);
  const [emailInvoice, setEmailInvoice] = useState<ProformaInvoice | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<ProformaInvoice | null>(null);
  const [cancelTarget, setCancelTarget] = useState<ProformaInvoice | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [isCancelling, setIsCancelling] = useState<boolean>(false);

  // Check query params on mount for auto-generation from Sales Order
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const soId = params.get('generateFromSo') || params.get('salesOrderId');
    if (soId) {
      setInitialSoId(soId);
      setShowCreateModal(true);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await proformaInvoiceApi.list({
        search: search.trim() || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        page,
        limit: 20,
      });
      setInvoices(res.data || []);
      setTotalCount(res.total || 0);
      if (res.metrics) {
        setMetrics(res.metrics);
      }
    } catch (err: any) {
      toast.error('Failed to load Pro Forma Invoices', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleIssue = async (invoice: ProformaInvoice) => {
    try {
      await proformaInvoiceApi.issue(invoice.id);
      toast.success('Pro Forma Invoice Issued', `Document ${invoice.proformaInvoiceNumber} is now issued.`);
      loadData();
    } catch (err: any) {
      toast.error('Failed to issue Pro Forma Invoice', err.message);
    }
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelTarget || !cancelReason.trim()) return;

    try {
      setIsCancelling(true);
      await proformaInvoiceApi.cancel(cancelTarget.id, cancelReason.trim());
      toast.success('Pro Forma Invoice Cancelled', `Document ${cancelTarget.proformaInvoiceNumber} has been cancelled.`);
      setCancelTarget(null);
      setCancelReason('');
      loadData();
    } catch (err: any) {
      toast.error('Failed to cancel Pro Forma Invoice', err.message);
    } finally {
      setIsCancelling(false);
    }
  };

  const handlePrint = (invoice: ProformaInvoice) => {
    setPreviewInvoice(invoice);
    setTimeout(() => {
      window.print();
    }, 400);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Pro Forma Invoices</h1>
              <p className="text-xs text-slate-500">
                Preliminary commercial documents for customer advance collection &amp; order scheduling
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setInitialSoId(undefined);
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 transition-all hover:shadow-indigo-600/30 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Generate Pro Forma Invoice
          </button>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Documents</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FileText className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2 font-mono">{metrics.totalCount}</p>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1">
            <span className="font-semibold text-indigo-700 font-mono">{metrics.issuedCount}</span> Active / Issued
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Commercial Value</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <IndianRupee className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2 font-mono">
            ₹{formatINR(metrics.totalAmount)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Total estimated order value</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Advance Requested</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <CreditCard className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-700 mt-2 font-mono">
            ₹{formatINR(metrics.totalAdvanceRequested)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Awaiting customer collection</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Advance Received</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-700 mt-2 font-mono">
            ₹{formatINR(metrics.totalPaid)}
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1">
            <span className="font-semibold text-emerald-700 font-mono">{metrics.paidCount}</span> Fully Reconciled
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto p-1 bg-slate-100 rounded-xl scrollbar-none">
          {['ALL', 'DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === st
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {st === 'ALL'
                ? 'All Documents'
                : st === 'PARTIALLY_PAID'
                ? 'Partially Paid'
                : st === 'PAID'
                ? 'Paid (Advance Met)'
                : st.charAt(0) + st.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search PI number, customer, SO..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Invoices List Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
            <p className="text-xs">Loading Pro Forma Invoices…</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
              <FileText className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-700">No Pro Forma Invoices Found</p>
            <p className="text-xs text-slate-500 max-w-sm text-center">
              Generate a Pro Forma Invoice directly from a confirmed Sales Order to request advance payments.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[980px]">
              <thead>
                <tr className="bg-slate-50/80 text-slate-600 text-[11px] font-semibold uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3 px-4">PI Number &amp; Date</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-3">Sales Order Ref</th>
                  <th className="py-3 px-3 text-right">Total Commercial</th>
                  <th className="py-3 px-3 text-right">Advance Req.</th>
                  <th className="py-3 px-3 text-right">Advance Received</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {invoices.map((inv) => {
                  const cfg = STATUS_CONFIG[inv.status] || STATUS_CONFIG.DRAFT;
                  const total = Number(inv.totalAmount || 0);
                  const advReq = Number(inv.advanceAmountRequested || 0);
                  const paid = Number(inv.paidAmount || 0);

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Number & Date */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900 font-mono text-[13px] hover:text-indigo-600 cursor-pointer"
                          onClick={() => setPreviewInvoice(inv)}
                        >
                          {inv.proformaInvoiceNumber}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{formatDate(inv.proformaInvoiceDate)}</span>
                          {inv.validityDate && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              (Valid: {formatDate(inv.validityDate)})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-4 min-w-[180px]">
                        <div className="font-semibold text-slate-900">
                          {inv.customerName || inv.customer?.name || 'Customer'}
                        </div>
                        {(inv.legalName || inv.customer?.companyName) && (
                          <div className="text-[11px] text-slate-500">
                            {inv.legalName || inv.customer?.companyName}
                          </div>
                        )}
                        {inv.gstin && (
                          <div className="text-[10px] font-mono text-slate-400">
                            GSTIN: {inv.gstin}
                          </div>
                        )}
                      </td>

                      {/* Sales Order Ref */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => navigate('/sales-orders')}
                          className="font-mono font-medium text-indigo-700 hover:text-indigo-900 hover:underline flex items-center gap-1"
                        >
                          {inv.salesOrder?.salesOrderNumber || 'Linked Order'}
                          <ExternalLink className="w-3 h-3" />
                        </button>
                        {inv.relatedTaxInvoiceId && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 mt-1">
                            <Receipt className="w-3 h-3" />
                            Tax Invoice Linked
                          </span>
                        )}
                      </td>

                      {/* Financials */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        ₹{formatINR(total)}
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-semibold text-amber-700 whitespace-nowrap">
                        ₹{formatINR(advReq)}
                      </td>

                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <span className={`font-mono font-semibold ${paid > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>
                          ₹{formatINR(paid)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {inv.status === 'PAID' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/90 shadow-2xs whitespace-nowrap">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            <span>Paid</span>
                            <span className="text-[10px] font-medium text-emerald-700 bg-emerald-100/90 px-1.5 py-0.2 rounded-md border border-emerald-200/80">
                              Advance Met
                            </span>
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border whitespace-nowrap ${cfg.badgeCls}`}>
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dotCls}`} />
                            {cfg.label}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Preview / View */}
                          <button
                            type="button"
                            onClick={() => setPreviewInvoice(inv)}
                            title="Preview Pro Forma Document"
                            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Print / Download */}
                          <button
                            type="button"
                            onClick={() => handlePrint(inv)}
                            title="Print / Save PDF"
                            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Issue Button (if DRAFT) */}
                          {inv.status === 'DRAFT' && (
                            <button
                              type="button"
                              onClick={() => handleIssue(inv)}
                              title="Issue Pro Forma Invoice"
                              className="px-2 py-1 text-[11px] font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors flex items-center gap-1"
                            >
                              <FileCheck className="w-3 h-3" />
                              Issue
                            </button>
                          )}

                          {/* Email to Customer */}
                          {inv.status !== 'DRAFT' && inv.status !== 'CANCELLED' && (
                            <button
                              type="button"
                              onClick={() => setEmailInvoice(inv)}
                              title="Send Email to Customer"
                              className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                              <Mail className="w-4 h-4" />
                            </button>
                          )}

                          {/* Record Payment */}
                          {inv.status !== 'CANCELLED' && inv.status !== 'PAID' && (
                            <button
                              type="button"
                              onClick={() => setPaymentInvoice(inv)}
                              title="Record Advance Payment"
                              className="px-2 py-1 text-[11px] font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-lg transition-colors flex items-center gap-1"
                            >
                              <IndianRupee className="w-3 h-3" />
                              Advance
                            </button>
                          )}

                          {/* Cancel (Admin or Draft) */}
                          {inv.status !== 'CANCELLED' && (isAdmin || inv.status === 'DRAFT') && (
                            <button
                              type="button"
                              onClick={() => {
                                setCancelTarget(inv);
                                setCancelReason('');
                              }}
                              title="Cancel Pro Forma Invoice"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {totalCount > 20 && (
              <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Showing {Math.min((page - 1) * 20 + 1, totalCount)} to {Math.min(page * 20, totalCount)} of {totalCount} documents
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="px-3 py-1 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    disabled={page * 20 >= totalCount}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateProformaInvoiceModal
          initialSalesOrderId={initialSoId}
          onClose={() => {
            setShowCreateModal(false);
            setInitialSoId(undefined);
          }}
          onSuccess={(newPi) => {
            loadData();
            setPreviewInvoice(newPi);
          }}
        />
      )}

      {/* Email Modal */}
      {emailInvoice && (
        <SendProformaEmailModal
          invoice={emailInvoice}
          onClose={() => setEmailInvoice(null)}
          onSuccess={loadData}
        />
      )}

      {/* Record Payment Modal */}
      {paymentInvoice && (
        <RecordPaymentModal
          isOpen={true}
          onClose={() => setPaymentInvoice(null)}
          onSuccess={() => {
            setPaymentInvoice(null);
            loadData();
          }}
          customer={{
            id: paymentInvoice.customerId,
            name: paymentInvoice.customerName || paymentInvoice.customer?.name || 'Customer',
          }}
          proformaInvoice={paymentInvoice}
        />
      )}

      {/* Cancel Modal */}
      {cancelTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-rose-50/60">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                <AlertCircle className="w-4 h-4" />
                Cancel Pro Forma Invoice
              </div>
              <button
                onClick={() => setCancelTarget(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCancelSubmit} className="p-5 space-y-4">
              <p className="text-xs text-gray-600 leading-relaxed">
                Are you sure you want to cancel Pro Forma Invoice <strong className="font-mono text-gray-900">{cancelTarget.proformaInvoiceNumber}</strong>?
                Cancelling this Pro Forma Invoice will not affect its originating Sales Order.
              </p>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Cancellation Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  required
                  placeholder="Explain why this Pro Forma Invoice is being cancelled..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setCancelTarget(null)}
                  disabled={isCancelling}
                  className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isCancelling || !cancelReason.trim()}
                  className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors disabled:opacity-50"
                >
                  {isCancelling ? 'Cancelling…' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Preview & Print Modal */}
      {previewInvoice && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-slate-100 rounded-2xl shadow-2xl w-full max-w-4xl h-[92vh] max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Controls Bar */}
            <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between no-print shrink-0">
              <div className="flex items-center gap-3">
                <span className="font-bold text-slate-900 font-mono text-sm">
                  {previewInvoice.proformaInvoiceNumber}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-semibold border border-indigo-200">
                  {previewInvoice.status}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePrint(previewInvoice)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print / Save PDF
                </button>
                <button
                  onClick={() => setPreviewInvoice(null)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Content - Scrollable */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 bg-slate-200/70">
              <div className="bg-white shadow-xl rounded-xl mx-auto w-full max-w-[210mm]">
                <ProformaInvoicePrintDocument invoice={previewInvoice} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
