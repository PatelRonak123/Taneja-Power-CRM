import React, { useState, useEffect, useCallback } from 'react';
import { customerEquipmentService } from '../services/customerEquipmentService';
import type {
  CustomerEquipment,
  CustomerEquipmentCondition,
  CustomerEquipmentAssetStatus,
  CreateManualCustomerEquipmentPayload,
} from '../types/customer-equipment.types';
import { navigate } from '../../../app/router/navigation';
import { useAuthStore } from '../../../stores/authStore';
import { toast } from '../../../utils/toast';
import { customerService } from '../../customers/services/customerService';
import { productService } from '../../products/services/productService';
import type { Customer } from '../../customers/types/customer.types';
import type { Product } from '../../products/types/product.types';
import { TablePagination } from '../../../components/ui/table';
import {
  Cpu,
  Eye,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Building2,
  Package,
  Plus,
  X,
  Loader2,
  Wrench,
  Calendar, 
  Search,
} from 'lucide-react';

export const CustomerEquipmentListPage: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  const isManager = user?.role === 'MANAGER';
  const canCreateManual = isAdmin || isManager;

  const [equipmentList, setEquipmentList] = useState<CustomerEquipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [conditionFilter, setConditionFilter] = useState('');
  const [assetStatusFilter, setAssetStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Manual Creation Modal
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [submittingManual, setSubmittingManual] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [manualForm, setManualForm] = useState<CreateManualCustomerEquipmentPayload>({
    customerId: '',
    productId: '',
    productName: '',
    sku: '',
    model: '',
    make: '',
    capacityRating: '',
    serialNumber: '',
    installationLocation: '',
    installationNotes: '',
    conditionStatus: 'OPERATIONAL',
    assetStatus: 'ACTIVE',
  });

  const fetchEquipment = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await customerEquipmentService.listEquipment({
        page,
        limit: 10,
        search: search.trim() || undefined,
        conditionStatus: conditionFilter || undefined,
        assetStatus: assetStatusFilter || undefined,
      });

      setEquipmentList(res.data || []);
      if (res.meta) {
        setTotalPages(res.meta.totalPages || 1);
        setTotalCount(res.meta.total || 0);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch customer equipment');
      toast.error('Error fetching customer equipment', err?.message);
    } finally {
      setLoading(false);
    }
  }, [page, search, conditionFilter, assetStatusFilter]);

  useEffect(() => {
    fetchEquipment();
  }, [fetchEquipment]);

  // Load prerequisites for modal if opened
  useEffect(() => {
    if (isManualModalOpen && customers.length === 0) {
      Promise.all([
        customerService.getCustomers({ limit: 100 }),
        productService.getProducts({ limit: 100 }),
      ])
        .then(([custRes, prodRes]) => {
          if (custRes.data) setCustomers(custRes.data);
          if (prodRes.data) setProducts(prodRes.data);
        })
        .catch(() => {});
    }
  }, [isManualModalOpen, customers.length]);

  const handleManualProductChange = (productId: string) => {
    const selected = products.find((p) => p.id === productId);
    setManualForm((prev) => ({
      ...prev,
      productId,
      productName: selected ? selected.name : prev.productName,
      sku: selected?.sku || prev.sku,
      model: prev.model,
      make: prev.make,
      capacityRating: prev.capacityRating,
    }));
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.customerId || !manualForm.productId || !manualForm.productName) {
      toast.error('Validation Error', 'Customer, Product, and Product Name are required');
      return;
    }

    try {
      setSubmittingManual(true);
      await customerEquipmentService.createManualEquipment(manualForm);
      toast.success('Equipment registered', 'Manual legacy asset registered successfully');
      setIsManualModalOpen(false);
      setManualForm({
        customerId: '',
        productId: '',
        productName: '',
        sku: '',
        model: '',
        make: '',
        capacityRating: '',
        serialNumber: '',
        installationLocation: '',
        installationNotes: '',
        conditionStatus: 'OPERATIONAL',
        assetStatus: 'ACTIVE',
      });
      fetchEquipment();
    } catch (err: any) {
      toast.error('Failed to register legacy asset', err?.message);
    } finally {
      setSubmittingManual(false);
    }
  };

  const getConditionBadge = (condition: CustomerEquipmentCondition) => {
    switch (condition) {
      case 'OPERATIONAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={12} className="text-emerald-600" />
            Operational
          </span>
        );
      case 'NEEDS_REPAIR':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle size={12} className="text-amber-600" />
            Needs Repair
          </span>
        );
      case 'FAULTY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle size={12} className="text-rose-600" />
            Faulty
          </span>
        );
      case 'REPAIRED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <Wrench size={12} className="text-blue-600" />
            Repaired
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            {condition}
          </span>
        );
    }
  };

  const getAssetStatusBadge = (status: CustomerEquipmentAssetStatus) => {
    if (status === 'ACTIVE') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          Active
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
        Inactive
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <Cpu className="w-5 h-5" />
            </div>
            Customer Equipment & Installed Assets
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Track physical customer-owned units created from dispatches, AMC coverage, and maintenance lifecycle.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchEquipment()}
            className="p-2 border border-gray-200 bg-white rounded-xl text-gray-600 hover:bg-gray-50 shadow-xs transition-colors"
            title="Refresh"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>

          {canCreateManual && (
            <button
              onClick={() => setIsManualModalOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={16} />
              <span>Register Legacy Asset</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by asset number, customer, product, or serial..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-gray-900 placeholder-gray-400"
          />
        </div>

        <div className="flex items-center gap-2 sm:w-auto w-full">
          <select
            value={conditionFilter}
            onChange={(e) => {
              setConditionFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 text-xs border border-gray-200 rounded-xl bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">All Conditions</option>
            <option value="OPERATIONAL">Operational</option>
            <option value="NEEDS_REPAIR">Needs Repair</option>
            <option value="FAULTY">Faulty</option>
            <option value="REPAIRED">Repaired</option>
          </select>

          <select
            value={assetStatusFilter}
            onChange={(e) => {
              setAssetStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 text-xs border border-gray-200 rounded-xl bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => fetchEquipment()}
            className="text-xs font-semibold underline hover:text-red-900"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 border-b border-gray-200 text-gray-600 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Asset Number</th>
                <th className="py-3 px-3">Customer</th>
                <th className="py-3 px-3">Product & Model</th>
                <th className="py-3 px-3">Serial Number</th>
                <th className="py-3 px-3">Delivery Date</th>
                <th className="py-3 px-3 text-center">Condition</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && equipmentList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-gray-500">
                    <Loader2 size={24} className="animate-spin mx-auto mb-2 text-blue-600" />
                    Loading equipment registry...
                  </td>
                </tr>
              ) : equipmentList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                      <Package className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900">No equipment records found</h3>
                    <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                      Customer equipment records are automatically generated upon confirmed Delivery Challan stock dispatch.
                    </p>
                  </td>
                </tr>
              ) : (
                equipmentList.map((item) => {
                  const customerDisplayName =
                    item.customerCompanyName ||
                    item.customerName ||
                    item.customer?.companyName ||
                    item.customer?.contactPerson ||
                    '—';

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/60 transition-colors group cursor-pointer"
                      onClick={() => navigate(`/customer-equipment/${item.id}`)}
                    >
                      {/* Asset Number */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded-md">
                            {item.assetNumber}
                          </span>
                          {item.unitIndex !== null && item.unitIndex !== undefined && (
                            <span className="text-[10px] text-gray-400 font-mono">
                              #{item.unitIndex}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                          <Building2 size={13} className="text-gray-400 shrink-0" />
                          <span className="truncate max-w-[200px]" title={customerDisplayName}>
                            {customerDisplayName}
                          </span>
                        </div>
                        {item.destinationName && (
                          <div className="text-[10px] text-gray-500 truncate max-w-[200px] mt-0.5">
                            {item.destinationName}
                          </div>
                        )}
                      </td>

                      {/* Product & Model */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-gray-900 truncate max-w-[220px]" title={item.productName}>
                          {item.productName}
                        </div>
                        <div className="text-[11px] text-gray-500 truncate max-w-[220px]">
                          {[item.make, item.model, item.capacityRating].filter(Boolean).join(' • ') ||
                            (item.sku ? `SKU: ${item.sku}` : '—')}
                        </div>
                      </td>

                      {/* Serial Number */}
                      <td className="py-3 px-3">
                        {item.serialNumber ? (
                          <span className="font-mono text-xs text-gray-800 bg-slate-100 px-2 py-0.5 rounded">
                            {item.serialNumber}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic text-xs">Unassigned</span>
                        )}
                      </td>

                      {/* Delivery Date */}
                      <td className="py-3 px-3 text-gray-600 text-xs">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-gray-400 shrink-0" />
                          <span>
                            {item.deliveryDate
                              ? new Date(item.deliveryDate).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })
                              : '—'}
                          </span>
                        </div>
                      </td>

                      {/* Condition Status */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {getConditionBadge(item.conditionStatus)}
                      </td>

                      {/* Asset Status */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {getAssetStatusBadge(item.assetStatus)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/customer-equipment/${item.id}`);
                          }}
                          className="px-2.5 py-1 text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 rounded-lg transition-colors font-medium text-xs inline-flex items-center gap-1"
                        >
                          <Eye size={13} />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-gray-100 flex items-center justify-between bg-slate-50/50">
            <TablePagination
              page={page}
              totalPages={totalPages}
              totalCount={totalCount}
              limit={10}
              onPageChange={(newPage) => setPage(newPage)}
            />
          </div>
        )}
      </div>

      {/* Legacy Asset Registration Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white border border-gray-100 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-slate-50/50">
              <div className="flex items-center gap-2 text-gray-900 font-bold">
                <Cpu size={18} className="text-blue-600" />
                <h3>Register Legacy Customer Asset</h3>
              </div>
              <button
                onClick={() => setIsManualModalOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                Manual asset creation is restricted to legacy equipment delivered before system implementation. Operational provenance remains required.
              </div>

              {/* Customer Select */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Customer *
                </label>
                <select
                  required
                  value={manualForm.customerId}
                  onChange={(e) => setManualForm({ ...manualForm, customerId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-gray-900"
                >
                  <option value="">Select Customer...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName || c.name} ({c.name})
                    </option>
                  ))}
                </select>
              </div>

              {/* Product Select */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Product Catalog Item *
                </label>
                <select
                  required
                  value={manualForm.productId}
                  onChange={(e) => handleManualProductChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-gray-900"
                >
                  <option value="">Select Catalog Product...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.sku ? `(${p.sku})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Product Name Override */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Installed Product Name Snapshot *
                </label>
                <input
                  type="text"
                  required
                  value={manualForm.productName}
                  onChange={(e) => setManualForm({ ...manualForm, productName: e.target.value })}
                  placeholder="e.g. 50kVA Servo Voltage Stabilizer"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-gray-900"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">SKU</label>
                  <input
                    type="text"
                    value={manualForm.sku || ''}
                    onChange={(e) => setManualForm({ ...manualForm, sku: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Model</label>
                  <input
                    type="text"
                    value={manualForm.model || ''}
                    onChange={(e) => setManualForm({ ...manualForm, model: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Capacity</label>
                  <input
                    type="text"
                    value={manualForm.capacityRating || ''}
                    onChange={(e) => setManualForm({ ...manualForm, capacityRating: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Serial Number (Physical)
                  </label>
                  <input
                    type="text"
                    value={manualForm.serialNumber || ''}
                    onChange={(e) => setManualForm({ ...manualForm, serialNumber: e.target.value })}
                    placeholder="e.g. SN-882910"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Installation Location
                  </label>
                  <input
                    type="text"
                    value={manualForm.installationLocation || ''}
                    onChange={(e) => setManualForm({ ...manualForm, installationLocation: e.target.value })}
                    placeholder="e.g. Plant 2, Main Panel Room"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Condition Status</label>
                  <select
                    value={manualForm.conditionStatus}
                    onChange={(e) =>
                      setManualForm({
                        ...manualForm,
                        conditionStatus: e.target.value as CustomerEquipmentCondition,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  >
                    <option value="OPERATIONAL">Operational</option>
                    <option value="NEEDS_REPAIR">Needs Repair</option>
                    <option value="FAULTY">Faulty</option>
                    <option value="REPAIRED">Repaired</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Asset Status</label>
                  <select
                    value={manualForm.assetStatus}
                    onChange={(e) =>
                      setManualForm({
                        ...manualForm,
                        assetStatus: e.target.value as CustomerEquipmentAssetStatus,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingManual}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {submittingManual ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      Registering...
                    </>
                  ) : (
                    'Register Asset'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
