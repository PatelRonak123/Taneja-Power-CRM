import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { customerEquipmentService } from '../services/customerEquipmentService';
import type {
  CustomerEquipment,
  CustomerEquipmentCondition,
  CustomerEquipmentAssetStatus,
  UpdateCustomerEquipmentPayload,
  CommissioningResult,
} from '../types/customer-equipment.types';
import { useCurrentPath, navigate } from '../../../app/router/navigation';
import { useAuthStore } from '../../../stores/authStore';
import { toast } from '../../../utils/toast';
import { WarrantyStatusBadge } from '../components/WarrantyStatusBadge';
import { CommissionEquipmentModal } from '../components/CommissionEquipmentModal';
import {
  parseCalendarDate,
  addDaysToCalendarDate,
  formatCalendarDate,
} from '../utils/warranty-date.util';
import {
  Cpu,
  ArrowLeft,
  Building2,
  Package,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Wrench,
  Receipt,
  ShoppingCart,
  Truck,
  MapPin,
  Edit3,
  Loader2,
  X,
  History,
  User,
  Clock,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Check,
  Info,
} from 'lucide-react';

export const CustomerEquipmentDetailPage: React.FC = () => {
  const currentPath = useCurrentPath();
  const id = currentPath.split('/')[2];

  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  const isManager = user?.role === 'MANAGER';
  const canCommission = isAdmin || isManager;

  const [equipment, setEquipment] = useState<CustomerEquipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [editForm, setEditForm] = useState<UpdateCustomerEquipmentPayload>({
    installationLocation: '',
    installationNotes: '',
    installationDate: '',
    conditionStatus: 'OPERATIONAL',
    assetStatus: 'ACTIVE',
    serialNumber: '',
  });

  // Commission Modal State
  const [isCommissionModalOpen, setIsCommissionModalOpen] = useState(false);

  // Derived check for locked installation date
  const isInstallationDateLocked =
    equipment?.warrantyStatus === 'ACTIVE' || equipment?.warrantyStatus === 'EXPIRING_SOON';

  // Derived proposed AMC start date (the calendar day after warranty expiry)
  const derivedAmcStartDate = useMemo(() => {
    if (equipment?.warrantyEndDate) {
      try {
        const { year, month, day } = parseCalendarDate(equipment.warrantyEndDate);
        const nextDay = addDaysToCalendarDate(year, month, day, 1);
        return formatCalendarDate(nextDay.year, nextDay.month, nextDay.day);
      } catch {
        return null;
      }
    }
    return null;
  }, [equipment?.warrantyEndDate]);

  const fetchEquipmentDetails = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await customerEquipmentService.getEquipmentById(id);
      // Double check service history fallback if not already populated
      if (!data.serviceVisits?.length || !data.serviceRequests?.length) {
        try {
          const history = await customerEquipmentService.getEquipmentServiceHistory(id);
          if (history) {
            if (!data.serviceVisits?.length && history.serviceVisits) {
              data.serviceVisits = history.serviceVisits;
            }
            if (!data.serviceRequests?.length && history.serviceRequests) {
              data.serviceRequests = history.serviceRequests;
            }
          }
        } catch {
          // ignore fallback error
        }
      }
      setEquipment(data);
      setEditForm({
        installationLocation: data.installationLocation || '',
        installationNotes: data.installationNotes || '',
        installationDate: data.installationDate ? data.installationDate.split('T')[0] : '',
        conditionStatus: data.conditionStatus,
        assetStatus: data.assetStatus,
        serialNumber: data.serialNumber || '',
      });
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch customer equipment details');
      toast.error('Error loading asset', err?.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchEquipmentDetails();
  }, [fetchEquipmentDetails]);

  const handleUpdateOperational = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      setSubmittingEdit(true);

      // Build payload cleanly without including installationDate if locked by active warranty
      const payload: UpdateCustomerEquipmentPayload = {
        serialNumber: editForm.serialNumber,
        installationLocation: editForm.installationLocation,
        installationNotes: editForm.installationNotes,
        conditionStatus: editForm.conditionStatus,
        assetStatus: editForm.assetStatus,
      };

      if (!isInstallationDateLocked) {
        payload.installationDate = editForm.installationDate
          ? new Date(editForm.installationDate).toISOString()
          : null;
      }

      const updated = await customerEquipmentService.updateEquipment(id, payload);
      setEquipment(updated);
      setIsEditModalOpen(false);
      toast.success('Asset updated', 'Operational details updated successfully');
    } catch (err: any) {
      toast.error('Update failed', err?.message);
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleCommissionSuccess = (result: CommissioningResult) => {
    setEquipment((prev) => {
      if (!prev) return result.equipment;
      return {
        ...prev,
        ...result.equipment,
        warrantyStatus: result.warranty?.status || 'ACTIVE',
        warrantyStartDate: result.warranty?.warrantyStartDate || prev.warrantyStartDate,
        warrantyEndDate: result.warranty?.warrantyEndDate || prev.warrantyEndDate,
        installationDate: result.warranty?.installationDate || prev.installationDate,
        warrantyDurationValue: result.warranty?.warrantyDurationValue ?? prev.warrantyDurationValue,
        warrantyDurationUnit: result.warranty?.warrantyDurationUnit ?? prev.warrantyDurationUnit,
        commissionedById: result.warranty?.commissionedById ?? prev.commissionedById,
        commissionedAt: result.warranty?.commissionedAt ? String(result.warranty.commissionedAt) : prev.commissionedAt,
      };
    });
    fetchEquipmentDetails();
  };

  const getConditionBadge = (condition: CustomerEquipmentCondition) => {
    switch (condition) {
      case 'OPERATIONAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={13} className="text-emerald-600" />
            Operational
          </span>
        );
      case 'NEEDS_REPAIR':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle size={13} className="text-amber-600" />
            Needs Repair
          </span>
        );
      case 'FAULTY':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle size={13} className="text-rose-600" />
            Faulty
          </span>
        );
      case 'REPAIRED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Wrench size={13} className="text-blue-600" />
            Repaired
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            {condition}
          </span>
        );
    }
  };

  const getCoverageBadge = (coverageType?: string | null) => {
    switch (coverageType) {
      case 'AMC_COVERED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
            <ShieldCheck size={12} className="text-emerald-600" />
            AMC Covered (100% Free)
          </span>
        );
      case 'CHARGEABLE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 shadow-2xs">
            <Receipt size={12} className="text-purple-600" />
            Chargeable (Out of Scope)
          </span>
        );
      case 'PENDING_REVIEW':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
            <Clock size={12} className="text-amber-600" />
            Commercial Review Pending
          </span>
        );
    }
  };

  const getPriorityBadge = (priority?: string) => {
    switch (priority) {
      case 'URGENT':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase bg-rose-100 text-rose-800 border border-rose-300">
            Urgent
          </span>
        );
      case 'HIGH':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase bg-red-50 text-red-700 border border-red-200">
            High Priority
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase bg-amber-50 text-amber-700 border border-amber-200">
            Medium
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase bg-slate-100 text-slate-700 border border-slate-200">
            Low
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-gray-500">
        <Loader2 size={32} className="animate-spin mx-auto mb-3 text-blue-600" />
        Loading asset details...
      </div>
    );
  }

  if (error || !equipment) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/customer-equipment')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 px-3 py-1.5 rounded-xl shadow-xs"
        >
          <ArrowLeft size={14} /> Back to Assets
        </button>
        <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs">
          <p className="font-semibold">{error || 'Asset not found'}</p>
        </div>
      </div>
    );
  }

  const customerDisplayName =
    equipment.customerCompanyName ||
    equipment.customerName ||
    equipment.customer?.companyName ||
    equipment.customer?.contactPerson ||
    '—';

  const destinationDisplayName =
    equipment.destinationName ||
    equipment.destination?.destinationName ||
    null;

  return (
    <div className="space-y-6">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/customer-equipment')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 px-3 py-1.5 rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} /> Back to Customer Assets
        </button>

        <div className="flex items-center gap-2">
          {equipment.warrantyStatus === 'PENDING_ACTIVATION' && canCommission && (
            <button
              onClick={() => setIsCommissionModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <ShieldCheck size={14} />
              Commission & Activate Warranty
            </button>
          )}

          <button
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Edit3 size={13} />
            Edit Operational Info
          </button>
        </div>
      </div>

      {/* Asset Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0 shadow-2xs">
              <Cpu size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900 font-mono tracking-tight">
                  {equipment.assetNumber}
                </h1>
                {getConditionBadge(equipment.conditionStatus)}
                <WarrantyStatusBadge
                  status={equipment.warrantyStatus}
                  expiryDate={equipment.warrantyEndDate}
                />
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                    equipment.assetStatus === 'ACTIVE'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  {equipment.assetStatus}
                </span>
                {equipment.unitIndex !== null && equipment.unitIndex !== undefined && (
                  <span className="text-xs text-gray-400 font-mono font-medium">
                    Unit #{equipment.unitIndex}
                  </span>
                )}
              </div>

              <p className="text-base text-gray-800 font-semibold mt-1">
                {equipment.productName}
              </p>

              <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 flex-wrap">
                <span className="inline-flex items-center gap-1 text-gray-700 font-medium">
                  <Building2 size={13} className="text-gray-400" />
                  {customerDisplayName}
                </span>
                {equipment.serialNumber && (
                  <>
                    <span>•</span>
                    <span className="font-mono text-gray-800 bg-slate-100 px-2 py-0.5 rounded text-xs">
                      SN: {equipment.serialNumber}
                    </span>
                  </>
                )}
                <span>•</span>
                <span className="inline-flex items-center gap-1">
                  <Calendar size={13} className="text-gray-400" />
                  Delivered{' '}
                  {equipment.deliveryDate
                    ? new Date(equipment.deliveryDate).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Operational Lifecycle & Technical Repair Status Alert Banner */}
      {(() => {
        const activeSr = equipment.serviceRequests?.find(
          (sr) => sr.status === 'OPEN' || sr.status === 'IN_PROGRESS' || sr.status === 'ASSIGNED'
        );
        if (activeSr) {
          return (
            <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-amber-900">
                      Active Technical Service Request in Progress
                    </span>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-white border border-amber-200 text-amber-800">
                      {activeSr.requestNumber}
                    </span>
                    {getCoverageBadge(activeSr.coverageType)}
                    {getPriorityBadge(activeSr.priority)}
                  </div>
                  <p className="text-xs text-amber-800 mt-1">{activeSr.issueDescription}</p>
                  {activeSr.technicianName && (
                    <div className="text-[11px] text-amber-700 mt-1 flex items-center gap-1 font-medium">
                      <User size={12} /> Assigned Field Engineer: <strong>{activeSr.technicianName}</strong>
                    </div>
                  )}
                </div>
              </div>
              {activeSr.amcContractId && (
                <button
                  onClick={() => navigate(`/amc-contracts/${activeSr.amcContractId}`)}
                  className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-xl bg-amber-600 text-white hover:bg-amber-700 shadow-2xs shrink-0 cursor-pointer self-start sm:self-center"
                >
                  View Contract <ArrowRight size={13} />
                </button>
              )}
            </div>
          );
        }

        const restoredSr = equipment.serviceRequests?.find(
          (sr) =>
            (sr.status === 'RESOLVED' || sr.status === 'CLOSED') &&
            sr.coverageType === 'AMC_COVERED'
        );
        if (restoredSr && equipment.conditionStatus === 'OPERATIONAL') {
          return (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50/50 to-white border border-emerald-200 text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Sparkles size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-emerald-900">
                      Operational Integrity Restored via Comprehensive AMC Coverage
                    </span>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-white border border-emerald-200 text-emerald-800">
                      {restoredSr.requestNumber}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                      100% Comprehensive AMC Covered
                    </span>
                  </div>
                  <p className="text-xs text-emerald-800 mt-1">
                    Equipment defect detected during routine PM Visit was reviewed under contract coverage, repaired by Field Engineer{' '}
                    <strong>{restoredSr.technicianName || 'Service Team'}</strong>
                    {restoredSr.resolvedAt
                      ? ` on ${new Date(restoredSr.resolvedAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}`
                      : ''}
                    , and restored to verified OPERATIONAL status.
                  </p>
                </div>
              </div>
              {restoredSr.amcContractId && (
                <button
                  onClick={() => navigate(`/amc-contracts/${restoredSr.amcContractId}`)}
                  className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs shrink-0 cursor-pointer self-start sm:self-center"
                >
                  Contract Details <ArrowRight size={13} />
                </button>
              )}
            </div>
          );
        }

        return null;
      })()}

      {/* Grid of Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Product Specifications & Commercial Provenance */}
        <div className="lg:col-span-2 space-y-6">
          {/* Commercial Provenance Card */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-gray-900 font-bold text-sm border-b border-gray-100 pb-3">
              <Receipt size={16} className="text-emerald-600" />
              <h3>Commercial Provenance (Immutable Traceability)</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium mb-1">
                  <ShoppingCart size={13} className="text-blue-600" />
                  Sales Order
                </div>
                <div className="font-mono text-xs font-bold text-gray-900">
                  {equipment.salesOrderNumber || equipment.salesOrder?.orderNumber || 'Legacy / Pre-system'}
                </div>
                {equipment.salesOrder?.orderDate && (
                  <div className="text-[11px] text-gray-400 mt-1">
                    {new Date(equipment.salesOrder.orderDate).toLocaleDateString()}
                  </div>
                )}
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium mb-1">
                  <Receipt size={13} className="text-purple-600" />
                  Sales Invoice
                </div>
                <div className="font-mono text-xs font-bold text-gray-900">
                  {equipment.salesInvoiceNumber || equipment.salesInvoice?.invoiceNumber || '—'}
                </div>
                {equipment.salesInvoice?.invoiceDate && (
                  <div className="text-[11px] text-gray-400 mt-1">
                    {new Date(equipment.salesInvoice.invoiceDate).toLocaleDateString()}
                  </div>
                )}
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium mb-1">
                  <Truck size={13} className="text-amber-600" />
                  Delivery Challan
                </div>
                <div className="font-mono text-xs font-bold text-gray-900">
                  {equipment.deliveryChallanNumber ||
                    equipment.deliveryNumber ||
                    equipment.dispatch?.dispatchNumber ||
                    'Direct Transfer'}
                </div>
                {equipment.dispatch?.dispatchDate && (
                  <div className="text-[11px] text-gray-400 mt-1">
                    {new Date(equipment.dispatch.dispatchDate).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 text-xs flex items-center gap-2 font-medium">
              <ShieldCheck size={14} className="shrink-0 text-blue-600" />
              <span>
                Commercial provenance fields are locked to maintain permanent legal and auditing integrity.
              </span>
            </div>
          </div>

          {/* Product Specifications Snapshot */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-gray-900 font-bold text-sm border-b border-gray-100 pb-3">
              <Package size={16} className="text-blue-600" />
              <h3>Product Technical Snapshot</h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-gray-500 block text-[11px] font-medium mb-0.5">Product Name</span>
                <span className="text-gray-900 font-semibold">{equipment.productName}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-[11px] font-medium mb-0.5">SKU</span>
                <span className="text-gray-900 font-mono font-medium">{equipment.sku || '—'}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-[11px] font-medium mb-0.5">Make / Brand</span>
                <span className="text-gray-900">{equipment.make || '—'}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-[11px] font-medium mb-0.5">Model</span>
                <span className="text-gray-900">{equipment.model || '—'}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-[11px] font-medium mb-0.5">Capacity / Rating</span>
                <span className="text-gray-900">{equipment.capacityRating || '—'}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-[11px] font-medium mb-0.5">HSN / SAC</span>
                <span className="text-gray-900 font-mono">{equipment.hsnSac || '—'}</span>
              </div>
            </div>
          </div>

          {/* Service & Repair History */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2 text-gray-900 font-bold text-sm">
                <History size={16} className="text-indigo-600" />
                <h3>Service, PM Visits & Repair Execution History</h3>
              </div>
              <span className="text-xs text-gray-500 font-medium bg-slate-100 px-2.5 py-0.5 rounded-full">
                {equipment.serviceVisits?.length || 0} Visits • {equipment.serviceRequests?.length || 0} Service Requests
              </span>
            </div>

            {/* Preventive Maintenance Visits */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-600" />
                  Preventive Maintenance Visits ({equipment.serviceVisits?.length || 0})
                </h4>
              </div>

              {equipment.serviceVisits && equipment.serviceVisits.length > 0 ? (
                <div className="space-y-3">
                  {equipment.serviceVisits.map((visit, index) => (
                    <div
                      key={visit.id || index}
                      className="p-4 rounded-xl border border-gray-200 bg-white hover:border-indigo-300 hover:shadow-2xs transition-all space-y-3"
                    >
                      {/* Top Header of Visit Card */}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                            PM Visit #{visit.visitNumber || index + 1}
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs text-gray-600 font-medium">
                            <Calendar size={12} className="text-gray-400" />
                            {new Date(visit.visitDate).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {visit.reportNumber && (
                            <span className="font-mono text-[11px] text-gray-600 bg-slate-100 px-2 py-0.5 rounded border border-gray-200">
                              {visit.reportNumber}
                            </span>
                          )}
                        </div>

                        {/* Visit Outcome Pill */}
                        <div>
                          {visit.visitOutcome === 'SATISFACTORY' ? (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                              <CheckCircle2 size={12} className="text-emerald-600" />
                              Satisfactory
                            </span>
                          ) : visit.visitOutcome === 'REQUIRES_FOLLOWUP' ? (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1">
                              <AlertTriangle size={12} className="text-amber-600" />
                              Defect Detected
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                              {visit.status}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Middle Details: Engineer & Recorded Condition */}
                      <div className="flex items-center justify-between gap-3 text-xs flex-wrap pt-1 border-t border-gray-100">
                        <div className="flex items-center gap-1.5 text-gray-700">
                          <User size={13} className="text-indigo-500" />
                          <span>Field Engineer:</span>
                          <strong className="text-gray-900 font-semibold">{visit.engineerName || 'Field Engineer'}</strong>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 text-[11px]">Recorded Condition:</span>
                          {getConditionBadge((visit.conditionStatus as CustomerEquipmentCondition) || 'OPERATIONAL')}
                        </div>
                      </div>

                      {/* Findings / Observations Box */}
                      {visit.conditionStatus === 'NEEDS_REPAIR' || visit.visitOutcome === 'REQUIRES_FOLLOWUP' ? (
                        <div className="p-3 rounded-xl bg-amber-50/90 border border-amber-200 text-xs text-amber-950 space-y-1">
                          <div className="font-bold flex items-center gap-1.5 text-amber-800">
                            <AlertTriangle size={13} className="text-amber-600 shrink-0" />
                            Defect Finding Logged by Field Engineer:
                          </div>
                          <p className="text-amber-950 font-medium pl-4.5">
                            {visit.findings || 'Abnormal condition detected during routine inspection.'}
                          </p>
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-gray-700 flex items-start gap-2">
                          <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold text-gray-900">Inspection Summary: </span>
                            {visit.findings || 'All electrical & physical parameters nominal. PM completed satisfactorily.'}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-xs text-gray-400 italic bg-slate-50/50 rounded-xl border border-gray-200 text-center">
                  No preventive maintenance visits logged for this asset yet.
                </div>
              )}
            </div>

            {/* Defect / Breakdown Service Requests */}
            <div className="space-y-3 pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Wrench size={14} className="text-indigo-600" />
                  Defect Findings & Breakdown Service Requests ({equipment.serviceRequests?.length || 0})
                </h4>
              </div>

              {equipment.serviceRequests && equipment.serviceRequests.length > 0 ? (
                <div className="space-y-3">
                  {equipment.serviceRequests.map((sr) => (
                    <div
                      key={sr.id}
                      className="p-4 rounded-xl border border-gray-200 bg-white hover:border-blue-300 hover:shadow-2xs transition-all space-y-3"
                    >
                      {/* Top Header of Request */}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                            {sr.requestNumber}
                          </span>
                          {getPriorityBadge(sr.priority)}
                          {getCoverageBadge(sr.coverageType)}
                        </div>

                        <div>
                          {sr.status === 'RESOLVED' || sr.status === 'CLOSED' ? (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                              <CheckCircle2 size={12} className="text-emerald-600" />
                              Resolved & Operational
                            </span>
                          ) : sr.status === 'IN_PROGRESS' ? (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center gap-1">
                              <Wrench size={12} className="text-blue-600" />
                              Repair In Progress
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1">
                              <Clock size={12} className="text-amber-600" />
                              {sr.status}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Reported Defect Box */}
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                          Reported Defect & Technical Findings
                        </span>
                        <p className="text-gray-900 font-medium">{sr.issueDescription}</p>
                        {sr.coverageNotes && (
                          <p className="text-[11px] text-gray-600 italic border-t border-slate-200/80 pt-1 mt-1">
                            Coverage Assessment: {sr.coverageNotes}
                          </p>
                        )}
                      </div>

                      {/* Linked Field Repair Task Execution */}
                      {sr.taskId && (
                        <div className="p-3.5 rounded-xl bg-indigo-50/50 border border-indigo-100 text-xs space-y-2.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 font-bold text-indigo-950 text-xs">
                              <Wrench size={13} className="text-indigo-600" />
                              Field Service Repair Task
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                sr.taskStatus === 'COMPLETED'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                              }`}
                            >
                              {sr.taskStatus || 'Assigned'}
                            </span>
                          </div>

                          <div className="text-gray-800 font-medium">{sr.taskTitle}</div>

                          <div className="flex items-center gap-4 text-[11px] text-gray-600 flex-wrap">
                            {sr.technicianName && (
                              <span className="inline-flex items-center gap-1">
                                <User size={12} className="text-indigo-500" /> Assigned Engineer:{' '}
                                <strong className="text-gray-900">{sr.technicianName}</strong>
                              </span>
                            )}
                            {sr.taskCompletedAt && (
                              <span className="inline-flex items-center gap-1">
                                <Check size={12} className="text-emerald-600" /> Completed:{' '}
                                {new Date(sr.taskCompletedAt).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            )}
                          </div>

                          {/* Lifecycle Progression Tracker */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px] text-center pt-1 font-semibold">
                            <div className="p-1 rounded-md bg-white text-emerald-700 border border-emerald-200 shadow-2xs">
                              1. Defect Detected
                            </div>
                            <div className="p-1 rounded-md bg-white text-emerald-700 border border-emerald-200 shadow-2xs">
                              2. AMC Approved
                            </div>
                            <div className="p-1 rounded-md bg-white text-emerald-700 border border-emerald-200 shadow-2xs">
                              3. Task Dispatched
                            </div>
                            <div
                              className={`p-1 rounded-md ${
                                sr.status === 'RESOLVED' || sr.status === 'CLOSED'
                                  ? 'bg-emerald-600 text-white shadow-2xs'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              4. Restored
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Footer Timestamps */}
                      <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1 flex-wrap gap-2 border-t border-gray-100">
                        <span>
                          Logged:{' '}
                          {sr.createdAt || sr.requestedAt
                            ? new Date(sr.createdAt || sr.requestedAt!).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '—'}
                        </span>
                        {sr.resolvedAt && (
                          <span className="text-emerald-700 font-medium">
                            Resolved:{' '}
                            {new Date(sr.resolvedAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-xs text-gray-400 italic bg-slate-50/50 rounded-xl border border-gray-200 text-center">
                  No breakdown defects or service requests logged for this asset.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Customer & Location, AMC, Warranty */}
        <div className="space-y-6">
          {/* Customer & Location Details */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-gray-900 font-bold text-sm border-b border-gray-100 pb-3">
              <MapPin size={16} className="text-amber-600" />
              <h3>Site & Installation Location</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-gray-500 block text-[11px] font-medium mb-0.5">Customer Name</span>
                <span className="text-gray-900 font-semibold">{customerDisplayName}</span>
              </div>

              {destinationDisplayName && (
                <div>
                  <span className="text-gray-500 block text-[11px] font-medium mb-0.5">Destination Site</span>
                  <span className="text-gray-900 font-semibold">{destinationDisplayName}</span>
                  {(equipment.destinationAddress || equipment.destinationCity) && (
                    <p className="text-gray-500 text-[11px] mt-0.5">
                      {[
                        equipment.destinationAddress,
                        equipment.destinationCity,
                        equipment.destinationState,
                        equipment.destinationPincode,
                      ]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  )}
                </div>
              )}

              <div>
                <span className="text-gray-500 block text-[11px] font-medium mb-0.5">
                  Physical Installation Location
                </span>
                <span className="text-gray-900 font-semibold">
                  {equipment.installationLocation || <span className="text-gray-400 italic">Not specified</span>}
                </span>
              </div>

              <div>
                <span className="text-gray-500 block text-[11px] font-medium mb-0.5">Installation Date</span>
                <span className="text-gray-900 font-semibold">
                  {equipment.installationDate
                    ? new Date(equipment.installationDate).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '—'}
                </span>
              </div>

              {equipment.installationNotes && (
                <div>
                  <span className="text-gray-500 block text-[11px] font-medium mb-0.5">Installation Notes</span>
                  <p className="text-gray-700 text-xs bg-slate-50 p-2.5 rounded-lg border border-gray-200">
                    {equipment.installationNotes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* AMC Coverage Card */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2 text-gray-900 font-bold text-sm">
                <ShieldCheck size={16} className="text-blue-600" />
                <h3>AMC Contract Coverage</h3>
              </div>
              {equipment.activeAmc && (
                <span className="text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Active
                </span>
              )}
            </div>

            {equipment.activeAmc ? (
              <div
                onClick={() => navigate(`/amc-contracts/${equipment.activeAmc?.contractId}`)}
                className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-blue-50/20 border border-slate-200 hover:border-blue-300 hover:shadow-2xs cursor-pointer transition-all space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-blue-600 flex items-center gap-1">
                    {equipment.activeAmc.contractNumber}
                    <ExternalLink size={11} className="text-blue-400" />
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold uppercase">
                    {equipment.activeAmc.status}
                  </span>
                </div>
                {equipment.activeAmc.amcPlan && (
                  <div className="text-xs font-bold text-gray-900">
                    {equipment.activeAmc.amcPlan}
                  </div>
                )}
                {equipment.activeAmc.contractStartDate && equipment.activeAmc.contractEndDate && (
                  <div className="text-[11px] text-gray-500">
                    Coverage Window:{' '}
                    <span className="font-medium text-gray-700">
                      {new Date(equipment.activeAmc.contractStartDate).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}{' '}
                      —{' '}
                      {new Date(equipment.activeAmc.contractEndDate).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between text-[11px] text-blue-700 font-semibold">
                  <span>{equipment.serviceVisits?.length || 0} PM Visits Recorded</span>
                  <span className="flex items-center gap-0.5 hover:underline">
                    View Contract <ArrowRight size={11} />
                  </span>
                </div>
              </div>
            ) : equipment.amcContracts && equipment.amcContracts.length > 0 ? (
              <div className="space-y-2">
                {equipment.amcContracts.map((contract) => (
                  <div
                    key={contract.id}
                    onClick={() => navigate(`/amc-contracts/${contract.id}`)}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 cursor-pointer transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-blue-600">
                        {contract.contractNumber}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {contract.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-600 mt-1">{contract.contractType}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3.5 text-xs text-gray-400 italic bg-slate-50/50 rounded-xl border border-gray-200 text-center">
                No active AMC contract covering this asset.
              </div>
            )}
          </div>

          {/* Warranty Lifecycle Coverage Card */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2 text-gray-900 font-bold text-sm">
                <ShieldCheck size={16} className="text-blue-600" />
                <h3>Warranty Lifecycle Coverage</h3>
              </div>
              <WarrantyStatusBadge
                status={equipment.warrantyStatus}
                expiryDate={equipment.warrantyEndDate}
              />
            </div>

            {/* If pending activation, show callout to commission */}
            {equipment.warrantyStatus === 'PENDING_ACTIVATION' && (
              <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-amber-900 space-y-2">
                <div className="flex items-start gap-2 text-xs">
                  <Clock size={15} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block text-amber-950">Awaiting Commissioning</span>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      Warranty coverage activates upon official commissioning. Expiry date and proposed AMC start date will be established deterministically.
                    </p>
                  </div>
                </div>
                {canCommission && (
                  <button
                    onClick={() => setIsCommissionModalOpen(true)}
                    className="w-full py-1.5 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <ShieldCheck size={13} />
                    Commission Equipment Now
                  </button>
                )}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-gray-500 block text-[10px] uppercase font-semibold tracking-wider mb-0.5">
                    Installation Date
                  </span>
                  <span className="text-gray-900 font-semibold font-mono">
                    {equipment.installationDate
                      ? new Date(equipment.installationDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : 'Not installed'}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-gray-500 block text-[10px] uppercase font-semibold tracking-wider mb-0.5">
                    Warranty Duration
                  </span>
                  <span className="text-gray-900 font-semibold">
                    {equipment.warrantyDurationValue
                      ? `${equipment.warrantyDurationValue} ${equipment.warrantyDurationUnit || 'MONTHS'}`
                      : '—'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-gray-500 block text-[10px] uppercase font-semibold tracking-wider mb-0.5">
                    Warranty Start Date
                  </span>
                  <span className="text-gray-900 font-semibold font-mono">
                    {equipment.warrantyStartDate
                      ? new Date(equipment.warrantyStartDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '—'}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-gray-500 block text-[10px] uppercase font-semibold tracking-wider mb-0.5">
                    Warranty Expiry Date
                  </span>
                  <span className="text-emerald-700 font-semibold font-mono">
                    {equipment.warrantyEndDate
                      ? new Date(equipment.warrantyEndDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '—'}
                  </span>
                </div>
              </div>

              {/* Proposed AMC Start Date */}
              {derivedAmcStartDate && (
                <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-200/80 flex items-center justify-between">
                  <div>
                    <span className="text-gray-700 font-semibold text-[11px] block">
                      Proposed AMC Start Date
                    </span>
                    <span className="text-[10px] text-gray-500 block">
                      Projected post-warranty transition date (Not active AMC)
                    </span>
                  </div>
                  <span className="font-bold text-blue-800 font-mono text-xs">
                    {new Date(derivedAmcStartDate).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              )}

              {/* Commissioning Metadata (when available) */}
              {(equipment.commissionedAt || equipment.commissionedById) && (
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-[11px]">
                  <span className="text-gray-500 block text-[10px] uppercase font-semibold tracking-wider">
                    Commissioning Metadata
                  </span>
                  {equipment.commissionedAt && (
                    <div className="text-gray-700 flex items-center justify-between">
                      <span className="text-gray-500">Commissioned At:</span>
                      <span className="font-medium text-gray-900">
                        {new Date(equipment.commissionedAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  )}
                  {equipment.commissionedById && (
                    <div className="text-gray-700 flex items-center justify-between">
                      <span className="text-gray-500">Commissioned By ID:</span>
                      <span className="font-mono text-gray-900 text-[10px]" title={equipment.commissionedById}>
                        {equipment.commissionedById}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Commissioning Notes (when present) */}
              {equipment.commissioningNotes && (
                <div>
                  <span className="text-gray-500 block text-[11px] font-medium mb-1">Commissioning Notes</span>
                  <p className="text-gray-700 text-xs bg-slate-50 p-2.5 rounded-lg border border-gray-200 whitespace-pre-wrap">
                    {equipment.commissioningNotes}
                  </p>
                </div>
              )}

              {/* Warranty Terms Snapshot */}
              {equipment.warrantyTermsSnapshot && (
                <div>
                  <span className="text-gray-500 block text-[11px] font-medium mb-1">Warranty Terms Snapshot</span>
                  <p className="text-gray-700 text-xs bg-slate-50 p-2.5 rounded-lg border border-gray-200">
                    {equipment.warrantyTermsSnapshot}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Operational Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white border border-gray-100 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-slate-50/50">
              <div className="flex items-center gap-2 text-gray-900 font-bold">
                <Edit3 size={18} className="text-blue-600" />
                <h3>Edit Operational Information</h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateOperational} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Serial Number (Physical Unit)
                </label>
                <input
                  type="text"
                  value={editForm.serialNumber || ''}
                  onChange={(e) => setEditForm({ ...editForm, serialNumber: e.target.value })}
                  placeholder="e.g. SN-892348"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Installation Location
                </label>
                <input
                  type="text"
                  value={editForm.installationLocation || ''}
                  onChange={(e) => setEditForm({ ...editForm, installationLocation: e.target.value })}
                  placeholder="e.g. Building 4, 2nd Floor Server Room, Rack 2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Installation Date
                </label>
                <input
                  type="date"
                  disabled={isInstallationDateLocked}
                  value={editForm.installationDate || ''}
                  onChange={(e) => setEditForm({ ...editForm, installationDate: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg text-xs focus:ring-2 focus:ring-blue-500 ${
                    isInstallationDateLocked
                      ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed'
                      : 'border-gray-300 bg-white text-gray-900'
                  }`}
                />
                {isInstallationDateLocked ? (
                  <p className="text-[11px] text-amber-700 mt-1 flex items-center gap-1">
                    <Info size={12} className="shrink-0" />
                    Installation date cannot be modified because warranty is already{' '}
                    {equipment.warrantyStatus === 'ACTIVE' ? 'active' : 'expiring soon'}.
                  </p>
                ) : (
                  <p className="text-[11px] text-gray-500 mt-1">
                    Date this unit was installed on customer site.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Condition Status</label>
                  <select
                    value={editForm.conditionStatus}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
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
                    value={editForm.assetStatus}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
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

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Installation / Site Notes
                </label>
                <textarea
                  rows={3}
                  value={editForm.installationNotes || ''}
                  onChange={(e) => setEditForm({ ...editForm, installationNotes: e.target.value })}
                  placeholder="Notes on installation conditions, battery rack layout, ambient temperature, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {submittingEdit && <Loader2 size={13} className="animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Commissioning Modal */}
      {isCommissionModalOpen && equipment && (
        <CommissionEquipmentModal
          isOpen={isCommissionModalOpen}
          onClose={() => setIsCommissionModalOpen(false)}
          equipment={equipment}
          onSuccess={handleCommissionSuccess}
          onConflict={fetchEquipmentDetails}
        />
      )}
    </div>
  );
};
