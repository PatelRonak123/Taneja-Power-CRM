import React, { useState, useEffect, useRef } from 'react';
import { amcContractApi, AmcServiceReport, AmcServiceReportMaterial } from '../api/amcContractApi';
import { productService } from '../../products/services/productService';
import { Product } from '../../products/types/product.types';
import { toast } from '../../../utils/toast';
import {
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Save,
  Download,
  Zap,
  ClipboardCheck,
  Building2,
  RefreshCw,
  Lock,
  Package,
  Plus,
  Trash2,
  Search,
} from 'lucide-react';

interface AmcServiceReportModalProps {
  visitId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// Inline material state (for editing in the modal)
interface MaterialRow {
  id?: string; // undefined = new, to be inserted
  productId?: string;
  productNameSnapshot: string;
  skuSnapshot?: string;
  unitSnapshot: string;
  quantity: string;
  materialType: 'SPARE_PART' | 'CONSUMABLE' | 'MATERIAL' | 'OTHER';
  coverageType: 'AMC_INCLUDED' | 'CHARGEABLE' | 'CUSTOMER_SUPPLIED';
  remarks: string;
  stockConsumedAt?: string;
  _deleted?: boolean; // soft-delete flag for rows that exist on server
}

const COVERAGE_LABELS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  AMC_INCLUDED: { label: 'AMC Included', color: 'text-emerald-800', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  CHARGEABLE: { label: 'Chargeable', color: 'text-rose-800', bg: 'bg-rose-50', border: 'border-rose-200' },
  CUSTOMER_SUPPLIED: { label: 'Customer Supplied', color: 'text-amber-800', bg: 'bg-amber-50', border: 'border-amber-200' },
};

const MATERIAL_TYPE_LABELS: Record<string, string> = {
  SPARE_PART: 'Spare Part',
  CONSUMABLE: 'Consumable',
  MATERIAL: 'Material',
  OTHER: 'Other',
};

export const AmcServiceReportModal: React.FC<AmcServiceReportModalProps> = ({
  visitId,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [report, setReport] = useState<AmcServiceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [serviceSummary, setServiceSummary] = useState('');
  const [observations, setObservations] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerRemarks, setCustomerRemarks] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [isAcknowledged, setIsAcknowledged] = useState(false);

  // Materials State
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [deletedMaterialIds, setDeletedMaterialIds] = useState<string[]>([]);

  // Product search
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState<Product[]>([]);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [activeProductRowIdx, setActiveProductRowIdx] = useState<number | null>(null);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOpen && visitId) {
      loadReport();
    }
  }, [isOpen, visitId]);

  const loadReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await amcContractApi.getOrCreateServiceReport(visitId);
      if (res.data) {
        const data = res.data;
        setReport(data);
        setServiceSummary(data.serviceSummary || '');
        setObservations(data.observations || '');
        setRecommendations(data.recommendations || '');
        setCustomerName(data.customerName || '');
        setCustomerRemarks(data.customerRemarks || '');
        setItems(data.items || []);
        setEquipment(data.equipment || []);
        setIsAcknowledged(data.acknowledgementStatus === 'ACKNOWLEDGED');

        // Materials: map from server format to local row format
        setMaterials(
          (data.materials || []).map((m: AmcServiceReportMaterial) => ({
            id: m.id,
            productId: m.productId,
            productNameSnapshot: m.productNameSnapshot,
            skuSnapshot: m.skuSnapshot || '',
            unitSnapshot: m.unitSnapshot,
            quantity: m.quantity,
            materialType: m.materialType,
            coverageType: m.coverageType,
            remarks: m.remarks || '',
            stockConsumedAt: m.stockConsumedAt,
          }))
        );
        setDeletedMaterialIds([]);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load service report.');
    } finally {
      setLoading(false);
    }
  };

  // Product search debounce
  const handleProductSearch = (query: string, rowIdx: number) => {
    setProductSearch(query);
    setActiveProductRowIdx(rowIdx);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    if (!query || query.length < 2) {
      setProductResults([]);
      return;
    }
    searchDebounce.current = setTimeout(async () => {
      try {
        setSearchingProducts(true);
        const res = await productService.getProducts({ search: query, status: 'ACTIVE', limit: 8 });
        if (res?.data) {
          const items = Array.isArray((res.data as any).items) ? (res.data as any).items : (res.data as any);
          setProductResults(Array.isArray(items) ? items : []);
        }
      } catch {
        setProductResults([]);
      } finally {
        setSearchingProducts(false);
      }
    }, 300);
  };

  const handleSelectProduct = (product: Product, rowIdx: number) => {
    const next = [...materials];
    next[rowIdx] = {
      ...next[rowIdx],
      productId: product.id,
      productNameSnapshot: product.name,
      skuSnapshot: product.sku,
      unitSnapshot: next[rowIdx].unitSnapshot || 'PCS',
    };
    setMaterials(next);
    setProductResults([]);
    setProductSearch('');
    setActiveProductRowIdx(null);
  };

  const addMaterialRow = () => {
    setMaterials([
      ...materials,
      {
        productNameSnapshot: '',
        skuSnapshot: '',
        unitSnapshot: 'PCS',
        quantity: '1',
        materialType: 'SPARE_PART',
        coverageType: 'AMC_INCLUDED',
        remarks: '',
      },
    ]);
  };

  const removeMaterialRow = (idx: number) => {
    const row = materials[idx];
    if (row.id) {
      // Existing row: mark for deletion
      setDeletedMaterialIds((prev) => [...prev, row.id!]);
    }
    setMaterials(materials.filter((_, i) => i !== idx));
  };

  const updateMaterialField = (idx: number, field: keyof MaterialRow, value: any) => {
    const next = [...materials];
    (next[idx] as any)[field] = value;
    setMaterials(next);
  };

  const buildMaterialsPayload = () =>
    materials.filter((m) => m.productNameSnapshot && m.quantity);

  const handleSaveDraft = async () => {
    if (!report || report.status === 'COMPLETED') return;
    try {
      setSaving(true);
      await amcContractApi.updateServiceReport(visitId, {
        reportId: report.id,
        serviceSummary,
        observations,
        recommendations,
        customerName,
        customerRemarks,
        acknowledgementStatus: isAcknowledged ? 'ACKNOWLEDGED' : 'PENDING',
        items,
        equipment,
        materials: buildMaterialsPayload(),
        deleteMaterialIds: deletedMaterialIds,
      });
      setDeletedMaterialIds([]);
      toast.success('Service report draft saved.');
    } catch (err: any) {
      toast.error('Failed to save draft', err?.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteVisit = async () => {
    if (!report) return;
    try {
      setSaving(true);
      await amcContractApi.completeServiceVisit(visitId, {
        serviceSummary: serviceSummary || 'Preventive maintenance completed.',
        observations,
        recommendations,
        customerName,
        customerRemarks,
        visitOutcome: 'SATISFACTORY',
        items,
        equipment,
        materials: buildMaterialsPayload(),
        deleteMaterialIds: deletedMaterialIds,
      });
      toast.success('Visit Completed', 'Service Visit & Report successfully completed!');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('Failed to complete visit', err?.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const isReadOnly = report?.status === 'COMPLETED';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col border border-slate-200 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-xs">
              <FileText size={18} />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold tracking-tight text-white">
                  AMC Service Report {report?.reportNumber ? `— ${report.reportNumber}` : ''}
                </h3>
                {report && (
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                      report.status === 'COMPLETED'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                        : 'bg-amber-950 text-amber-300 border-amber-700'
                    }`}
                  >
                    {report.status}
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-400">
                Official technical findings, equipment condition inspection, and customer sign-off.
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-6 custom-scrollbar">
          {loading ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
              <RefreshCw size={24} className="animate-spin text-blue-600" />
              <span className="text-xs font-semibold">Initializing Service Report checklist...</span>
            </div>
          ) : error ? (
            <div className="p-12 text-center text-rose-600 flex flex-col items-center gap-2 bg-rose-50 rounded-xl">
              <AlertCircle size={24} />
              <span className="text-xs font-bold">{error}</span>
            </div>
          ) : (
            <>
              {isReadOnly && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs font-bold text-amber-800">
                  <Lock size={15} />
                  This service report is COMPLETED and read-only.
                </div>
              )}

              {/* Covered Equipment Inspection */}
              <div className="flex flex-col gap-3">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Zap size={16} className="text-blue-600" /> 1. Covered Equipment Inspection
                </h4>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
                        <th className="px-3.5 py-2.5">Equipment Name</th>
                        <th className="px-3.5 py-2.5">Rating / Config</th>
                        <th className="px-3.5 py-2.5">Condition Status</th>
                        <th className="px-3.5 py-2.5">Technician Observations</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {equipment.map((eqItem, idx) => (
                        <tr key={eqItem.id || idx} className="hover:bg-slate-50/60">
                          <td className="px-3.5 py-3 font-bold text-slate-900">{eqItem.equipmentName}</td>
                          <td className="px-3.5 py-3 text-slate-600">
                            {eqItem.configuration || '—'} {eqItem.rating ? `(${eqItem.rating})` : ''}
                          </td>
                          <td className="px-3.5 py-3">
                            <select
                              disabled={isReadOnly}
                              value={eqItem.conditionStatus || 'OPERATIONAL'}
                              onChange={(e) => {
                                const next = [...equipment];
                                next[idx].conditionStatus = e.target.value;
                                setEquipment(next);
                              }}
                              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 disabled:opacity-80"
                            >
                              <option value="OPERATIONAL">OPERATIONAL</option>
                              <option value="NEEDS_REPAIR">NEEDS REPAIR</option>
                              <option value="REPLACED_PART">REPLACED PART</option>
                              <option value="FAULTY">FAULTY</option>
                            </select>
                          </td>
                          <td className="px-3.5 py-3">
                            <input
                              type="text"
                              disabled={isReadOnly}
                              value={eqItem.observations || ''}
                              onChange={(e) => {
                                const next = [...equipment];
                                next[idx].observations = e.target.value;
                                setEquipment(next);
                              }}
                              placeholder="Observations..."
                              className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-500 disabled:opacity-80"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Scope Checklist Results */}
              <div className="flex flex-col gap-3">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                  <ClipboardCheck size={16} className="text-emerald-600" /> 2. Preventive Maintenance Scope Checklist
                </h4>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
                        <th className="px-3.5 py-2.5 w-10">#</th>
                        <th className="px-3.5 py-2.5">Scope Description (Contract Snapshot)</th>
                        <th className="px-3.5 py-2.5 w-44">Checklist Result</th>
                        <th className="px-3.5 py-2.5">Technician Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((item, idx) => (
                        <tr key={item.id || idx} className="hover:bg-slate-50/60">
                          <td className="px-3.5 py-3 font-bold text-slate-500">{idx + 1}</td>
                          <td className="px-3.5 py-3 font-semibold text-slate-900">{item.scopeDescription}</td>
                          <td className="px-3.5 py-3">
                            <select
                              disabled={isReadOnly}
                              value={item.status || 'COMPLETED'}
                              onChange={(e) => {
                                const next = [...items];
                                next[idx].status = e.target.value;
                                setItems(next);
                              }}
                              className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 disabled:opacity-80"
                            >
                              <option value="COMPLETED">COMPLETED</option>
                              <option value="NOT_COMPLETED">NOT COMPLETED</option>
                              <option value="NOT_APPLICABLE">NOT APPLICABLE</option>
                            </select>
                          </td>
                          <td className="px-3.5 py-3">
                            <input
                              type="text"
                              disabled={isReadOnly}
                              value={item.remarks || ''}
                              onChange={(e) => {
                                const next = [...items];
                                next[idx].remarks = e.target.value;
                                setItems(next);
                              }}
                              placeholder="Inspection remarks..."
                              className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-500 disabled:opacity-80"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Materials / Spares Consumed */}
              <div className="flex flex-col gap-3">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Package size={16} className="text-violet-600" /> 3. Materials / Spares Consumed
                  <span className="ml-auto text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    Linked to Inventory
                  </span>
                </h4>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                        <th className="px-3 py-2.5">Product / Item</th>
                        <th className="px-3 py-2.5 w-24">SKU</th>
                        <th className="px-3 py-2.5 w-20">Qty</th>
                        <th className="px-3 py-2.5 w-20">Unit</th>
                        <th className="px-3 py-2.5 w-28">Type</th>
                        <th className="px-3 py-2.5 w-36">Coverage</th>
                        <th className="px-3 py-2.5">Remarks</th>
                        {!isReadOnly && <th className="px-3 py-2.5 w-10"></th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {materials.length === 0 ? (
                        <tr>
                          <td
                            colSpan={isReadOnly ? 7 : 8}
                            className="px-3.5 py-6 text-center text-slate-400 text-xs italic"
                          >
                            {isReadOnly
                              ? 'No materials recorded for this visit.'
                              : 'No materials added yet. Click "+ Add Material" below.'}
                          </td>
                        </tr>
                      ) : (
                        materials.map((mat, idx) => {
                          const isConsumed = !!mat.stockConsumedAt;
                          const coverageStyle = COVERAGE_LABELS[mat.coverageType] || COVERAGE_LABELS.AMC_INCLUDED;

                          return (
                            <tr key={idx} className={`hover:bg-slate-50/60 ${isConsumed ? 'opacity-70' : ''}`}>
                              {/* Product Name with search */}
                              <td className="px-3 py-2.5 relative">
                                {isReadOnly || isConsumed ? (
                                  <div>
                                    <span className="font-bold text-slate-900">{mat.productNameSnapshot}</span>
                                    {isConsumed && (
                                      <span className="ml-1.5 text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                                        STOCK CONSUMED
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <div className="relative">
                                    <div className="flex items-center gap-1">
                                      <Search size={11} className="text-slate-400 shrink-0" />
                                      <input
                                        type="text"
                                        value={
                                          activeProductRowIdx === idx && productSearch !== ''
                                            ? productSearch
                                            : mat.productNameSnapshot
                                        }
                                        onFocus={() => {
                                          setActiveProductRowIdx(idx);
                                          setProductSearch(mat.productNameSnapshot || '');
                                        }}
                                        onChange={(e) => {
                                          handleProductSearch(e.target.value, idx);
                                          updateMaterialField(idx, 'productNameSnapshot', e.target.value);
                                          updateMaterialField(idx, 'productId', undefined);
                                        }}
                                        placeholder="Search product..."
                                        className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-violet-500"
                                      />
                                    </div>
                                    {/* Dropdown results */}
                                    {activeProductRowIdx === idx && (productResults.length > 0 || searchingProducts) && (
                                      <div className="absolute top-full left-0 right-0 z-30 bg-white border border-slate-200 rounded-xl shadow-xl mt-1 max-h-48 overflow-y-auto">
                                        {searchingProducts ? (
                                          <div className="p-3 text-center text-slate-400 text-xs">
                                            <RefreshCw size={12} className="animate-spin inline mr-1" /> Searching...
                                          </div>
                                        ) : (
                                          productResults.map((p) => (
                                            <button
                                              key={p.id}
                                              type="button"
                                              onClick={() => handleSelectProduct(p, idx)}
                                              className="w-full px-3 py-2 text-left hover:bg-violet-50 flex items-center justify-between group transition-colors"
                                            >
                                              <div>
                                                <div className="text-xs font-bold text-slate-900 group-hover:text-violet-800">{p.name}</div>
                                                <div className="text-[10px] text-slate-500">{p.sku} · Stock: {p.stockQuantity}</div>
                                              </div>
                                              <span className="text-[10px] font-semibold text-violet-600 group-hover:text-violet-700">Select</span>
                                            </button>
                                          ))
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </td>

                              {/* SKU */}
                              <td className="px-3 py-2.5">
                                {isReadOnly || isConsumed ? (
                                  <span className="text-slate-500">{mat.skuSnapshot || '—'}</span>
                                ) : (
                                  <input
                                    type="text"
                                    value={mat.skuSnapshot || ''}
                                    onChange={(e) => updateMaterialField(idx, 'skuSnapshot', e.target.value)}
                                    placeholder="SKU"
                                    className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-violet-500"
                                  />
                                )}
                              </td>

                              {/* Quantity */}
                              <td className="px-3 py-2.5">
                                {isReadOnly || isConsumed ? (
                                  <span className="font-bold text-slate-900">{mat.quantity}</span>
                                ) : (
                                  <input
                                    type="number"
                                    min="0.001"
                                    step="0.001"
                                    value={mat.quantity}
                                    onChange={(e) => updateMaterialField(idx, 'quantity', e.target.value)}
                                    className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:border-violet-500"
                                  />
                                )}
                              </td>

                              {/* Unit */}
                              <td className="px-3 py-2.5">
                                {isReadOnly || isConsumed ? (
                                  <span className="text-slate-600">{mat.unitSnapshot}</span>
                                ) : (
                                  <select
                                    value={mat.unitSnapshot}
                                    onChange={(e) => updateMaterialField(idx, 'unitSnapshot', e.target.value)}
                                    className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-violet-500"
                                  >
                                    {['PCS', 'NOS', 'SET', 'KG', 'LTR', 'MTR', 'PKT', 'BOX', 'ROLL', 'OTH'].map((u) => (
                                      <option key={u} value={u}>{u}</option>
                                    ))}
                                  </select>
                                )}
                              </td>

                              {/* Material Type */}
                              <td className="px-3 py-2.5">
                                {isReadOnly || isConsumed ? (
                                  <span className="text-slate-600">{MATERIAL_TYPE_LABELS[mat.materialType]}</span>
                                ) : (
                                  <select
                                    value={mat.materialType}
                                    onChange={(e) => updateMaterialField(idx, 'materialType', e.target.value as any)}
                                    className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-violet-500"
                                  >
                                    <option value="SPARE_PART">Spare Part</option>
                                    <option value="CONSUMABLE">Consumable</option>
                                    <option value="MATERIAL">Material</option>
                                    <option value="OTHER">Other</option>
                                  </select>
                                )}
                              </td>

                              {/* Coverage Type */}
                              <td className="px-3 py-2.5">
                                {isReadOnly || isConsumed ? (
                                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${coverageStyle.color} ${coverageStyle.bg} ${coverageStyle.border}`}>
                                    {coverageStyle.label}
                                  </span>
                                ) : (
                                  <select
                                    value={mat.coverageType}
                                    onChange={(e) => updateMaterialField(idx, 'coverageType', e.target.value as any)}
                                    className={`w-full px-2 py-1 border rounded-lg text-xs font-bold focus:outline-none focus:border-violet-500 ${coverageStyle.color} ${coverageStyle.bg} ${coverageStyle.border}`}
                                  >
                                    <option value="AMC_INCLUDED">AMC Included</option>
                                    <option value="CHARGEABLE">Chargeable</option>
                                    <option value="CUSTOMER_SUPPLIED">Customer Supplied</option>
                                  </select>
                                )}
                              </td>

                              {/* Remarks */}
                              <td className="px-3 py-2.5">
                                {isReadOnly || isConsumed ? (
                                  <span className="text-slate-500">{mat.remarks || '—'}</span>
                                ) : (
                                  <input
                                    type="text"
                                    value={mat.remarks}
                                    onChange={(e) => updateMaterialField(idx, 'remarks', e.target.value)}
                                    placeholder="Notes..."
                                    className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-violet-500"
                                  />
                                )}
                              </td>

                              {/* Delete */}
                              {!isReadOnly && (
                                <td className="px-3 py-2.5">
                                  {isConsumed ? (
                                    <span className="text-slate-300 text-[10px]">Locked</span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => removeMaterialRow(idx)}
                                      className="p-1 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  )}
                                </td>
                              )}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={addMaterialRow}
                    className="self-start inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 border border-violet-200 text-violet-700 rounded-xl text-xs font-bold hover:bg-violet-100 transition-colors cursor-pointer"
                  >
                    <Plus size={13} /> Add Material / Spare Part
                  </button>
                )}

                <div className="flex flex-wrap gap-2 text-[10px] font-semibold text-slate-500">
                  <span className="px-2 py-0.5 rounded border bg-emerald-50 border-emerald-200 text-emerald-700">AMC Included — deducted from company stock</span>
                  <span className="px-2 py-0.5 rounded border bg-rose-50 border-rose-200 text-rose-700">Chargeable — deducted, will be invoiced</span>
                  <span className="px-2 py-0.5 rounded border bg-amber-50 border-amber-200 text-amber-700">Customer Supplied — no stock deduction</span>
                </div>
              </div>

              {/* Technical Observations & Recommendations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700">Service Summary & Technical Findings</label>
                  <textarea
                    rows={3}
                    disabled={isReadOnly}
                    value={serviceSummary}
                    onChange={(e) => setServiceSummary(e.target.value)}
                    placeholder="Summarize key tasks performed during visit..."
                    className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500 disabled:opacity-80"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700">Recommendations & Follow-up Notes</label>
                  <textarea
                    rows={3}
                    disabled={isReadOnly}
                    value={recommendations}
                    onChange={(e) => setRecommendations(e.target.value)}
                    placeholder="Recommended parts replacement or next visit notes..."
                    className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500 disabled:opacity-80"
                  />
                </div>
              </div>

              {/* Customer Acknowledgement */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col gap-3">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                  <Building2 size={14} className="text-blue-600" /> Customer Sign-Off & Acknowledgement
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-600">Customer Representative Name</label>
                    <input
                      type="text"
                      disabled={isReadOnly}
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Mr. Rajesh Sharma"
                      className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 disabled:opacity-80"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-600">Customer Remarks</label>
                    <input
                      type="text"
                      disabled={isReadOnly}
                      value={customerRemarks}
                      onChange={(e) => setCustomerRemarks(e.target.value)}
                      placeholder="e.g. Servicing completed to satisfaction."
                      className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 disabled:opacity-80"
                    />
                  </div>
                </div>

                {!isReadOnly && (
                  <label className="flex items-center gap-2 cursor-pointer mt-1">
                    <input
                      type="checkbox"
                      checked={isAcknowledged}
                      onChange={(e) => setIsAcknowledged(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                    />
                    <span className="text-xs font-bold text-slate-800">
                      Customer acknowledges satisfactory completion of maintenance scope.
                    </span>
                  </label>
                )}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            {report?.id && (
              <a
                href={amcContractApi.downloadReportPdf(report.id)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
              >
                <Download size={14} className="text-blue-600" /> Download Report PDF
              </a>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-100"
            >
              Close
            </button>

            {!isReadOnly && (
              <>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveDraft}
                  className="inline-flex items-center gap-1 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  <Save size={14} /> Save Draft
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={handleCompleteVisit}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm disabled:opacity-50"
                >
                  <CheckCircle2 size={14} /> Complete Visit & Report
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
