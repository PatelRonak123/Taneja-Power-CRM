import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Send,
  RefreshCw,
  X,
  ChevronDown,
  Printer,
  Truck,
  CheckCheck,
  Receipt,
  AlertTriangle,
} from 'lucide-react';
import { useAuthStore } from '../../../stores/authStore';
import { navigate } from '../../../app/router/navigation';
import type {
  SalesInvoice,
  SalesInvoiceStatus,
  VendorInvoiceStatus,
  CreateSalesInvoiceFromSoPayload,
  CreateVendorInvoicePayload,
} from '../types/invoice.types';
import {
  useSalesInvoices,
  useSalesInvoice,
  useCreateSalesInvoiceFromSo,
  useSubmitSalesInvoice,
  useIssueSalesInvoice,
  useCancelSalesInvoice,
  useVendorInvoices,
  useVendorInvoice,
  useCreateVendorInvoice,
  useSubmitVendorInvoice,
  useVerifyVendorInvoice,
  usePostVendorInvoice,
  useCancelVendorInvoice,
} from '../hooks';
import { useSalesOrders } from '../../sales-orders/hooks';
import { SalesInvoicePrintDocument } from '../components/SalesInvoicePrintDocument';

// ─── Status Badges ────────────────────────────────────────────────────────────

const SALES_STATUS_CONFIG: Record<SalesInvoiceStatus, { label: string; cls: string }> = {
  DRAFT: { label: 'Draft', cls: 'bg-gray-100 text-gray-700' },
  PENDING_ISSUE: { label: 'Pending Issue', cls: 'bg-yellow-100 text-yellow-800' },
  ISSUED: { label: 'Issued', cls: 'bg-emerald-100 text-emerald-800' },
  PARTIALLY_PAID: { label: 'Partially Paid', cls: 'bg-blue-100 text-blue-800' },
  PAID: { label: 'Paid', cls: 'bg-green-100 text-green-800' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-red-100 text-red-800' },
};

const VENDOR_STATUS_CONFIG: Record<VendorInvoiceStatus, { label: string; cls: string }> = {
  DRAFT: { label: 'Draft', cls: 'bg-gray-100 text-gray-700' },
  PENDING_VERIFICATION: { label: 'Pending Verification', cls: 'bg-yellow-100 text-yellow-800' },
  VERIFIED: { label: 'Verified', cls: 'bg-blue-100 text-blue-800' },
  POSTED: { label: 'Posted', cls: 'bg-emerald-100 text-emerald-800' },
  REJECTED: { label: 'Rejected', cls: 'bg-orange-100 text-orange-800' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-red-100 text-red-800' },
};

const SalesStatusBadge: React.FC<{ status: SalesInvoiceStatus }> = ({ status }) => {
  const cfg = SALES_STATUS_CONFIG[status] ?? { label: status, cls: 'bg-gray-100 text-gray-700' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
};

const VendorStatusBadge: React.FC<{ status: VendorInvoiceStatus }> = ({ status }) => {
  const cfg = VENDOR_STATUS_CONFIG[status] ?? { label: status, cls: 'bg-gray-100 text-gray-700' };
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

// ─── Create Sales Invoice Modal ───────────────────────────────────────────────

interface CreateSalesInvoiceModalProps {
  onClose: () => void;
  initialSalesOrderId?: string;
}

const CreateSalesInvoiceModal: React.FC<CreateSalesInvoiceModalProps> = ({
  onClose,
  initialSalesOrderId,
}) => {
  const [salesOrderId, setSalesOrderId] = useState(initialSalesOrderId || '');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState('');

  // Fetch confirmed sales orders for selection
  const { data: soRes, isLoading: loadingSos } = useSalesOrders({ status: 'CONFIRMED', limit: 50 });
  const confirmedSos = soRes?.data || [];

  const createInvoice = useCreateSalesInvoiceFromSo();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salesOrderId) return;
    try {
      const payload: CreateSalesInvoiceFromSoPayload = {
        notes: notes.trim() || undefined,
        dueDate: dueDate || undefined,
      };
      await createInvoice.mutateAsync({ salesOrderId, payload });
      onClose();
    } catch (_) {}
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Generate Sales Invoice</h2>
              <p className="text-xs text-gray-500">From a confirmed Sales Order</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Confirmed Sales Order <span className="text-red-500">*</span>
            </label>
            {loadingSos ? (
              <div className="py-2 text-sm text-gray-400">Loading sales orders...</div>
            ) : confirmedSos.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                No confirmed sales orders awaiting invoice. Please confirm a Sales Order first.
              </div>
            ) : (
              <select
                id="create-inv-so-select"
                value={salesOrderId}
                onChange={(e) => setSalesOrderId(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">-- Choose Sales Order --</option>
                {confirmedSos.map((so) => (
                  <option key={so.id} value={so.id}>
                    {so.salesOrderNumber} — {fmt(so.totalAmount)}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Internal Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes or instructions..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              id="create-inv-submit-btn"
              type="submit"
              disabled={!salesOrderId || createInvoice.isPending}
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {createInvoice.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Generate Invoice
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Record Vendor Invoice Modal ──────────────────────────────────────────────

interface RecordVendorInvoiceModalProps {
  onClose: () => void;
}

const RecordVendorInvoiceModal: React.FC<RecordVendorInvoiceModalProps> = ({ onClose }) => {
  const [vendorInvoiceNumber, setVendorInvoiceNumber] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [purchaseOrderId, setPurchaseOrderId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  // Items
  const [purchaseOrderItemId, setPurchaseOrderItemId] = useState('');
  const [invoicedQuantity, setInvoicedQuantity] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [taxRate, setTaxRate] = useState('18');

  const createVendorInv = useCreateVendorInvoice();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorInvoiceNumber.trim() || !supplierId.trim() || !purchaseOrderId.trim() || !purchaseOrderItemId.trim()) return;

    try {
      const payload: CreateVendorInvoicePayload = {
        vendorInvoiceNumber: vendorInvoiceNumber.trim(),
        supplierId: supplierId.trim(),
        purchaseOrderId: purchaseOrderId.trim(),
        invoiceDate,
        dueDate: dueDate || undefined,
        notes: notes.trim() || undefined,
        items: [
          {
            purchaseOrderItemId: purchaseOrderItemId.trim(),
            invoicedQuantity: Number(invoicedQuantity),
            unitCost: unitCost ? Number(unitCost) : undefined,
            taxRate: Number(taxRate),
          },
        ],
      };
      await createVendorInv.mutateAsync(payload);
      onClose();
    } catch (_) {}
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <Truck className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Record Vendor Bill / Invoice</h2>
              <p className="text-xs text-gray-500">From supplier against PO and GRN</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Supplier Invoice Number <span className="text-red-500">*</span>
            </label>
            <input
              id="vendor-inv-num"
              type="text"
              required
              value={vendorInvoiceNumber}
              onChange={(e) => setVendorInvoiceNumber(e.target.value)}
              placeholder="e.g. INV-SUPP-9842"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Supplier ID <span className="text-red-500">*</span>
              </label>
              <input
                id="vendor-supplier-id"
                type="text"
                required
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                placeholder="Supplier UUID"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Purchase Order ID <span className="text-red-500">*</span>
              </label>
              <input
                id="vendor-po-id"
                type="text"
                required
                value={purchaseOrderId}
                onChange={(e) => setPurchaseOrderId(e.target.value)}
                placeholder="PO UUID"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100 space-y-3">
            <h3 className="text-xs font-bold text-purple-900 uppercase">Item Entry</h3>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                PO Item ID <span className="text-red-500">*</span>
              </label>
              <input
                id="vendor-po-item-id"
                type="text"
                required
                value={purchaseOrderItemId}
                onChange={(e) => setPurchaseOrderItemId(e.target.value)}
                placeholder="PO Item UUID"
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Qty <span className="text-red-500">*</span>
                </label>
                <input
                  id="vendor-inv-qty"
                  type="number"
                  required
                  min="0.001"
                  step="any"
                  value={invoicedQuantity}
                  onChange={(e) => setInvoicedQuantity(e.target.value)}
                  placeholder="Invoiced Qty"
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Unit Cost</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  placeholder="Optional"
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tax Rate (%)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date</label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Internal Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes or supplier details..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              id="vendor-inv-submit-btn"
              type="submit"
              disabled={createVendorInv.isPending}
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {createVendorInv.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Save Vendor Bill
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Cancellation Reason Modal ────────────────────────────────────────────────

interface CancelModalProps {
  title: string;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  isPending: boolean;
}

const CancelModal: React.FC<CancelModalProps> = ({ title, onClose, onConfirm, isPending }) => {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">{title}</h3>
            <p className="text-xs text-gray-500">Provide a mandatory cancellation reason</p>
          </div>
        </div>

        <textarea
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for cancellation..."
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-red-500"
        />

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            Back
          </button>
          <button
            type="button"
            disabled={!reason.trim() || isPending}
            onClick={() => onConfirm(reason.trim())}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50"
          >
            {isPending ? 'Cancelling...' : 'Confirm Cancellation'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Invoices Page ───────────────────────────────────────────────────────

export const InvoicesPage: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  const isManager = (user as any)?.role === 'MANAGER';
  const canIssueOrPost = isAdmin || isManager;

  const [activeTab, setActiveTab] = useState<'sales' | 'vendor'>('sales');

  // Sales Invoice filters
  const [salesSearch, setSalesSearch] = useState('');
  const [salesStatusFilter, setSalesStatusFilter] = useState('');
  const [salesPage, setSalesPage] = useState(1);

  // Vendor Invoice filters
  const [vendorSearch, setVendorSearch] = useState('');
  const [vendorStatusFilter, setVendorStatusFilter] = useState('');
  const [vendorPage, setVendorPage] = useState(1);

  // Modals & Drawers
  const [showCreateSalesModal, setShowCreateSalesModal] = useState(false);
  const [showRecordVendorModal, setShowRecordVendorModal] = useState(false);
  const [selectedSalesInvoiceId, setSelectedSalesInvoiceId] = useState<string | null>(null);
  const [selectedVendorInvoiceId, setSelectedVendorInvoiceId] = useState<string | null>(null);
  const [printInvoice, setPrintInvoice] = useState<SalesInvoice | null>(null);
  const [cancelModalData, setCancelModalData] = useState<{
    type: 'sales' | 'vendor';
    id: string;
  } | null>(null);

  // Queries
  const {
    data: salesData,
    isLoading: loadingSales,
    refetch: refetchSales,
  } = useSalesInvoices({
    search: salesSearch || undefined,
    status: salesStatusFilter || undefined,
    page: salesPage,
    limit: 25,
  });

  const {
    data: vendorData,
    isLoading: loadingVendor,
    refetch: refetchVendor,
  } = useVendorInvoices({
    search: vendorSearch || undefined,
    status: vendorStatusFilter || undefined,
    page: vendorPage,
    limit: 25,
  });

  const { data: salesDetail, isLoading: loadingSalesDetail } = useSalesInvoice(
    selectedSalesInvoiceId || ''
  );
  const { data: vendorDetail, isLoading: loadingVendorDetail } = useVendorInvoice(
    selectedVendorInvoiceId || ''
  );

  // Mutations
  const submitSales = useSubmitSalesInvoice();
  const issueSales = useIssueSalesInvoice();
  const cancelSales = useCancelSalesInvoice();

  const submitVendor = useSubmitVendorInvoice();
  const verifyVendor = useVerifyVendorInvoice();
  const postVendor = usePostVendorInvoice();
  const cancelVendor = useCancelVendorInvoice();

  const salesInvoices = salesData?.data || [];
  const vendorInvoices = vendorData?.data || [];

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-16">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              <Receipt className="w-3.5 h-3.5" />
              FINANCIAL DOCUMENTS
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
            Invoice Management
          </h1>
          <p className="text-sm text-slate-500">
            Authoritative Sales Invoices (Customer Billing) & Vendor Purchase Bills (Procurement)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => (activeTab === 'sales' ? refetchSales() : refetchVendor())}
            className="p-2 border border-gray-300 rounded-xl hover:bg-gray-50 text-gray-600 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {activeTab === 'sales' ? (
            <button
              id="new-sales-invoice-btn"
              onClick={() => setShowCreateSalesModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" /> Generate Sales Invoice
            </button>
          ) : (
            <button
              id="new-vendor-invoice-btn"
              onClick={() => setShowRecordVendorModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" /> Record Vendor Bill
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-8">
        <button
          onClick={() => setActiveTab('sales')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'sales'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <FileText className="w-4 h-4" />
          Sales Invoices
          <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700 font-bold">
            {salesData?.meta?.total ?? salesInvoices.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('vendor')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'vendor'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Truck className="w-4 h-4" />
          Vendor Invoices (Bills)
          <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-purple-50 text-purple-700 font-bold">
            {vendorData?.meta?.total ?? vendorInvoices.length}
          </span>
        </button>
      </div>

      {/* ─── TAB CONTENT ─── */}
      {activeTab === 'sales' ? (
        <div className="flex flex-col gap-4">
          {/* Filters */}
          <div className="flex gap-3 flex-wrap items-center bg-white p-4 rounded-xl border border-gray-200">
            <div className="relative flex-1 min-w-48 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search invoice # or customer..."
                value={salesSearch}
                onChange={(e) => {
                  setSalesSearch(e.target.value);
                  setSalesPage(1);
                }}
                className="pl-9 pr-3 py-2 w-full border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="relative">
              <select
                value={salesStatusFilter}
                onChange={(e) => {
                  setSalesStatusFilter(e.target.value);
                  setSalesPage(1);
                }}
                className="appearance-none pl-3 pr-8 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              >
                <option value="">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="PENDING_ISSUE">Pending Issue</option>
                <option value="ISSUED">Issued</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            {(salesSearch || salesStatusFilter) && (
              <button
                onClick={() => {
                  setSalesSearch('');
                  setSalesStatusFilter('');
                  setSalesPage(1);
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <X className="w-3.5 h-3.5" /> Clear
              </button>
            )}
          </div>

          {/* Table */}
          {loadingSales ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : salesInvoices.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-gray-200">
              <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-800">No Sales Invoices Found</h3>
              <p className="text-xs text-gray-500 mt-1">
                Generate an invoice from a confirmed Sales Order.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Invoice #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Customer
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      SO Ref
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Invoice Date
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                      Taxable
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                      Total Tax
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                      Grand Total
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {salesInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-blue-700">
                        {inv.invoiceNumber}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {inv.customerNameSnapshot || inv.customer?.name || 'Customer'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                        {inv.salesOrder?.salesOrderNumber || '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {fmtDate(inv.invoiceDate)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-700">
                        {fmt(inv.taxableAmount || inv.subtotal)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-600">
                        {fmt(inv.totalTax)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                        {fmt(inv.totalAmount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <SalesStatusBadge status={inv.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedSalesInvoiceId(inv.id)}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setPrintInvoice(inv)}
                            className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Print / PDF Document"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Vendor Filters */}
          <div className="flex gap-3 flex-wrap items-center bg-white p-4 rounded-xl border border-gray-200">
            <div className="relative flex-1 min-w-48 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search vendor bill # or supplier..."
                value={vendorSearch}
                onChange={(e) => {
                  setVendorSearch(e.target.value);
                  setVendorPage(1);
                }}
                className="pl-9 pr-3 py-2 w-full border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="relative">
              <select
                value={vendorStatusFilter}
                onChange={(e) => {
                  setVendorStatusFilter(e.target.value);
                  setVendorPage(1);
                }}
                className="appearance-none pl-3 pr-8 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              >
                <option value="">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="PENDING_VERIFICATION">Pending Verification</option>
                <option value="VERIFIED">Verified</option>
                <option value="POSTED">Posted</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            {(vendorSearch || vendorStatusFilter) && (
              <button
                onClick={() => {
                  setVendorSearch('');
                  setVendorStatusFilter('');
                  setVendorPage(1);
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <X className="w-3.5 h-3.5" /> Clear
              </button>
            )}
          </div>

          {/* Vendor Table */}
          {loadingVendor ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="w-6 h-6 animate-spin text-purple-500" />
            </div>
          ) : vendorInvoices.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-gray-200">
              <Truck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-800">No Vendor Invoices Found</h3>
              <p className="text-xs text-gray-500 mt-1">
                Record supplier purchase bills against POs and GRNs.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Supplier Bill #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Supplier
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      PO Ref
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Bill Date
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                      Taxable
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                      Tax Amount
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                      Total Bill
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {vendorInvoices.map((vInv) => (
                    <tr key={vInv.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-purple-700">
                        {vInv.vendorInvoiceNumber}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {vInv.supplier?.supplierName || 'Supplier'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                        {vInv.purchaseOrder?.poNumber || '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {fmtDate(vInv.invoiceDate)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-700">
                        {fmt(vInv.subtotal)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-600">
                        {fmt(vInv.taxAmount)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                        {fmt(vInv.totalAmount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <VendorStatusBadge status={vInv.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSelectedVendorInvoiceId(vInv.id)}
                          className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── SALES INVOICE DETAIL DRAWER ─── */}
      {selectedSalesInvoiceId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex justify-end">
          <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-gray-900 font-mono">
                      {salesDetail?.invoiceNumber || 'Loading...'}
                    </h2>
                    {salesDetail && <SalesStatusBadge status={salesDetail.status} />}
                  </div>
                  <p className="text-xs text-gray-500">Sales Invoice Specification</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSalesInvoiceId(null)}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {loadingSalesDetail || !salesDetail ? (
                <div className="flex items-center justify-center py-20">
                  <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                </div>
              ) : (
                <>
                  {/* Customer Snapshot */}
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-2 text-xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-gray-400 font-semibold uppercase">Customer</span>
                        <p className="text-sm font-bold text-gray-900 mt-0.5">
                          {salesDetail.customerNameSnapshot || salesDetail.customer?.name}
                        </p>
                      </div>
                      {salesDetail.customerGstinSnapshot && (
                        <div className="text-right">
                          <span className="text-gray-400 font-semibold uppercase">GSTIN</span>
                          <p className="font-mono font-bold text-gray-800 mt-0.5">
                            {salesDetail.customerGstinSnapshot}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="pt-2 border-t border-gray-200 text-gray-600">
                      <span className="font-medium text-gray-700">Billing Address: </span>
                      {[
                        salesDetail.billingAddress,
                        salesDetail.billingCity,
                        salesDetail.billingState,
                        salesDetail.billingPincode,
                      ]
                        .filter(Boolean)
                        .join(', ') || '—'}
                    </div>
                  </div>

                  {/* Items Table */}
                  <div>
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Invoiced Items
                    </h3>
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="py-2 px-3 text-left">Item</th>
                            <th className="py-2 px-2 text-right">Qty</th>
                            <th className="py-2 px-2 text-right">Rate</th>
                            <th className="py-2 px-2 text-right">Tax</th>
                            <th className="py-2 px-3 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {(salesDetail.items || []).map((it) => (
                            <tr key={it.id}>
                              <td className="py-2 px-3">
                                <p className="font-semibold text-gray-900">{it.productNameSnapshot}</p>
                                {it.skuSnapshot && (
                                  <p className="text-[10px] font-mono text-gray-400">SKU: {it.skuSnapshot}</p>
                                )}
                              </td>
                              <td className="py-2 px-2 text-right font-medium">
                                {it.quantity} {it.unitSnapshot}
                              </td>
                              <td className="py-2 px-2 text-right font-mono">{fmt(it.unitPrice)}</td>
                              <td className="py-2 px-2 text-right font-mono text-gray-500">
                                {fmt(it.taxAmount)} ({it.taxRate}%)
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-gray-900">
                                {fmt(it.lineTotal)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Financial Breakdown */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2 text-xs">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal (Taxable):</span>
                      <span className="font-mono">{fmt(salesDetail.taxableAmount || salesDetail.subtotal)}</span>
                    </div>
                    {Number(salesDetail.cgstAmount || 0) > 0 && (
                      <div className="flex justify-between text-gray-600">
                        <span>CGST (9%):</span>
                        <span className="font-mono">{fmt(salesDetail.cgstAmount)}</span>
                      </div>
                    )}
                    {Number(salesDetail.sgstAmount || 0) > 0 && (
                      <div className="flex justify-between text-gray-600">
                        <span>SGST (9%):</span>
                        <span className="font-mono">{fmt(salesDetail.sgstAmount)}</span>
                      </div>
                    )}
                    {Number(salesDetail.igstAmount || 0) > 0 && (
                      <div className="flex justify-between text-gray-600">
                        <span>IGST (18%):</span>
                        <span className="font-mono">{fmt(salesDetail.igstAmount)}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-slate-200 flex justify-between font-black text-slate-900 text-sm">
                      <span>Grand Total:</span>
                      <span className="font-mono text-blue-700">{fmt(salesDetail.totalAmount)}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-3 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => setPrintInvoice(salesDetail)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors"
                    >
                      <Printer className="w-4 h-4" /> Print / View PDF Document
                    </button>

                    {salesDetail.status === 'DRAFT' && (
                      <button
                        onClick={async () => {
                          await submitSales.mutateAsync(salesDetail.id);
                        }}
                        disabled={submitSales.isPending}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors"
                      >
                        <Send className="w-4 h-4" /> Submit for Issue
                      </button>
                    )}

                    {salesDetail.status === 'PENDING_ISSUE' && canIssueOrPost && (
                      <button
                        onClick={async () => {
                          await issueSales.mutateAsync(salesDetail.id);
                        }}
                        disabled={issueSales.isPending}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors"
                      >
                        <CheckCheck className="w-4 h-4" /> Formally Issue Invoice
                      </button>
                    )}

                    {['ISSUED', 'PARTIALLY_PAID', 'PAID'].includes(salesDetail.status) && (
                      <button
                        onClick={() => navigate('/dispatches')}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors"
                      >
                        <Truck className="w-4 h-4" /> Create Delivery Challan / Dispatch
                      </button>
                    )}

                    {['DRAFT', 'PENDING_ISSUE'].includes(salesDetail.status) && canIssueOrPost && (
                      <button
                        onClick={() =>
                          setCancelModalData({ type: 'sales', id: salesDetail.id })
                        }
                        className="w-full flex items-center justify-center gap-2 py-2.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-xs font-semibold transition-colors"
                      >
                        <XCircle className="w-4 h-4" /> Cancel Invoice
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── VENDOR INVOICE DETAIL DRAWER ─── */}
      {selectedVendorInvoiceId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex justify-end">
          <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-purple-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                  <Truck className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-gray-900 font-mono">
                      {vendorDetail?.vendorInvoiceNumber || 'Loading...'}
                    </h2>
                    {vendorDetail && <VendorStatusBadge status={vendorDetail.status} />}
                  </div>
                  <p className="text-xs text-gray-500">Supplier Purchase Bill</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedVendorInvoiceId(null)}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {loadingVendorDetail || !vendorDetail ? (
                <div className="flex items-center justify-center py-20">
                  <RefreshCw className="w-6 h-6 animate-spin text-purple-500" />
                </div>
              ) : (
                <>
                  {/* Supplier & PO snapshot */}
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-2 text-xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-gray-400 font-semibold uppercase">Supplier</span>
                        <p className="text-sm font-bold text-gray-900 mt-0.5">
                          {vendorDetail.supplier?.supplierName || 'Supplier'}
                        </p>
                        <p className="text-gray-500 text-[10px]">
                          Code: {vendorDetail.supplier?.supplierCode}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-gray-400 font-semibold uppercase">Purchase Order</span>
                        <p className="font-mono font-bold text-purple-800 mt-0.5">
                          {vendorDetail.purchaseOrder?.poNumber || '—'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 3-Way Reconciliation Comparison (PO / GRN / Invoiced) */}
                  <div>
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Matching Comparison (PO ↔ GRN ↔ Bill)
                    </h3>
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="py-2 px-3 text-left">Product</th>
                            <th className="py-2 px-2 text-right">PO Ordered</th>
                            <th className="py-2 px-2 text-right">GRN Received</th>
                            <th className="py-2 px-2 text-right">Invoiced</th>
                            <th className="py-2 px-3 text-right">Line Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {(vendorDetail.items || []).map((it) => (
                            <tr key={it.id}>
                              <td className="py-2 px-3">
                                <p className="font-semibold text-gray-900">{it.productNameSnapshot}</p>
                                {it.skuSnapshot && (
                                  <p className="text-[10px] font-mono text-gray-400">SKU: {it.skuSnapshot}</p>
                                )}
                              </td>
                              <td className="py-2 px-2 text-right font-medium text-gray-600">
                                {it.orderedQuantity}
                              </td>
                              <td className="py-2 px-2 text-right font-medium text-emerald-700">
                                {it.receivedQuantity}
                              </td>
                              <td className="py-2 px-2 text-right font-bold text-purple-900">
                                {it.invoicedQuantity}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-gray-900">
                                {fmt(it.lineTotal)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Financials */}
                  <div className="bg-purple-50/50 rounded-xl p-4 border border-purple-100 space-y-2 text-xs">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal (Taxable):</span>
                      <span className="font-mono">{fmt(vendorDetail.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Tax Amount:</span>
                      <span className="font-mono">{fmt(vendorDetail.taxAmount)}</span>
                    </div>
                    <div className="pt-2 border-t border-purple-200 flex justify-between font-black text-slate-900 text-sm">
                      <span>Grand Total:</span>
                      <span className="font-mono text-purple-900">{fmt(vendorDetail.totalAmount)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-3 pt-4 border-t border-gray-100">
                    {vendorDetail.status === 'DRAFT' && (
                      <button
                        onClick={async () => {
                          await submitVendor.mutateAsync(vendorDetail.id);
                        }}
                        disabled={submitVendor.isPending}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold transition-colors"
                      >
                        <Send className="w-4 h-4" /> Submit for Verification
                      </button>
                    )}

                    {vendorDetail.status === 'PENDING_VERIFICATION' && canIssueOrPost && (
                      <button
                        onClick={async () => {
                          await verifyVendor.mutateAsync(vendorDetail.id);
                        }}
                        disabled={verifyVendor.isPending}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" /> Verify Supplier Bill
                      </button>
                    )}

                    {vendorDetail.status === 'VERIFIED' && canIssueOrPost && (
                      <button
                        onClick={async () => {
                          await postVendor.mutateAsync(vendorDetail.id);
                        }}
                        disabled={postVendor.isPending}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors"
                      >
                        <CheckCheck className="w-4 h-4" /> Post to Accounting
                      </button>
                    )}

                    {['DRAFT', 'PENDING_VERIFICATION'].includes(vendorDetail.status) && canIssueOrPost && (
                      <button
                        onClick={() =>
                          setCancelModalData({ type: 'vendor', id: vendorDetail.id })
                        }
                        className="w-full flex items-center justify-center gap-2 py-2.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-xs font-semibold transition-colors"
                      >
                        <XCircle className="w-4 h-4" /> Cancel Bill
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── PRINT MODAL ─── */}
      {printInvoice && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-gray-900 text-sm">
                  Tax Invoice Document — {printInvoice.invoiceNumber}
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Invoice
                </button>
                <button
                  onClick={() => setPrintInvoice(null)}
                  className="p-1 rounded-lg hover:bg-gray-200 text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-gray-100">
              <div className="bg-white shadow-md mx-auto">
                <SalesInvoicePrintDocument invoice={printInvoice} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreateSalesModal && (
        <CreateSalesInvoiceModal onClose={() => setShowCreateSalesModal(false)} />
      )}
      {showRecordVendorModal && (
        <RecordVendorInvoiceModal onClose={() => setShowRecordVendorModal(false)} />
      )}
      {cancelModalData && (
        <CancelModal
          title={
            cancelModalData.type === 'sales'
              ? 'Cancel Sales Invoice'
              : 'Cancel Vendor Bill'
          }
          onClose={() => setCancelModalData(null)}
          isPending={
            cancelModalData.type === 'sales'
              ? cancelSales.isPending
              : cancelVendor.isPending
          }
          onConfirm={async (reason) => {
            if (cancelModalData.type === 'sales') {
              await cancelSales.mutateAsync({
                id: cancelModalData.id,
                payload: { cancellationReason: reason },
              });
            } else {
              await cancelVendor.mutateAsync({
                id: cancelModalData.id,
                payload: { cancellationReason: reason },
              });
            }
            setCancelModalData(null);
            setSelectedSalesInvoiceId(null);
            setSelectedVendorInvoiceId(null);
          }}
        />
      )}
    </div>
  );
};
