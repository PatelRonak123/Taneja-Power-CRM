import React, { useState, useEffect, useMemo } from 'react';
import {
  Truck,
  FileText,
  PackageCheck,
  Plus,
  Search,
  CheckCircle,
  Eye,
  X,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { useSearchParams, useNavigationState } from '../../../app/router/navigation';
import { ProductForm } from '../../products/modules/ProductForm/ProductForm';
import { Supplier, PurchaseOrder, GoodsReceipt } from '../types/procurement.types';
import { procurementService } from '../services/procurementService';
import { Drawer } from '../../../components/ui/Drawer';
import { useAuthStore } from '../../../stores/authStore';
import {
  useSuppliers,
  usePurchaseOrders,
  useGoodsReceipts,
  useProcurementProducts,
  useCreateSupplier,
  useUpdateSupplier,
  useSetSupplierStatus,
  useCreatePurchaseOrder,
  useSubmitPurchaseOrder,
  useApprovePurchaseOrder,
  useCancelPurchaseOrder,
  useCreateGoodsReceipt,
  usePostGoodsReceipt,
} from '../hooks';

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = 'suppliers' | 'orders' | 'receipts';

const defaultSupplierForm = {
  supplierCode: '',
  name: '',
  legalName: '',
  contactPerson: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  gstin: '',
  pan: '',
  paymentTerms: '',
  notes: '',
  status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
  productIds: [] as string[],
};

const defaultPoForm = () => ({
  supplierId: '',
  orderDate: new Date().toISOString().split('T')[0],
  expectedDeliveryDate: '',
  notes: '',
  termsAndConditions: '',
  items: [{ productId: '', quantity: 1, unitCost: 0, taxRate: 18 }],
});

type GrnFormState = {
  purchaseOrderId: string;
  receiptDate: string;
  notes: string;
  items: Array<{
    purchaseOrderItemId: string;
    receivedQuantity: number;
    maxAllowed: number;
    productName: string;
  }>;
  autoPost: boolean;
};

const defaultGrnForm = (): GrnFormState => ({
  purchaseOrderId: '',
  receiptDate: new Date().toISOString().split('T')[0],
  notes: '',
  items: [],
  autoPost: true,
});

// ─── PO status badge colours ──────────────────────────────────────────────────
const PO_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-300',
  PENDING_APPROVAL: 'bg-amber-50 text-amber-700 border-amber-300',
  APPROVED: 'bg-blue-50 text-blue-700 border-blue-300',
  PARTIALLY_RECEIVED: 'bg-indigo-50 text-indigo-700 border-indigo-300',
  FULLY_RECEIVED: 'bg-emerald-50 text-emerald-700 border-emerald-300',
  CANCELLED: 'bg-rose-50 text-rose-700 border-rose-300',
};

// ─── Component ────────────────────────────────────────────────────────────────
export const ProcurementPage: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  const isManager = user?.role === 'MANAGER';
  const isAccountantOffice =
    user?.role === 'USER' &&
    (user?.designation || '').toLowerCase().includes('accountant');
  const canApprovePo = isAdmin || isManager;
  const canPostGrn = isAdmin || isManager;
  // Can create/edit products: ADMIN, MANAGER, or Accountant Office user
  const canManageProducts = isAdmin || isManager || isAccountantOffice;

  // ── Quick-add product modal ─────────────────────────────────────────────────
  const [showAddProductModal, setShowAddProductModal] = useState(false);

  // ── Tab ─────────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<Tab>('orders');

  // ── Filter state ─────────────────────────────────────────────────────────────
  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierStatusFilter, setSupplierStatusFilter] = useState('');
  const [poSearch, setPoSearch] = useState('');
  const [poStatusFilter, setPoStatusFilter] = useState('');
  const [grnSearch, setGrnSearch] = useState('');

  // ── Navigation & Query State ─────────────────────────────────────────────────
  const [searchParams, setSearchParams] = useSearchParams();
  const navState = useNavigationState<{
    source?: string;
    soNumber?: string;
    soId?: string;
    shortages?: Array<{
      productId: string;
      productName: string;
      sku?: string;
      unit?: string;
      shortageQty: number;
      orderedQty?: number;
      inStock?: number;
    }>;
  }>();

  // ── Modal / selection state ──────────────────────────────────────────────────
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierForm, setSupplierForm] = useState(defaultSupplierForm);
  const [supplierProductSearch, setSupplierProductSearch] = useState('');

  const [showPoModal, setShowPoModal] = useState(false);
  const [selectedPo, setSelectedPo] = useState<PurchaseOrder | null>(null);
  const [poForm, setPoForm] = useState(defaultPoForm());
  const [itemSearches, setItemSearches] = useState<Record<number, string>>({});

  const [showGrnModal, setShowGrnModal] = useState(false);
  const [selectedGrn, setSelectedGrn] = useState<GoodsReceipt | null>(null);
  const [grnSelectedPo, setGrnSelectedPo] = useState<PurchaseOrder | null>(null);
  const [grnForm, setGrnForm] = useState<GrnFormState>(defaultGrnForm());

  // ── Queries ──────────────────────────────────────────────────────────────────
  const {
    data: suppliers = [],
    isLoading: loadingSuppliers,
  } = useSuppliers({ search: supplierSearch, status: supplierStatusFilter });

  const { data: allActiveSuppliers = [] } = useSuppliers({ status: 'ACTIVE' });

  const {
    data: purchaseOrders = [],
    isLoading: loadingPos,
  } = usePurchaseOrders({ search: poSearch, status: poStatusFilter });

  const {
    data: receipts = [],
    isLoading: loadingReceipts,
  } = useGoodsReceipts({ search: grnSearch });

  const { data: availableProducts = [] } = useProcurementProducts();

  // ── Derived state: Supplier & products available for PO ───────────────────────
  const selectedSupplier = useMemo(() => {
    if (!poForm.supplierId) return null;
    return (
      allActiveSuppliers.find((s) => s.id === poForm.supplierId) ||
      suppliers.find((s) => s.id === poForm.supplierId) ||
      null
    );
  }, [poForm.supplierId, allActiveSuppliers, suppliers]);

  const supplierAvailableProducts = useMemo(() => {
    if (!poForm.supplierId || !selectedSupplier) return [];

    const supplierProdIds = new Set<string>([
      ...(selectedSupplier.productIds || []),
      ...(selectedSupplier.products?.map((p) => p.id) || []),
    ]);

    const matched = availableProducts.filter((p) => supplierProdIds.has(p.id));
    const matchedIds = new Set(matched.map((p) => p.id));

    const extras = (selectedSupplier.products || [])
      .filter((sp) => !matchedIds.has(sp.id))
      .map((sp) => ({
        id: sp.id,
        name: sp.name,
        sku: sp.sku,
        description: null,
        category: sp.category || 'General',
        price: parseFloat(sp.price || '0') || 0,
        stockQuantity: 0,
        status: 'ACTIVE' as const,
        gstRate: sp.gstRate ? parseFloat(String(sp.gstRate)) : 18,
        createdAt: '',
        updatedAt: '',
      }));

    return [...matched, ...extras];
  }, [poForm.supplierId, selectedSupplier, availableProducts]);

  // Listen for navigation from Sales Order shortage workflow
  useEffect(() => {
    const shouldCreatePo = searchParams.get('createPo') === 'true';
    const soNumber = searchParams.get('soNumber') || navState?.soNumber;

    if (shouldCreatePo) {
      setActiveTab('orders');
      setShowPoModal(true);

      const items =
        navState?.shortages && navState.shortages.length > 0
          ? navState.shortages.map((s) => {
              const matchedProd = availableProducts.find((p) => p.id === s.productId);
              const rawPrice = (matchedProd as any)?.price;
              const parsedPrice =
                typeof rawPrice === 'number'
                  ? rawPrice
                  : parseFloat(String(rawPrice || 0));
              const rawGst = (matchedProd as any)?.gstRate;
              const parsedGst =
                typeof rawGst === 'number'
                  ? rawGst
                  : parseFloat(String(rawGst || ''));
              return {
                productId: s.productId,
                quantity: s.shortageQty > 0 ? s.shortageQty : 1,
                unitCost: !isNaN(parsedPrice) && parsedPrice >= 0 ? parsedPrice : 0,
                taxRate: !isNaN(parsedGst) && parsedGst >= 0 ? parsedGst : 18,
              };
            })
          : defaultPoForm().items;

      // Find an active supplier that supplies the first shortage product (if available)
      const firstShortageProdId = navState?.shortages?.[0]?.productId;
      const initialSupplier = firstShortageProdId
        ? (allActiveSuppliers.length ? allActiveSuppliers : suppliers).find(
            (s) =>
              s.status === 'ACTIVE' &&
              (s.productIds?.includes(firstShortageProdId) ||
                s.products?.some((p) => p.id === firstShortageProdId))
          )
        : null;

      setItemSearches({});
      setPoForm({
        ...defaultPoForm(),
        supplierId: initialSupplier?.id || '',
        notes: soNumber ? `Procurement to fulfill stock shortage for Sales Order ${soNumber}` : '',
        items,
      });

      // Clear the query parameter so closing and reopening doesn't re-trigger unintentionally
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('createPo');
      nextParams.delete('soNumber');
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, navState, allActiveSuppliers, suppliers]);

  // ── Mutations ────────────────────────────────────────────────────────────────
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const setSupplierStatus = useSetSupplierStatus();

  const createPo = useCreatePurchaseOrder();
  const submitPo = useSubmitPurchaseOrder();
  const approvePo = useApprovePurchaseOrder();
  const cancelPo = useCancelPurchaseOrder();

  const createGrn = useCreateGoodsReceipt();
  const postGrn = usePostGoodsReceipt();

  // ── Handlers: Suppliers ──────────────────────────────────────────────────────
  const handleOpenAddSupplier = async () => {
    setEditingSupplier(null);
    setSupplierProductSearch('');
    let nextCode = '';
    try {
      const res = await procurementService.getNextSupplierCode();
      if (res.data?.nextCode) {
        nextCode = res.data.nextCode;
      }
    } catch {
      // Fallback: calculate from already loaded suppliers list
      const nums = (suppliers || [])
        .map((s) => {
          const m = s.supplierCode?.match(/^SUP-(\d+)$/i);
          return m ? parseInt(m[1], 10) : 0;
        })
        .filter((n) => !isNaN(n));
      const max = nums.length > 0 ? Math.max(...nums) : 0;
      nextCode = `SUP-${String(max + 1).padStart(4, '0')}`;
    }

    setSupplierForm({
      ...defaultSupplierForm,
      supplierCode: nextCode,
      paymentTerms: 'Net 30 Days',
      productIds: [],
    });
    setShowSupplierModal(true);
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSupplier) {
      await updateSupplier.mutateAsync({ id: editingSupplier.id, payload: supplierForm });
    } else {
      await createSupplier.mutateAsync(supplierForm);
    }
    setShowSupplierModal(false);
    setEditingSupplier(null);
  };

  const handleToggleSupplierStatus = (supplier: Supplier) => {
    const nextStatus = supplier.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setSupplierStatus.mutate({ id: supplier.id, status: nextStatus });
  };

  // ── Handlers: Purchase Orders ────────────────────────────────────────────────
  const handleSavePo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poForm.supplierId) {
      alert('Please select a supplier');
      return;
    }
    const hasInvalidItem = poForm.items.some((it) => !it.productId || it.quantity <= 0);
    if (hasInvalidItem) {
      alert('Please select a valid product and quantity for each line item');
      return;
    }
    await createPo.mutateAsync({
      ...poForm,
      items: poForm.items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        unitCost: i.unitCost,
        taxRate: i.taxRate,
      })),
    });
    setItemSearches({});
    setShowPoModal(false);
  };

  const handleSubmitPo = (poId: string) => submitPo.mutate(poId);
  const handleApprovePo = (poId: string) => approvePo.mutate(poId);
  const handleCancelPo = (poId: string) => {
    if (!window.confirm('Are you sure you want to cancel this purchase order?')) return;
    cancelPo.mutate(poId);
  };

  // ── Handlers: GRN ───────────────────────────────────────────────────────────
  const handlePoSelectForGrn = (poId: string) => {
    const po = purchaseOrders.find((p) => p.id === poId);
    if (!po || !po.items) return;
    setGrnSelectedPo(po);

    const items = po.items
      .map((item) => {
        const remaining = item.quantity - (item.receivedQuantity || 0);
        return {
          purchaseOrderItemId: item.id,
          receivedQuantity: remaining > 0 ? remaining : 0,
          maxAllowed: remaining,
          productName: item.productNameSnapshot,
        };
      })
      .filter((i) => i.maxAllowed > 0);

    setGrnForm({
      purchaseOrderId: po.id,
      receiptDate: new Date().toISOString().split('T')[0],
      notes: '',
      items,
      autoPost: true,
    });
  };

  const handleSaveGrn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (grnForm.items.length === 0) return;
    for (const item of grnForm.items) {
      if (item.receivedQuantity <= 0 || item.receivedQuantity > item.maxAllowed) return;
    }
    await createGrn.mutateAsync({
      purchaseOrderId: grnForm.purchaseOrderId,
      receiptDate: grnForm.receiptDate,
      notes: grnForm.notes,
      items: grnForm.items.map((i) => ({
        purchaseOrderItemId: i.purchaseOrderItemId,
        receivedQuantity: i.receivedQuantity,
      })),
      autoPost: grnForm.autoPost,
    });
    setShowGrnModal(false);
    setGrnSelectedPo(null);
  };

  const handlePostExistingGrn = (grnId: string) => postGrn.mutate(grnId);

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12">

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Procurement Management</h1>
          <p className="text-sm text-slate-400 mt-1">
            Supplier directory, purchase order approvals, and Goods Receipt (GRN) inventory integration.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-800/80 p-1.5 rounded-xl border border-slate-700/60 self-start md:self-auto">
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'orders' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Purchase Orders</span>
          </button>
          <button
            onClick={() => setActiveTab('receipts')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'receipts' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
            }`}
          >
            <PackageCheck className="w-4 h-4" />
            <span>Goods Receipts</span>
          </button>
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'suppliers' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Suppliers</span>
          </button>
        </div>
      </div>

      {/* ── TAB: PURCHASE ORDERS ─────────────────────────────────────────────── */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search PO number..."
                  value={poSearch}
                  onChange={(e) => setPoSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <select
                value={poStatusFilter}
                onChange={(e) => setPoStatusFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Statuses</option>
                <option value="DRAFT">DRAFT</option>
                <option value="PENDING_APPROVAL">PENDING APPROVAL</option>
                <option value="APPROVED">APPROVED</option>
                <option value="PARTIALLY_RECEIVED">PARTIALLY RECEIVED</option>
                <option value="FULLY_RECEIVED">FULLY RECEIVED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>
            <button
              onClick={() => {
                setPoForm({
                  ...defaultPoForm(),
                  supplierId: '',
                  items: [{ productId: '', quantity: 1, unitCost: 0, taxRate: 18 }],
                });
                setItemSearches({});
                setShowPoModal(true);
              }}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Create Purchase Order</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">PO Number</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Order Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingPos ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">Loading purchase orders...</td>
                  </tr>
                ) : purchaseOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">No purchase orders found.</td>
                  </tr>
                ) : (
                  purchaseOrders.map((po) => (
                    <tr key={po.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900">{po.poNumber}</td>
                      <td className="py-3 px-4 text-slate-700">
                        {po.supplier?.name || 'Unknown Supplier'}
                        <div className="text-xs text-slate-400">{po.supplier?.supplierCode}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{new Date(po.orderDate).toLocaleDateString()}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${PO_STATUS_COLORS[po.status] || 'bg-slate-100 text-slate-600'}`}>
                          {po.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-900">
                        ₹{Number(po.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button onClick={() => setSelectedPo(po)} className="p-1.5 text-slate-600 hover:text-indigo-600 rounded-lg hover:bg-slate-100" title="View Details">
                            <Eye className="w-4 h-4" />
                          </button>
                          {po.status === 'DRAFT' && (
                            <button onClick={() => handleSubmitPo(po.id)} className="px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200">
                              Submit
                            </button>
                          )}
                          {po.status === 'PENDING_APPROVAL' && canApprovePo && (
                            <button onClick={() => handleApprovePo(po.id)} className="px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200">
                              Approve
                            </button>
                          )}
                          {(po.status === 'DRAFT' || po.status === 'APPROVED') && (
                            <button onClick={() => handleCancelPo(po.id)} className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg" title="Cancel PO">
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB: GOODS RECEIPTS ──────────────────────────────────────────────── */}
      {activeTab === 'receipts' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search GRN number..."
                value={grnSearch}
                onChange={(e) => setGrnSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              onClick={() => setShowGrnModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
            >
              <PackageCheck className="w-4 h-4" />
              <span>Create Goods Receipt</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">GRN Number</th>
                  <th className="py-3 px-4">PO Number</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Receipt Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Items Received</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingReceipts ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">Loading goods receipts...</td>
                  </tr>
                ) : receipts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">No goods receipts found.</td>
                  </tr>
                ) : (
                  receipts.map((grn) => {
                    const isPosted = grn.status === 'POSTED';
                    return (
                      <tr key={grn.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900">{grn.grnNumber}</td>
                        <td className="py-3 px-4 font-medium text-slate-700">{grn.purchaseOrder?.poNumber || 'N/A'}</td>
                        <td className="py-3 px-4 text-slate-600">{grn.purchaseOrder?.supplier?.name || 'N/A'}</td>
                        <td className="py-3 px-4 text-slate-600">{new Date(grn.receiptDate).toLocaleDateString()}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${isPosted ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-amber-50 text-amber-700 border-amber-300'}`}>
                            {grn.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-medium">
                          {grn.items?.reduce((sum, i) => sum + i.receivedQuantity, 0) || 0} units
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => setSelectedGrn(grn)} className="p-1.5 text-slate-600 hover:text-indigo-600 rounded-lg hover:bg-slate-100" title="View Details">
                              <Eye className="w-4 h-4" />
                            </button>
                            {!isPosted && canPostGrn && (
                              <button onClick={() => handlePostExistingGrn(grn.id)} className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200">
                                Post &amp; Add Stock
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB: SUPPLIERS ───────────────────────────────────────────────────── */}
      {activeTab === 'suppliers' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search supplier by name, code, phone, email, GSTIN..."
                  value={supplierSearch}
                  onChange={(e) => setSupplierSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <select
                value={supplierStatusFilter}
                onChange={(e) => setSupplierStatusFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
            <button
              onClick={handleOpenAddSupplier}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Supplier</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Supplier Name</th>
                  <th className="py-3 px-4">Supplied Products</th>
                  <th className="py-3 px-4">Contact Person</th>
                  <th className="py-3 px-4">Phone &amp; Email</th>
                  <th className="py-3 px-4">GSTIN</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingSuppliers ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">Loading suppliers...</td>
                  </tr>
                ) : suppliers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">No suppliers found.</td>
                  </tr>
                ) : (
                  suppliers.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-800">{s.supplierCode}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{s.name}</div>
                        {s.legalName && <div className="text-xs text-slate-400">{s.legalName}</div>}
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        {s.products && s.products.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-1">
                            {s.products.slice(0, 2).map((prod) => (
                              <span
                                key={prod.id}
                                className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-indigo-50/70 text-indigo-800 border border-indigo-200/60 truncate max-w-[130px]"
                                title={`${prod.name} (${prod.sku})`}
                              >
                                {prod.name}
                              </span>
                            ))}
                            {s.products.length > 2 && (
                              <span
                                className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 cursor-help"
                                title={s.products.map((p) => `• ${p.name} (${p.sku})`).join('\n')}
                              >
                                +{s.products.length - 2} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">None linked</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{s.contactPerson || '—'}</td>
                      <td className="py-3 px-4 text-slate-600">
                        <div>{s.phone || '—'}</div>
                        <div className="text-xs text-slate-400">{s.email || ''}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-700">{s.gstin || '—'}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${s.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-slate-100 text-slate-600 border-slate-300'}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setEditingSupplier(s);
                              setSupplierProductSearch('');
                              setSupplierForm({
                                supplierCode: s.supplierCode,
                                name: s.name,
                                legalName: s.legalName || '',
                                contactPerson: s.contactPerson || '',
                                phone: s.phone || '',
                                email: s.email || '',
                                address: s.address || '',
                                city: s.city || '',
                                state: s.state || '',
                                pincode: s.pincode || '',
                                gstin: s.gstin || '',
                                pan: s.pan || '',
                                paymentTerms: s.paymentTerms || '',
                                notes: s.notes || '',
                                status: s.status,
                                productIds: s.productIds || s.products?.map((p) => p.id) || [],
                              });
                              setShowSupplierModal(true);
                            }}
                            className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleToggleSupplierStatus(s)}
                            className={`px-2.5 py-1 text-xs font-medium rounded-lg border cursor-pointer ${s.status === 'ACTIVE' ? 'text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100' : 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'}`}
                          >
                            {s.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── DRAWER: ADD / EDIT SUPPLIER ───────────────────────────────────────── */}
      <Drawer
        isOpen={showSupplierModal}
        onClose={() => {
          setShowSupplierModal(false);
          setEditingSupplier(null);
        }}
        title={
          <div>
            <div className="text-base font-bold text-slate-900 leading-tight">
              {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
            </div>
            <p className="text-xs text-slate-500 font-normal mt-0.5">
              {editingSupplier
                ? 'Update vendor details, contact person, or GST information'
                : 'Register a new vendor in the procurement database'}
            </p>
          </div>
        }
        maxWidth="lg"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <button
              type="button"
              onClick={() => {
                setShowSupplierModal(false);
                setEditingSupplier(null);
              }}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="supplier-drawer-form"
              disabled={createSupplier.isPending || updateSupplier.isPending}
              className="px-5 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl shadow-sm transition-colors cursor-pointer"
            >
              {createSupplier.isPending || updateSupplier.isPending
                ? 'Saving...'
                : editingSupplier
                ? 'Save Changes'
                : 'Create Supplier'}
            </button>
          </div>
        }
      >
        <form id="supplier-drawer-form" onSubmit={handleSaveSupplier} className="flex flex-col gap-5 py-1">
          {/* Section: Basic Details */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Basic Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Supplier Code (Auto if blank)
                  </label>
                  {!editingSupplier && (
                    <span className="text-[10px] text-indigo-600 bg-indigo-50 font-medium px-1.5 py-0.5 rounded">
                      Auto-generated
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={supplierForm.supplierCode}
                  onChange={(e) => setSupplierForm({ ...supplierForm, supplierCode: e.target.value })}
                  placeholder="e.g. SUP-0001"
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Supplier Name *
                </label>
                <input
                  type="text"
                  required
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                  placeholder="Company or Business Name"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Legal / Registered Name
                </label>
                <input
                  type="text"
                  value={supplierForm.legalName}
                  onChange={(e) => setSupplierForm({ ...supplierForm, legalName: e.target.value })}
                  placeholder="Official entity name"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contact Person
                </label>
                <input
                  type="text"
                  value={supplierForm.contactPerson}
                  onChange={(e) => setSupplierForm({ ...supplierForm, contactPerson: e.target.value })}
                  placeholder="Key account manager / representative"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Section: Contact & Tax Information */}
          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Contact &amp; Tax Identifiers
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={supplierForm.phone}
                  onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                  placeholder="+91..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={supplierForm.email}
                  onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                  placeholder="vendor@company.com"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  GSTIN
                </label>
                <input
                  type="text"
                  value={supplierForm.gstin}
                  onChange={(e) => setSupplierForm({ ...supplierForm, gstin: e.target.value.toUpperCase() })}
                  placeholder="15-character GSTIN"
                  className="w-full px-3 py-2 text-sm font-mono uppercase border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  PAN
                </label>
                <input
                  type="text"
                  value={supplierForm.pan}
                  onChange={(e) => setSupplierForm({ ...supplierForm, pan: e.target.value.toUpperCase() })}
                  placeholder="10-character PAN"
                  className="w-full px-3 py-2 text-sm font-mono uppercase border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Section: Address Details */}
          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Location &amp; Address
            </h4>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Street Address
                </label>
                <textarea
                  rows={2}
                  value={supplierForm.address}
                  onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                  placeholder="Street address, unit, industrial area..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={supplierForm.city}
                    onChange={(e) => setSupplierForm({ ...supplierForm, city: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={supplierForm.state}
                    onChange={(e) => setSupplierForm({ ...supplierForm, state: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pincode
                  </label>
                  <input
                    type="text"
                    value={supplierForm.pincode}
                    onChange={(e) => setSupplierForm({ ...supplierForm, pincode: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section: Terms & Notes */}
          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Commercial Terms &amp; Notes
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payment Terms
                </label>
                <input
                  type="text"
                  value={supplierForm.paymentTerms}
                  onChange={(e) => setSupplierForm({ ...supplierForm, paymentTerms: e.target.value })}
                  placeholder="e.g. Net 30 Days, 50% Advance"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Internal Notes
                </label>
                <input
                  type="text"
                  value={supplierForm.notes}
                  onChange={(e) => setSupplierForm({ ...supplierForm, notes: e.target.value })}
                  placeholder="Delivery terms, special vendor agreements..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Section: Authorized / Supplied Products */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Supplied Products / Inventory Catalog
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Select the products from inventory that this vendor can supply.
                </p>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                {supplierForm.productIds.length} Selected
              </span>
            </div>

            {/* Search & Quick Controls */}
            <div className="flex items-center gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search inventory products by name, SKU, or category..."
                  value={supplierProductSearch}
                  onChange={(e) => setSupplierProductSearch(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {supplierProductSearch && (
                  <button
                    type="button"
                    onClick={() => setSupplierProductSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  const filteredIds = availableProducts
                    .filter((p) => {
                      const q = supplierProductSearch.toLowerCase();
                      return (
                        !q ||
                        p.name.toLowerCase().includes(q) ||
                        p.sku.toLowerCase().includes(q) ||
                        (p.category && p.category.toLowerCase().includes(q))
                      );
                    })
                    .map((p) => p.id);
                  const combined = Array.from(new Set([...supplierForm.productIds, ...filteredIds]));
                  setSupplierForm({ ...supplierForm, productIds: combined });
                }}
                className="px-2.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl border border-indigo-200 transition-colors whitespace-nowrap cursor-pointer"
              >
                Select All
              </button>
              {supplierForm.productIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSupplierForm({ ...supplierForm, productIds: [] })}
                  className="px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 transition-colors whitespace-nowrap cursor-pointer"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Selected Products Chips */}
            {supplierForm.productIds.length > 0 && (
              <div className="mb-3 p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl">
                <div className="text-[11px] font-semibold text-slate-600 mb-1.5 flex items-center justify-between">
                  <span>Currently Linked Products ({supplierForm.productIds.length}):</span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                  {supplierForm.productIds.map((pId) => {
                    const prod = availableProducts.find((p) => p.id === pId);
                    return (
                      <span
                        key={pId}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium bg-white text-slate-800 border border-slate-200 shadow-2xs"
                      >
                        <span className="font-semibold text-indigo-600">{prod?.name || 'Product'}</span>
                        {prod?.sku && <span className="text-[10px] text-slate-400 font-mono">({prod.sku})</span>}
                        <button
                          type="button"
                          onClick={() =>
                            setSupplierForm({
                              ...supplierForm,
                              productIds: supplierForm.productIds.filter((id) => id !== pId),
                            })
                          }
                          className="text-slate-400 hover:text-rose-600 cursor-pointer ml-0.5"
                          title="Remove product"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Inventory Products Checklist */}
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto divide-y divide-slate-100 bg-white">
              {availableProducts.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">No inventory products found</div>
              ) : (
                availableProducts
                  .filter((p) => {
                    const q = supplierProductSearch.toLowerCase();
                    return (
                      !q ||
                      p.name.toLowerCase().includes(q) ||
                      p.sku.toLowerCase().includes(q) ||
                      (p.category && p.category.toLowerCase().includes(q))
                    );
                  })
                  .map((prod) => {
                    const isSelected = supplierForm.productIds.includes(prod.id);
                    return (
                      <label
                        key={prod.id}
                        className={`flex items-center justify-between p-2.5 hover:bg-slate-50 cursor-pointer transition-colors ${
                          isSelected ? 'bg-indigo-50/40' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSupplierForm({
                                  ...supplierForm,
                                  productIds: [...supplierForm.productIds, prod.id],
                                });
                              } else {
                                setSupplierForm({
                                  ...supplierForm,
                                  productIds: supplierForm.productIds.filter((id) => id !== prod.id),
                                });
                              }
                            }}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-slate-900 truncate">
                              {prod.name}
                            </div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-2">
                              <span className="font-mono text-slate-400">SKU: {prod.sku}</span>
                              {prod.category && (
                                <span className="px-1.5 py-0.2 bg-slate-100 rounded text-slate-600 font-medium">
                                  {prod.category}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-xs font-semibold text-slate-700 font-mono">
                            ₹{Number(prod.price || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </label>
                    );
                  })
              )}
            </div>
          </div>
        </form>
      </Drawer>

      {/* ── MODAL: CREATE PURCHASE ORDER ─────────────────────────────────────── */}
      {showPoModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowPoModal(false);
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-100 overflow-hidden my-8"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Create Purchase Order</h3>
                <p className="text-xs text-slate-500">Initial status will be DRAFT. Stock is never affected by PO creation.</p>
              </div>
              <button onClick={() => setShowPoModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSavePo} className="p-6 flex flex-col gap-5">
              {poForm.notes && poForm.notes.includes('Sales Order') && (
                <div className="flex items-start gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-amber-900">Sales Order Stock Shortage Fulfillment</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      This purchase order was initiated from a Sales Order to purchase required stock deficit. Items and quantities have been pre-filled.
                    </p>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier *</label>
                  <select
                    required
                    value={poForm.supplierId}
                    onChange={(e) => {
                      const newSupplierId = e.target.value;
                      const newSupplier = (allActiveSuppliers.length ? allActiveSuppliers : suppliers).find(
                        (s) => s.id === newSupplierId
                      );
                      const allowedIds = new Set<string>([
                        ...(newSupplier?.productIds || []),
                        ...(newSupplier?.products?.map((p) => p.id) || []),
                      ]);
                      const updatedItems = poForm.items.map((it) => {
                        if (it.productId && !allowedIds.has(it.productId)) {
                          return { ...it, productId: '', unitCost: 0 };
                        }
                        return it;
                      });
                      setItemSearches({});
                      setPoForm({ ...poForm, supplierId: newSupplierId, items: updatedItems });
                    }}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select Supplier</option>
                    {(allActiveSuppliers.length ? allActiveSuppliers : suppliers.filter((s) => s.status === 'ACTIVE')).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.supplierCode})
                        {s.products && s.products.length > 0 ? ` — ${s.products.length} Products` : ' — No products linked'}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Expected Delivery Date</label>
                  <input
                    type="date"
                    value={poForm.expectedDeliveryDate}
                    onChange={(e) => setPoForm({ ...poForm, expectedDeliveryDate: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Procurement Notes / Reference</label>
                <input
                  type="text"
                  placeholder="e.g. Procurement to fulfill stock shortage for Sales Order SO-..."
                  value={poForm.notes}
                  onChange={(e) => setPoForm({ ...poForm, notes: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Items Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-700">Line Items *</label>
                  <button
                    type="button"
                    onClick={() =>
                      setPoForm({
                        ...poForm,
                        items: [
                          ...poForm.items,
                          { productId: '', quantity: 1, unitCost: 0, taxRate: 18 },
                        ],
                      })
                    }
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> <span>Add Item</span>
                  </button>
                </div>

                {/* Empty products notice */}
                {availableProducts.length === 0 ? (
                  <div className="flex items-start gap-3 p-3 mb-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-amber-800">No products in inventory</p>
                      <p className="text-xs text-amber-700 mt-0.5">
                        You need to add at least one product before creating a purchase order.
                      </p>
                    </div>
                    {canManageProducts && (
                      <button
                        type="button"
                        onClick={() => setShowAddProductModal(true)}
                        className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        Add Product
                      </button>
                    )}
                  </div>
                ) : !poForm.supplierId ? (
                  <div className="flex items-start gap-3 p-3 mb-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <Info className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-700">Please select a supplier</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Choose a supplier above to display and select the products available from that vendor.
                      </p>
                    </div>
                  </div>
                ) : supplierAvailableProducts.length === 0 ? (
                  <div className="flex items-start gap-3 p-3 mb-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-amber-800">
                        No products linked to {selectedSupplier?.name || 'this supplier'}
                      </p>
                      <p className="text-xs text-amber-700 mt-0.5">
                        This supplier does not have any products linked in their catalog. You can link products in the Suppliers tab by editing this supplier.
                      </p>
                    </div>
                  </div>
                ) : null}

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-700 font-semibold text-xs border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 min-w-[320px]">Product &amp; Search ({selectedSupplier ? `${selectedSupplier.name}'s Catalog` : 'Supplier Catalog'})</th>
                        <th className="py-2.5 px-3 w-20">Qty</th>
                        <th className="py-2.5 px-3 w-28">Unit Cost (₹)</th>
                        <th className="py-2.5 px-3 w-20">Tax (%)</th>
                        <th className="py-2.5 px-3 w-28 text-right">Line Total (₹)</th>
                        <th className="py-2.5 px-3 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {poForm.items.map((item, idx) => {
                        const sub = item.quantity * item.unitCost;
                        const tax = sub * ((item.taxRate || 0) / 100);
                        const total = sub + tax;

                        const itemSearchTerm = (itemSearches[idx] || '').trim().toLowerCase();
                        const filteredProducts = itemSearchTerm
                          ? supplierAvailableProducts.filter(
                              (p) =>
                                p.name.toLowerCase().includes(itemSearchTerm) ||
                                p.sku.toLowerCase().includes(itemSearchTerm) ||
                                (p.category && p.category.toLowerCase().includes(itemSearchTerm))
                            )
                          : supplierAvailableProducts;

                        return (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3 min-w-[320px] align-top">
                              <div className="flex flex-col gap-1.5">
                                {/* Search input alongside dropdown */}
                                <div className="relative">
                                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                  <input
                                    type="text"
                                    disabled={!poForm.supplierId || supplierAvailableProducts.length === 0}
                                    placeholder={
                                      !poForm.supplierId
                                        ? 'Select supplier first...'
                                        : supplierAvailableProducts.length === 0
                                        ? 'No products available...'
                                        : 'Type to search product or SKU...'
                                    }
                                    value={itemSearches[idx] || ''}
                                    onChange={(e) =>
                                      setItemSearches((prev) => ({ ...prev, [idx]: e.target.value }))
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        if (filteredProducts.length === 1) {
                                          const matchedProd = filteredProducts[0];
                                          const items = [...poForm.items];
                                          items[idx].productId = matchedProd.id;

                                          const rawPrice = (matchedProd as any)?.price;
                                          const parsedPrice =
                                            typeof rawPrice === 'number'
                                              ? rawPrice
                                              : parseFloat(String(rawPrice || 0));
                                          items[idx].unitCost = !isNaN(parsedPrice) && parsedPrice >= 0 ? parsedPrice : 0;

                                          const rawGst = (matchedProd as any)?.gstRate;
                                          const parsedGst =
                                            typeof rawGst === 'number'
                                              ? rawGst
                                              : parseFloat(String(rawGst || ''));
                                          if (!isNaN(parsedGst) && parsedGst >= 0) {
                                            items[idx].taxRate = parsedGst;
                                          }

                                          setPoForm({ ...poForm, items });
                                        }
                                      }
                                    }}
                                    className="w-full pl-8 pr-7 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-400 placeholder:text-slate-400 bg-white"
                                  />
                                  {itemSearches[idx] && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setItemSearches((prev) => {
                                          const next = { ...prev };
                                          delete next[idx];
                                          return next;
                                        })
                                      }
                                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                                      title="Clear search filter"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>

                                {/* Product Dropdown Select */}
                                <select
                                  required
                                  disabled={!poForm.supplierId || supplierAvailableProducts.length === 0}
                                  value={item.productId}
                                  onChange={(e) => {
                                    const prodId = e.target.value;
                                    const items = [...poForm.items];
                                    items[idx].productId = prodId;

                                    const matchedProd =
                                      supplierAvailableProducts.find((p) => p.id === prodId) ||
                                      availableProducts.find((p) => p.id === prodId) ||
                                      selectedSupplier?.products?.find((p) => p.id === prodId);

                                    if (matchedProd) {
                                      const rawPrice = (matchedProd as any)?.price;
                                      const parsedPrice =
                                        typeof rawPrice === 'number'
                                          ? rawPrice
                                          : parseFloat(String(rawPrice || 0));
                                      items[idx].unitCost = !isNaN(parsedPrice) && parsedPrice >= 0 ? parsedPrice : 0;

                                      const rawGst = (matchedProd as any)?.gstRate;
                                      const parsedGst =
                                        typeof rawGst === 'number'
                                          ? rawGst
                                          : parseFloat(String(rawGst || ''));
                                      if (!isNaN(parsedGst) && parsedGst >= 0) {
                                        items[idx].taxRate = parsedGst;
                                      }
                                    } else if (!prodId) {
                                      items[idx].unitCost = 0;
                                    }
                                    setPoForm({ ...poForm, items });
                                  }}
                                  className={`w-full py-1.5 px-2 text-xs font-medium border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 ${
                                    !poForm.supplierId || supplierAvailableProducts.length === 0
                                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                      : 'bg-white text-slate-800'
                                  }`}
                                >
                                  {!poForm.supplierId ? (
                                    <option value="">Select Supplier first…</option>
                                  ) : supplierAvailableProducts.length === 0 ? (
                                    <option value="">No products available for this supplier</option>
                                  ) : itemSearchTerm && filteredProducts.length === 0 ? (
                                    <option value="">No products matching "{itemSearches[idx]}"</option>
                                  ) : (
                                    <option value="">
                                      Select Product…{' '}
                                      {itemSearchTerm
                                        ? `(${filteredProducts.length} matches)`
                                        : `(${supplierAvailableProducts.length} available)`}
                                    </option>
                                  )}
                                  {item.productId && !filteredProducts.some((p) => p.id === item.productId) && (
                                    <option value={item.productId}>
                                      {supplierAvailableProducts.find((p) => p.id === item.productId)?.name ||
                                        navState?.shortages?.find((s) => s.productId === item.productId)?.productName ||
                                        'Selected Product'}{' '}
                                      (Selected)
                                    </option>
                                  )}
                                  {filteredProducts.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.name} ({p.sku})
                                    </option>
                                  ))}
                                </select>

                                {item.productId && selectedSupplier && (
                                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60 w-fit">
                                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                                    <span>Available from {selectedSupplier.name}</span>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 align-top">
                              <input
                                type="number"
                                min="1"
                                required
                                value={item.quantity}
                                onChange={(e) => {
                                  const items = [...poForm.items];
                                  items[idx].quantity = Math.max(1, parseInt(e.target.value) || 1);
                                  setPoForm({ ...poForm, items });
                                }}
                                className="w-full py-1.5 px-2 text-xs border border-slate-200 rounded-lg text-center font-medium"
                              />
                            </td>
                            <td className="py-2.5 px-3 align-top">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                required
                                value={item.unitCost}
                                onChange={(e) => {
                                  const items = [...poForm.items];
                                  items[idx].unitCost = Math.max(0, parseFloat(e.target.value) || 0);
                                  setPoForm({ ...poForm, items });
                                }}
                                className="w-full py-1.5 px-2 text-xs border border-slate-200 rounded-lg text-right font-mono"
                              />
                            </td>
                            <td className="py-2.5 px-3 align-top">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={item.taxRate}
                                onChange={(e) => {
                                  const items = [...poForm.items];
                                  items[idx].taxRate = parseFloat(e.target.value) || 0;
                                  setPoForm({ ...poForm, items });
                                }}
                                className="w-full py-1.5 px-2 text-xs border border-slate-200 rounded-lg text-center font-mono"
                              />
                            </td>
                            <td className="py-2.5 px-3 text-right font-medium text-slate-800 align-top pt-3 font-mono">
                              ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-3 text-center align-top pt-3">
                              {poForm.items.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPoForm({ ...poForm, items: poForm.items.filter((_, i) => i !== idx) });
                                    setItemSearches((prev) => {
                                      const next: Record<number, string> = {};
                                      Object.keys(prev).forEach((k) => {
                                        const keyNum = parseInt(k, 10);
                                        if (keyNum < idx) next[keyNum] = prev[keyNum];
                                        else if (keyNum > idx) next[keyNum - 1] = prev[keyNum];
                                      });
                                      return next;
                                    });
                                  }}
                                  className="text-slate-400 hover:text-rose-500 cursor-pointer"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              {(() => {
                const subtotal = poForm.items.reduce((s, i) => s + i.quantity * i.unitCost, 0);
                const tax = poForm.items.reduce((s, i) => s + i.quantity * i.unitCost * ((i.taxRate || 0) / 100), 0);
                return (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col gap-1 text-sm self-end w-full sm:w-72">
                    <div className="flex justify-between text-slate-600"><span>Subtotal:</span><span>₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                    <div className="flex justify-between text-slate-600"><span>Tax Amount:</span><span>₹{tax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                    <div className="flex justify-between text-base font-bold text-slate-900 border-t border-slate-200 pt-1 mt-1"><span>Grand Total:</span><span>₹{(subtotal + tax).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                  </div>
                );
              })()}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowPoModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
                <button type="submit" disabled={createPo.isPending} className="px-5 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl shadow-sm">
                  Save PO Draft
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: VIEW PO DETAILS ───────────────────────────────────────────── */}
      {selectedPo && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedPo(null);
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-100 overflow-hidden my-8"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-lg">{selectedPo.poNumber}</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">{selectedPo.status}</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ordered from {selectedPo.supplier?.name} on {new Date(selectedPo.orderDate).toLocaleDateString()}
                </p>
              </div>
              <button onClick={() => setSelectedPo(null)} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 flex flex-col gap-6">
              {/* Action banner */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-sm">
                  <div className="text-xs text-slate-500 font-semibold uppercase">Approval Status</div>
                  <div className="text-slate-800 mt-0.5">
                    {selectedPo.approvedByUser ? (
                      <span className="text-emerald-700 font-medium">Approved by {selectedPo.approvedByUser.fullName} on {selectedPo.approvedAt ? new Date(selectedPo.approvedAt).toLocaleDateString() : ''}</span>
                    ) : (
                      <span className="text-amber-700 font-medium">Pending Approval</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedPo.status === 'DRAFT' && (
                    <button onClick={() => handleSubmitPo(selectedPo.id)} className="px-4 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm">Submit for Approval</button>
                  )}
                  {selectedPo.status === 'PENDING_APPROVAL' && canApprovePo && (
                    <button onClick={() => handleApprovePo(selectedPo.id)} className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm">Approve Purchase Order</button>
                  )}
                  {(selectedPo.status === 'APPROVED' || selectedPo.status === 'PARTIALLY_RECEIVED') && (
                    <button
                      onClick={() => {
                        handlePoSelectForGrn(selectedPo.id);
                        setSelectedPo(null);
                        setActiveTab('receipts');
                        setShowGrnModal(true);
                      }}
                      className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
                    >
                      Receive Goods (GRN)
                    </button>
                  )}
                </div>
              </div>

              {/* Items */}
              <div>
                <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Ordered Items &amp; Receipt Tracking</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-700 font-semibold text-xs border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Product Name</th>
                        <th className="py-2.5 px-3 text-center">Ordered</th>
                        <th className="py-2.5 px-3 text-center">Received</th>
                        <th className="py-2.5 px-3 text-center">Remaining</th>
                        <th className="py-2.5 px-3 text-right">Unit Cost</th>
                        <th className="py-2.5 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedPo.items?.map((item) => {
                        const remaining = item.quantity - (item.receivedQuantity || 0);
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/50">
                            <td className="py-2 px-3">
                              <div className="font-semibold text-slate-900">{item.productNameSnapshot}</div>
                              {item.skuSnapshot && <div className="text-xs text-slate-400">{item.skuSnapshot}</div>}
                            </td>
                            <td className="py-2 px-3 text-center font-medium text-slate-700">{item.quantity}</td>
                            <td className="py-2 px-3 text-center font-medium text-emerald-700">{item.receivedQuantity || 0}</td>
                            <td className="py-2 px-3 text-center font-medium text-amber-700">{remaining}</td>
                            <td className="py-2 px-3 text-right text-slate-600">₹{Number(item.unitCost).toFixed(2)}</td>
                            <td className="py-2 px-3 text-right font-medium text-slate-900">₹{Number(item.lineTotal).toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col gap-1 text-sm self-end w-full sm:w-72">
                <div className="flex justify-between text-slate-600"><span>Subtotal:</span><span>₹{Number(selectedPo.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                <div className="flex justify-between text-slate-600"><span>Tax Amount:</span><span>₹{Number(selectedPo.taxAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                <div className="flex justify-between text-base font-bold text-slate-900 border-t border-slate-200 pt-1 mt-1"><span>Total Amount:</span><span>₹{Number(selectedPo.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CREATE GOODS RECEIPT ──────────────────────────────────────── */}
      {showGrnModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowGrnModal(false);
              setGrnSelectedPo(null);
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-100 overflow-hidden my-8"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Goods Receipt / GRN</h3>
                <p className="text-xs text-slate-500">Physical goods arrival tracking. Posting this GRN will call StockService to atomically increase stock.</p>
              </div>
              <button onClick={() => { setShowGrnModal(false); setGrnSelectedPo(null); }} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveGrn} className="p-6 flex flex-col gap-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Select Approved PO *</label>
                  <select required value={grnForm.purchaseOrderId} onChange={(e) => handlePoSelectForGrn(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500">
                    <option value="">Select Purchase Order</option>
                    {purchaseOrders.filter((p) => p.status === 'APPROVED' || p.status === 'PARTIALLY_RECEIVED').map((p) => (
                      <option key={p.id} value={p.id}>{p.poNumber} — {p.supplier?.name} ({p.status})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Receipt Date *</label>
                  <input type="date" required value={grnForm.receiptDate} onChange={(e) => setGrnForm({ ...grnForm, receiptDate: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>

              {grnSelectedPo && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Receiving Quantities (Strictly bounded by remaining quantity)</label>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-slate-700 font-semibold text-xs border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Product</th>
                          <th className="py-2.5 px-3 text-center">Remaining</th>
                          <th className="py-2.5 px-3 text-center w-36">Current Receipt</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {grnForm.items.map((item, idx) => (
                          <tr key={item.purchaseOrderItemId} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3"><span className="font-semibold text-slate-900">{item.productName}</span></td>
                            <td className="py-2.5 px-3 text-center font-medium text-amber-700">{item.maxAllowed} units</td>
                            <td className="py-2.5 px-3 text-center">
                              <input type="number" min="1" max={item.maxAllowed} required value={item.receivedQuantity}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0;
                                  const newItems = [...grnForm.items];
                                  newItems[idx].receivedQuantity = val;
                                  setGrnForm({ ...grnForm, items: newItems });
                                }}
                                className="w-24 py-1 px-2 text-sm font-semibold border border-slate-200 rounded-lg text-center focus:ring-2 focus:ring-indigo-500"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Receipt Notes / Challan No.</label>
                <textarea rows={2} value={grnForm.notes} onChange={(e) => setGrnForm({ ...grnForm, notes: e.target.value })} placeholder="e.g. Received via Blue Dart challan #8890, all items verified intact." className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl" />
              </div>

              <div className="flex items-center gap-2 p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-900">
                <input type="checkbox" id="autoPostCheckbox" checked={grnForm.autoPost} onChange={(e) => setGrnForm({ ...grnForm, autoPost: e.target.checked })} className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                <label htmlFor="autoPostCheckbox" className="font-medium cursor-pointer">Post immediately and update stock ledger (adds inventory atomically via StockService)</label>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowGrnModal(false); setGrnSelectedPo(null); }} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
                <button type="submit" disabled={!grnSelectedPo || grnForm.items.length === 0 || createGrn.isPending} className="px-5 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl shadow-sm">
                  {grnForm.autoPost ? 'Post Goods Receipt & Update Stock' : 'Save Draft GRN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: VIEW GRN DETAILS ──────────────────────────────────────────── */}
      {selectedGrn && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedGrn(null);
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden my-8"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-lg">{selectedGrn.grnNumber}</h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${selectedGrn.status === 'POSTED' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-amber-50 text-amber-700 border-amber-300'}`}>
                    {selectedGrn.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Receipt against PO {selectedGrn.purchaseOrder?.poNumber} on {new Date(selectedGrn.receiptDate).toLocaleDateString()}
                </p>
              </div>
              <button onClick={() => setSelectedGrn(null)} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-slate-400 font-semibold uppercase">Supplier</div>
                    <div className="font-semibold text-slate-900">{selectedGrn.purchaseOrder?.supplier?.name || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 font-semibold uppercase">Received By</div>
                    <div className="font-semibold text-slate-900">{selectedGrn.receivedByUser?.fullName || 'N/A'}</div>
                  </div>
                </div>
                {selectedGrn.notes && (
                  <div className="mt-3 pt-3 border-t border-slate-200 text-xs text-slate-600">
                    <span className="font-semibold">Notes:</span> {selectedGrn.notes}
                  </div>
                )}
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Received Items Summary</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-700 font-semibold text-xs border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Product</th>
                        <th className="py-2.5 px-3 text-center">Ordered</th>
                        <th className="py-2.5 px-3 text-center">Previously Received</th>
                        <th className="py-2.5 px-3 text-center font-bold text-emerald-700">Received in this GRN</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedGrn.items?.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3 font-semibold text-slate-900">{item.product?.name || item.purchaseOrderItem?.productNameSnapshot || 'Product'}</td>
                          <td className="py-2 px-3 text-center text-slate-600">{item.orderedQuantity}</td>
                          <td className="py-2 px-3 text-center text-slate-600">{item.previouslyReceivedQuantity || 0}</td>
                          <td className="py-2 px-3 text-center font-bold text-emerald-700">+{item.receivedQuantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {selectedGrn.status === 'POSTED' && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
                  <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Stock movements committed to ledger under referenceType <strong>PURCHASE_RECEIPT</strong>.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* ── MODAL: QUICK-ADD PRODUCT ──────────────────────────────────────────── */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-100 overflow-hidden my-8">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Add New Product to Inventory</h3>
                <p className="text-xs text-slate-500">This product will be available in the purchase order line items.</p>
              </div>
              <button onClick={() => setShowAddProductModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <ProductForm
                onSuccess={() => setShowAddProductModal(false)}
                onCancel={() => setShowAddProductModal(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
