import React, { useState } from 'react';
import {
  ShoppingCart,
  Plus,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Send,
  RefreshCw,
  X,
  ChevronDown,
  AlertTriangle,
  Receipt,
  Truck,
} from 'lucide-react';
import { navigate } from '../../../app/router/navigation';
import { useAuthStore } from '../../../stores/authStore';
import type { SalesOrder, SalesOrderStatus, CreateSalesOrderPayload } from '../types/salesOrder.types';
import {
  useSalesOrders,
  useSalesOrder,
  useCreateSalesOrder,
  useSubmitSalesOrder,
  useConfirmSalesOrder,
  useCancelSalesOrder,
} from '../hooks';

// ─── Status Badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<SalesOrderStatus, { label: string; cls: string }> = {
  DRAFT: { label: 'Draft', cls: 'bg-gray-100 text-gray-700' },
  PENDING_CONFIRMATION: { label: 'Pending Confirm', cls: 'bg-yellow-100 text-yellow-800' },
  CONFIRMED: { label: 'Confirmed', cls: 'bg-green-100 text-green-800' },
  PARTIALLY_INVOICED: { label: 'Partially Invoiced', cls: 'bg-blue-100 text-blue-800' },
  FULLY_INVOICED: { label: 'Fully Invoiced', cls: 'bg-indigo-100 text-indigo-800' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-red-100 text-red-800' },
};

const StatusBadge: React.FC<{ status: SalesOrderStatus }> = ({ status }) => {
  const cfg = STATUS_CONFIG[status] ?? { label: status, cls: 'bg-gray-100 text-gray-700' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
};

// ─── Formatters ───────────────────────────────────────────────────────────────

const fmt = (v: string | number | null | undefined) =>
  v != null ? `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—';

const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// ─── Create Sales Order Modal ─────────────────────────────────────────────────

interface CreateModalProps {
  onClose: () => void;
  initialQuotationId?: string;
}

const CreateSalesOrderModal: React.FC<CreateModalProps> = ({ onClose, initialQuotationId }) => {
  const [form, setForm] = useState<CreateSalesOrderPayload>({
    quotationId: initialQuotationId || '',
    customerPoNumber: '',
    notes: '',
  });

  const createSO = useCreateSalesOrder();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.quotationId.trim()) return;
    try {
      await createSO.mutateAsync(form);
      onClose();
    } catch (_) { /* handled by hook */ }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-indigo-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Create Sales Order</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quotation ID <span className="text-red-500">*</span>
            </label>
            <input
              id="so-quotation-id"
              type="text"
              required
              placeholder="Paste approved quotation UUID"
              value={form.quotationId}
              onChange={(e) => setForm((f) => ({ ...f, quotationId: e.target.value.trim() }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
            />
            <p className="mt-1 text-xs text-gray-500">
              Only APPROVED quotations are accepted. Totals are recalculated server-side.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer PO Number</label>
            <input
              id="so-customer-po"
              type="text"
              placeholder="Customer's own PO reference (e.g. ABC/PO/4587)"
              value={form.customerPoNumber || ''}
              onChange={(e) => setForm((f) => ({ ...f, customerPoNumber: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer PO Date</label>
              <input
                id="so-customer-po-date"
                type="date"
                value={form.customerPoDate || ''}
                onChange={(e) => setForm((f) => ({ ...f, customerPoDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expected Delivery</label>
              <input
                id="so-exp-delivery"
                type="date"
                value={form.expectedDeliveryDate || ''}
                onChange={(e) => setForm((f) => ({ ...f, expectedDeliveryDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              id="so-notes"
              rows={2}
              placeholder="Internal notes..."
              value={form.notes || ''}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="so-create-submit"
              disabled={createSO.isPending || !form.quotationId.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {createSO.isPending ? 'Creating…' : 'Create Sales Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Cancel Modal ─────────────────────────────────────────────────────────────

interface CancelModalProps {
  soId: string;
  soNumber: string;
  onClose: () => void;
}

const CancelModal: React.FC<CancelModalProps> = ({ soId, soNumber, onClose }) => {
  const [reason, setReason] = useState('');
  const cancelSO = useCancelSalesOrder();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    try {
      await cancelSO.mutateAsync({ id: soId, payload: { cancellationReason: reason } });
      onClose();
    } catch (_) { /* handled by hook */ }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Cancel Sales Order</h2>
            <p className="text-sm text-gray-500">{soNumber}</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cancellation Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              id="so-cancel-reason"
              required
              rows={3}
              placeholder="Provide reason for cancellation..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
            <button
              type="submit"
              id="so-cancel-confirm"
              disabled={cancelSO.isPending || !reason.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {cancelSO.isPending ? 'Cancelling…' : 'Confirm Cancellation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Detail Drawer ────────────────────────────────────────────────────────────

interface DetailDrawerProps {
  id: string;
  onClose: () => void;
  canConfirm: boolean;
  canCancel: boolean;
  onConfirm: (id: string) => void;
  onCancel: (so: SalesOrder) => void;
  onSubmit: (id: string) => void;
}

const DetailDrawer: React.FC<DetailDrawerProps> = ({
  id, onClose, canConfirm, canCancel, onConfirm, onCancel, onSubmit,
}) => {
  const { data: so, isLoading } = useSalesOrder(id);
  const confirmSO = useConfirmSalesOrder();
  const submitSO = useSubmitSalesOrder();

  if (isLoading || !so) {
    return (
      <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-2xl z-50 flex items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold text-indigo-700">{so.salesOrderNumber}</span>
            <StatusBadge status={so.status} />
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {so.customer?.name} {so.customer?.companyName ? `· ${so.customer.companyName}` : ''}
          </p>
        </div>
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-200 transition-colors">
          <X className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Quotation Reference */}
        <section className="bg-indigo-50 rounded-xl p-4">
          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-2">Source Quotation</p>
          <p className="text-sm font-mono font-medium text-indigo-800">{so.quotation?.quotationNumber}</p>
          {so.customerPoNumber && (
            <p className="text-sm text-indigo-700 mt-1">
              Customer PO: <span className="font-medium">{so.customerPoNumber}</span>
              {so.customerPoDate && ` · ${fmtDate(so.customerPoDate)}`}
            </p>
          )}
        </section>

        {/* Dates */}
        <section>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Dates</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Order Date</p>
              <p className="font-medium text-gray-900">{fmtDate(so.orderDate)}</p>
            </div>
            <div>
              <p className="text-gray-500">Expected Delivery</p>
              <p className="font-medium text-gray-900">{fmtDate(so.expectedDeliveryDate)}</p>
            </div>
          </div>
        </section>

        {/* Line Items */}
        <section>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Line Items</p>
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Product</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Qty</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Unit Price</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Tax</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {so.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{item.productNameSnapshot}</p>
                      {item.skuSnapshot && <p className="text-xs text-gray-500">{item.skuSnapshot}</p>}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">{item.quantity} {item.unitSnapshot}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{fmt(item.unitPrice)}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{Number(item.taxRate)}%</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{fmt(item.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="mt-3 border border-gray-200 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span><span>{fmt(so.subtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Tax</span><span>{fmt(so.taxAmount)}</span>
            </div>
            <div className="flex justify-between font-semibold text-gray-900 text-base border-t pt-2 mt-2">
              <span>Total</span><span>{fmt(so.totalAmount)}</span>
            </div>
          </div>
        </section>

        {/* Cancellation Info */}
        {so.status === 'CANCELLED' && so.cancellationReason && (
          <section className="bg-red-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">Cancellation Reason</p>
            <p className="text-sm text-red-800">{so.cancellationReason}</p>
            {so.cancelledAt && <p className="text-xs text-red-500 mt-1">{fmtDate(so.cancelledAt)}</p>}
          </section>
        )}

        {/* Notes */}
        {so.notes && (
          <section>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Notes</p>
            <p className="text-sm text-gray-700">{so.notes}</p>
          </section>
        )}
      </div>

      {/* Action Footer */}
      {so.status !== 'CANCELLED' && (
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex gap-3 flex-wrap">
          {so.status === 'DRAFT' && (
            <button
              id="so-detail-submit"
              onClick={() => onSubmit(so.id)}
              disabled={submitSO.isPending}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Send className="w-4 h-4" /> Submit
            </button>
          )}
          {so.status === 'PENDING_CONFIRMATION' && canConfirm && (
            <button
              id="so-detail-confirm"
              onClick={() => onConfirm(so.id)}
              disabled={confirmSO.isPending}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <CheckCircle className="w-4 h-4" /> Confirm Order
            </button>
          )}
          {(so.status === 'CONFIRMED' || so.status === 'PARTIALLY_INVOICED' || so.status === 'FULLY_INVOICED') && (
            <>
              <button
                id="so-detail-create-invoice"
                onClick={() => navigate('/invoices')}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Receipt className="w-4 h-4" /> Invoice Module
              </button>
              <button
                id="so-detail-create-dispatch"
                onClick={() => navigate('/dispatches')}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Truck className="w-4 h-4" /> Create Dispatch
              </button>
            </>
          )}
          {canCancel && (
            <button
              id="so-detail-cancel"
              onClick={() => onCancel(so)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
            >
              <XCircle className="w-4 h-4" /> Cancel Order
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export const SalesOrdersPage: React.FC = () => {
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<SalesOrder | null>(null);
  const [initialQId, setInitialQId] = useState<string | undefined>();

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qId = params.get('quotationId');
    if (qId) {
      setInitialQId(qId);
      setShowCreate(true);
    }
  }, []);

  const isAdmin = user?.role === 'ADMIN';
  const isManager = user?.role === 'MANAGER';
  const designation = (user?.designation || '').toLowerCase();
  const isAccountant = user?.role === 'USER' && designation.includes('accountant');
  const isSales = (user?.role === 'USER' || (user as any)?.role === 'SALES') && designation.includes('sales');

  const canConfirm = isAdmin || isManager;
  const canCancel = isAdmin || isManager;
  const canCreate = isAdmin || isManager || isSales || isAccountant;

  const query = { search: search || undefined, status: statusFilter as any || undefined, page, limit: 10 };
  const { data: result, isLoading, refetch } = useSalesOrders(query);
  const submitSO = useSubmitSalesOrder();
  const confirmSO = useConfirmSalesOrder();

  const salesOrders = result?.data ?? [];
  const meta = result?.meta ?? {};

  const openCreate = (quotationId?: string) => {
    setInitialQId(quotationId);
    setShowCreate(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Sales Orders</h1>
              <p className="text-sm text-gray-500">Manage customer purchase orders</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => refetch()}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4 text-gray-600" />
            </button>
            {canCreate && (
              <button
                id="so-create-btn"
                onClick={() => openCreate()}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-4 h-4" /> New Sales Order
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 bg-white border-b border-gray-100">
        <div className="flex gap-3 flex-wrap items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-48 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              id="so-search"
              type="text"
              placeholder="Search SO number..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 pr-3 py-2 w-full border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              id="so-status-filter"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="appearance-none pl-3 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PENDING_CONFIRMATION">Pending Confirmation</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {(search || statusFilter) && (
            <button
              onClick={() => { setSearch(''); setStatusFilter(''); setPage(1); }}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}

          {meta.total != null && (
            <span className="text-sm text-gray-500 ml-auto">
              {meta.total} order{meta.total !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="px-6 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
          </div>
        ) : salesOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
              <ShoppingCart className="w-8 h-8 text-indigo-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">No Sales Orders Found</h3>
            <p className="text-sm text-gray-500 mb-4">
              Create one from an approved quotation to get started.
            </p>
            {canCreate && (
              <button
                id="so-create-empty"
                onClick={() => openCreate()}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-4 h-4" /> New Sales Order
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">SO Number</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Customer PO</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Quotation</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Amount</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {salesOrders.map((so: SalesOrder) => (
                  <tr key={so.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-semibold text-indigo-700">{so.salesOrderNumber}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 truncate max-w-32">{so.customer?.name ?? '—'}</p>
                      {so.customer?.companyName && (
                        <p className="text-xs text-gray-500 truncate max-w-32">{so.customer.companyName}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs font-mono">
                      {so.customerPoNumber ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-gray-600">
                        {so.quotation?.quotationNumber ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmtDate(so.orderDate)}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 whitespace-nowrap">
                      {fmt(so.totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={so.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          id={`so-view-${so.id}`}
                          onClick={() => setSelectedId(so.id)}
                          className="p-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4 text-indigo-600" />
                        </button>
                        {so.status === 'DRAFT' && (
                          <button
                            id={`so-submit-${so.id}`}
                            onClick={() => submitSO.mutate(so.id)}
                            className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                            title="Submit for Confirmation"
                          >
                            <Send className="w-4 h-4 text-blue-600" />
                          </button>
                        )}
                        {so.status === 'PENDING_CONFIRMATION' && canConfirm && (
                          <button
                            id={`so-confirm-${so.id}`}
                            onClick={() => confirmSO.mutate(so.id)}
                            className="p-1.5 rounded-lg hover:bg-green-50 transition-colors"
                            title="Confirm Order"
                          >
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          </button>
                        )}
                        {canCancel && so.status !== 'CANCELLED' && (
                          <button
                            id={`so-cancel-${so.id}`}
                            onClick={() => setCancelTarget(so)}
                            className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                            title="Cancel Order"
                          >
                            <XCircle className="w-4 h-4 text-red-500" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {meta.totalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-600">
                <span>
                  Page {meta.page} of {meta.totalPages} · {meta.total} total
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    disabled={page >= meta.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals / Drawers */}
      {showCreate && (
        <CreateSalesOrderModal
          initialQuotationId={initialQId}
          onClose={() => { setShowCreate(false); setInitialQId(undefined); }}
        />
      )}

      {selectedId && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setSelectedId(null)} />
          <DetailDrawer
            id={selectedId}
            onClose={() => setSelectedId(null)}
            canConfirm={canConfirm}
            canCancel={canCancel}
            onConfirm={(id) => { confirmSO.mutate(id); setSelectedId(null); }}
            onCancel={(so) => { setCancelTarget(so); setSelectedId(null); }}
            onSubmit={(id) => { submitSO.mutate(id); setSelectedId(null); }}
          />
        </>
      )}

      {cancelTarget && (
        <CancelModal
          soId={cancelTarget.id}
          soNumber={cancelTarget.salesOrderNumber}
          onClose={() => setCancelTarget(null)}
        />
      )}
    </div>
  );
};

export default SalesOrdersPage;
