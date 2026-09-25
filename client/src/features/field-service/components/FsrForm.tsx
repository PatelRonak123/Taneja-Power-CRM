import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../../stores/authStore';
import { customerService } from '../../customers/services/customerService';
import { productService } from '../../products/services/productService';
import { employeeService } from '../../admin/services/employeeService';
import { Customer, CustomerDestination } from '../../customers/types/customer.types';
import { Product } from '../../products/types/product.types';
import { Employee } from '../../admin/types/employee.types';
import {
  CreateFsrPayload,
  FsrDetailedView,
  FsrCallType,
  FsrWarrantyStatus,
  FsrBillingStatus,
  FsrUpsLocation,
} from '../types/field-service.types';
import {
  Building2,
  Cpu,
  Calendar,
  Activity,
  BatteryCharging,
  Wrench,
  DollarSign,
  MessageSquare,
  Plus,
  Trash2,
  Save,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';

interface FsrFormProps {
  initialData?: FsrDetailedView;
  isEditing?: boolean;
  onSubmit: (payload: CreateFsrPayload) => Promise<void>;
  isSubmitting?: boolean;
}

export const FsrForm: React.FC<FsrFormProps> = ({
  initialData,
  isEditing = false,
  onSubmit,
  isSubmitting = false,
}) => {
  const { user } = useAuthStore();
  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  // Master Data
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [destinations, setDestinations] = useState<CustomerDestination[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [engineers, setEngineers] = useState<Employee[]>([]);
  const [loadingPrerequisites, setLoadingPrerequisites] = useState(true);

  // Accordion Section States
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    customer: true,
    ups: true,
    assignment: true,
    observations: true,
    batteries: true,
    parts: true,
    charges: true,
    feedback: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const fsr = initialData?.fsr;

  // Section A: Customer Details
  const [customerId, setCustomerId] = useState(fsr?.customerId || initialData?.customer?.id || '');
  const [destinationId, setDestinationId] = useState(fsr?.destinationId || initialData?.destination?.id || '');
  const [customerPhone, setCustomerPhone] = useState(fsr?.customerPhone || initialData?.customer?.phone || '');
  const [problemReported, setProblemReported] = useState(fsr?.problemReported || '');
  const [reasonForVisit, setReasonForVisit] = useState(fsr?.reasonForVisit || '');

  // Section B: Product / UPS Details
  const [productId, setProductId] = useState(fsr?.productId || initialData?.product?.id || '');
  const [productModel, setProductModel] = useState(fsr?.productModel || initialData?.product?.name || '');
  const [productMake, setProductMake] = useState(fsr?.productMake || 'TANEJA POWER');
  const [serialNumber, setSerialNumber] = useState(fsr?.productSerialNumber || initialData?.product?.sku || '');
  const [callType, setCallType] = useState<FsrCallType>(fsr?.callType || 'PM');
  const [equipmentStatus, setEquipmentStatus] = useState<string>(
    fsr?.equipmentStatus || 'OPERATIONAL'
  );
  const [warrantyStatus, setWarrantyStatus] = useState<FsrWarrantyStatus>(
    fsr?.warrantyStatus || 'UNDER_WARRANTY'
  );
  const [billingStatus, setBillingStatus] = useState<FsrBillingStatus>(
    fsr?.billingStatus || 'NON_BILLABLE'
  );

  // Section C: Visit / Assignment
  const [visitDate, setVisitDate] = useState<string>(
    fsr?.visitDate
      ? new Date(fsr.visitDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  );
  const [serviceEngineerId, setServiceEngineerId] = useState<string>(
    fsr?.serviceEngineerId || (isAdminOrManager ? '' : user?.id || '')
  );

  // Section D: Site Observations
  const obs = initialData?.siteObservation;
  const [siteObservation, setSiteObservation] = useState({
    inputOnMains: obs?.inputOnMains || '',
    inputVoltageLN: obs?.inputVoltageLN || '',
    inputVoltageLL: obs?.inputVoltageLL || '',
    outputVoltageLN: obs?.outputVoltageLN || '',
    outputVoltageLL: obs?.outputVoltageLL || '',
    vac: obs?.vac || '',
    frequency: obs?.frequency || '',
    dcVoltage: obs?.dcVoltage || '',
    outputLoadPercent: obs?.outputLoadPercent || '',
    inputFrequency: obs?.inputFrequency || '',
    outputFrequency: obs?.outputFrequency || '',
    environmentCondition: obs?.environmentCondition || 'Good',
    environmentRemarks: obs?.environmentRemarks || '',
    upsLocation: (obs?.upsLocation || 'COMPUTER_ROOM') as FsrUpsLocation,
    otherLocationSpecification: obs?.otherLocationSpecification || '',
    observationsNotes: obs?.observationsNotes || '',
  });

  // Section E: Dynamic Battery Banks & Readings
  const [batteryBanks, setBatteryBanks] = useState<
    Array<{
      bankNumber: number;
      bankDescription: string;
      make: string;
      ah: string;
      quantity: number;
      frontIndication: string;
      voltage: string;
      chargingCurrent: string;
      dischargingCurrent: string;
      remarks: string;
      readings: Array<{
        batteryNumber: number;
        chargingVoltage: string;
        dischargingVoltage: string;
        internalResistance: string;
        remarks: string;
      }>;
    }>
  >(() => {
    if (initialData?.batteryBanks && initialData.batteryBanks.length > 0) {
      return initialData.batteryBanks.map((b, idx) => ({
        bankNumber: b.bankNumber || idx + 1,
        bankDescription: b.bankDescription || `Bank ${idx + 1}`,
        make: b.make || '',
        ah: b.ah || '',
        quantity: b.quantity || 16,
        frontIndication: b.frontIndication || '',
        voltage: b.voltage ? String(b.voltage) : '',
        chargingCurrent: b.chargingCurrent ? String(b.chargingCurrent) : '',
        dischargingCurrent: b.dischargingCurrent ? String(b.dischargingCurrent) : '',
        remarks: b.remarks || '',
        readings: b.readings && b.readings.length > 0
          ? b.readings.map((r, rIdx) => ({
              batteryNumber: r.batteryNumber || rIdx + 1,
              chargingVoltage: r.chargingVoltage ? String(r.chargingVoltage) : '',
              dischargingVoltage: r.dischargingVoltage ? String(r.dischargingVoltage) : '',
              internalResistance: r.internalResistance ? String(r.internalResistance) : '',
              remarks: r.remarks || '',
            }))
          : Array.from({ length: b.quantity || 16 }, (_, i) => ({
              batteryNumber: i + 1,
              chargingVoltage: '',
              dischargingVoltage: '',
              internalResistance: '',
              remarks: '',
            })),
      }));
    }
    return [];
  });

  // Section F: Part Replacement
  const [parts, setParts] = useState<
    Array<{
      productId?: string;
      partName: string;
      partNumber?: string;
      quantity: number;
      replacementDetails?: string;
      oldPartStatus: string;
      remarks?: string;
    }>
  >(() => {
    if (initialData?.parts && initialData.parts.length > 0) {
      return initialData.parts.map((p) => ({
        productId: p.productId || undefined,
        partName: p.partName || '',
        partNumber: p.partNumber || '',
        quantity: Number(p.quantity) || 1,
        replacementDetails: p.replacementDetails || '',
        oldPartStatus: p.oldPartStatus || 'DEFECTIVE_RETURNED',
        remarks: p.remarks || '',
      }));
    }
    return [];
  });

  // Section G: Standby / Charges
  const [standbyDetails, setStandbyDetails] = useState(fsr?.standbyDetails || '');
  const [charges, setCharges] = useState(fsr?.charges ? String(fsr.charges) : '');
  const [chargesRemarks, setChargesRemarks] = useState(fsr?.chargesRemarks || '');

  // Section H: Feedback
  const [fseFeedback, setFseFeedback] = useState(fsr?.fseFeedback || '');
  const [customerFeedback, setCustomerFeedback] = useState(fsr?.customerFeedback || '');

  // Validation Error State
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Load Prerequisites
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        setLoadingPrerequisites(true);
        const [cRes, pRes, eRes] = await Promise.allSettled([
          customerService.getCustomers({ limit: 100 }),
          productService.getProducts({ limit: 100 }),
          isAdminOrManager ? employeeService.getEmployees({ limit: 100 }) : Promise.resolve({ data: [] }),
        ]);

        if (isMounted) {
          if (cRes.status === 'fulfilled' && cRes.value?.data) {
            setCustomers(cRes.value.data);
          }
          if (pRes.status === 'fulfilled' && pRes.value?.data) {
            setProducts(pRes.value.data);
          }
          if (eRes.status === 'fulfilled' && (eRes.value as any)?.data) {
            const rawList: Employee[] = (eRes.value as any).data || [];
            const filteredEngineers = rawList.filter((e) => {
              if (e.id === fsr?.serviceEngineerId) return true;
              if (e.status !== 'ACTIVE') return false;
              if (e.workType === 'FIELD') return true;
              if (e.workType === 'OFFICE') return false;
              const des = (e.designation || '').toLowerCase();
              if (
                des.includes('office') ||
                des.includes('hr') ||
                des.includes('accountant') ||
                des.includes('admin') ||
                des.includes('operations')
              ) {
                return false;
              }
              return true;
            });
            setEngineers(filteredEngineers);
          }
        }
      } catch (err) {
        console.error('Failed to load FSR prerequisites', err);
      } finally {
        if (isMounted) {
          setLoadingPrerequisites(false);
        }
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, [isAdminOrManager]);

  // Load Destinations when Customer changes
  useEffect(() => {
    if (!customerId) {
      setDestinations([]);
      return;
    }
    let isMounted = true;
    const loadDest = async () => {
      try {
        const dRes = await customerService.getDestinations(customerId);
        if (isMounted && dRes?.data) {
          setDestinations(dRes.data);
        }
      } catch (err) {
        console.error('Failed to load customer destinations', err);
        if (isMounted) setDestinations([]);
      }
    };
    loadDest();
    return () => {
      isMounted = false;
    };
  }, [customerId]);

  // Handle Customer Select
  const handleCustomerChange = (cId: string) => {
    setCustomerId(cId);
    const selected = customers.find((c) => c.id === cId);
    if (selected) {
      if (selected.phone && !customerPhone) setCustomerPhone(selected.phone);
    }
  };

  // Handle Product Select
  const handleProductChange = (pId: string) => {
    setProductId(pId);
    const selected = products.find((p) => p.id === pId);
    if (selected) {
      if (selected.name && !productModel) setProductModel(selected.name);
      if (selected.sku && !serialNumber) setSerialNumber(selected.sku);
    }
  };

  // Battery Bank Helpers
  const addBatteryBank = () => {
    const nextBankNo = batteryBanks.length + 1;
    const defaultQty = 16;
    setBatteryBanks((prev) => [
      ...prev,
      {
        bankNumber: nextBankNo,
        bankDescription: `Battery Bank ${nextBankNo}`,
        make: 'Exide / Amaron',
        ah: '100Ah',
        quantity: defaultQty,
        frontIndication: 'Normal',
        voltage: '192V DC',
        chargingCurrent: '10A',
        dischargingCurrent: '0A',
        remarks: '',
        readings: Array.from({ length: defaultQty }, (_, i) => ({
          batteryNumber: i + 1,
          chargingVoltage: '13.5V',
          dischargingVoltage: '12.0V',
          internalResistance: '5.2mΩ',
          remarks: '',
        })),
      },
    ]);
  };

  const removeBatteryBank = (index: number) => {
    setBatteryBanks((prev) => prev.filter((_, i) => i !== index));
  };

  const updateBatteryBankField = (index: number, field: string, value: any) => {
    setBatteryBanks((prev) => {
      const updated = [...prev];
      const bank = { ...updated[index], [field]: value };

      if (field === 'quantity') {
        const qty = Math.max(1, parseInt(value, 10) || 1);
        bank.quantity = qty;
        const currentReadings = [...bank.readings];
        if (currentReadings.length < qty) {
          const toAdd = qty - currentReadings.length;
          for (let i = 0; i < toAdd; i++) {
            currentReadings.push({
              batteryNumber: currentReadings.length + 1,
              chargingVoltage: '',
              dischargingVoltage: '',
              internalResistance: '',
              remarks: '',
            });
          }
        } else if (currentReadings.length > qty) {
          currentReadings.splice(qty);
        }
        bank.readings = currentReadings;
      }

      updated[index] = bank;
      return updated;
    });
  };

  const updateBatteryReadingField = (
    bankIndex: number,
    readingIndex: number,
    field: string,
    value: string
  ) => {
    setBatteryBanks((prev) => {
      const updated = [...prev];
      const bank = { ...updated[bankIndex] };
      const readings = [...bank.readings];
      readings[readingIndex] = {
        ...readings[readingIndex],
        [field]: value,
      };
      bank.readings = readings;
      updated[bankIndex] = bank;
      return updated;
    });
  };

  // Part Replacement Helpers
  const addPart = () => {
    setParts((prev) => [
      ...prev,
      {
        partName: '',
        partNumber: '',
        quantity: 1,
        replacementDetails: '',
        oldPartStatus: 'DEFECTIVE_RETURNED',
        remarks: '',
      },
    ]);
  };

  const removePart = (index: number) => {
    setParts((prev) => prev.filter((_, i) => i !== index));
  };

  const updatePartField = (index: number, field: string, value: any) => {
    setParts((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Form Validation & Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!customerId) errors.customerId = 'Customer is required';
    if (!productModel.trim()) errors.productModel = 'Product Model is required';
    if (!productMake.trim()) errors.productMake = 'Product Make is required';
    if (!serialNumber.trim()) errors.serialNumber = 'Serial Number is required';
    if (!problemReported.trim()) errors.problemReported = 'Problem Reported is required';
    if (!visitDate) errors.visitDate = 'Visit Date is required';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      if (errors.customerId || errors.problemReported) {
        setExpandedSections((p) => ({ ...p, customer: true }));
      }
      if (errors.productModel || errors.productMake || errors.serialNumber) {
        setExpandedSections((p) => ({ ...p, ups: true }));
      }
      return;
    }

    setFormErrors({});

    const payload: CreateFsrPayload = {
      customerId,
      destinationId: destinationId || undefined,
      productId: productId || undefined,
      serviceEngineerId: serviceEngineerId || user?.id || '',
      visitDate: new Date(visitDate).toISOString(),
      problemReported: problemReported.trim(),
      reasonForVisit: reasonForVisit.trim() || undefined,
      callType,
      warrantyStatus,
      billingStatus,
      productModel: productModel.trim(),
      productMake: productMake.trim(),
      productSerialNumber: serialNumber.trim(),
      equipmentStatus,
      charges: charges ? parseFloat(charges) : 0,
      chargesRemarks: chargesRemarks.trim() || undefined,
      standbyDetails: standbyDetails.trim() || undefined,
      fseFeedback: fseFeedback.trim() || undefined,
      customerFeedback: customerFeedback.trim() || undefined,
      siteObservation: {
        ...siteObservation,
      },
      batteryBanks: batteryBanks.map((b) => ({
        bankNumber: b.bankNumber,
        bankDescription: b.bankDescription,
        make: b.make,
        ah: b.ah,
        quantity: b.quantity,
        frontIndication: b.frontIndication,
        voltage: b.voltage,
        chargingCurrent: b.chargingCurrent,
        dischargingCurrent: b.dischargingCurrent,
        remarks: b.remarks,
        readings: b.readings.map((r) => ({
          batteryNumber: r.batteryNumber,
          chargingVoltage: r.chargingVoltage,
          dischargingVoltage: r.dischargingVoltage,
          internalResistance: r.internalResistance,
          remarks: r.remarks,
        })),
      })),
      parts: parts.map((p) => ({
        productId: p.productId,
        partName: p.partName,
        partNumber: p.partNumber,
        quantity: p.quantity,
        replacementDetails: p.replacementDetails,
        oldPartStatus: p.oldPartStatus,
        remarks: p.remarks,
      })),
    };

    await onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-24">
      {/* Sticky Top Summary & Save Bar */}
      <div className="sticky top-16 z-30 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4 transition-all">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {isEditing ? `Editing FSR: ${fsr?.fsrNumber || ''}` : 'New Field Service Report (UPS)'}
            </h3>
            <p className="text-xs text-slate-500">
              {batteryBanks.length} Battery Banks • {parts.length} Parts Replaced • {callType} Visit
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all cursor-pointer"
          >
            {isSubmitting ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{isEditing ? 'Save Changes' : 'Create Service Report'}</span>
          </button>
        </div>
      </div>

      {/* SECTION A: CUSTOMER DETAILS */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs transition-all">
        <button
          type="button"
          onClick={() => toggleSection('customer')}
          className="w-full px-6 py-4 flex items-center justify-between bg-slate-50/80 hover:bg-slate-100/70 transition-colors border-b border-slate-200/80 cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h2 className="text-sm font-bold text-slate-900">A. Customer Details</h2>
              <p className="text-xs text-slate-500">
                Customer account, site destination address, contact phone, and reported issue
              </p>
            </div>
          </div>
          {expandedSections.customer ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </button>

        {expandedSections.customer && (
          <div className="p-6 space-y-5 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Customer Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Customer <span className="text-red-500">*</span>
                </label>
                <select
                  value={customerId}
                  onChange={(e) => handleCustomerChange(e.target.value)}
                  disabled={loadingPrerequisites}
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border text-slate-800 text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all ${
                    formErrors.customerId ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200'
                  }`}
                >
                  <option value="">-- Select Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName ? `${c.companyName} (${c.name})` : c.name}
                    </option>
                  ))}
                </select>
                {formErrors.customerId && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {formErrors.customerId}
                  </p>
                )}
              </div>

              {/* Destination */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Site Destination / Address
                </label>
                {destinations.length > 0 ? (
                  <select
                    value={destinationId}
                    onChange={(e) => setDestinationId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all"
                  >
                    <option value="">-- Select Site Destination --</option>
                    {destinations.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} {d.city ? `(${d.city})` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="e.g. Unit 4, Industrial Area Phase II, Mohali"
                    value={destinationId}
                    onChange={(e) => setDestinationId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all"
                  />
                )}
              </div>

              {/* Customer Phone */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Customer Phone / Mobile
                </label>
                <input
                  type="text"
                  placeholder="+91 9876543210"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Problem Reported */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Problem Reported <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Describe the complaint reported by customer, e.g. UPS tripping on inverter mode"
                  value={problemReported}
                  onChange={(e) => setProblemReported(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border text-slate-800 text-xs placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all ${
                    formErrors.problemReported ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200'
                  }`}
                />
                {formErrors.problemReported && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {formErrors.problemReported}
                  </p>
                )}
              </div>

              {/* Reason for Visit */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Reason for Visit / Scope
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Scheduled quarterly preventive maintenance and battery health check"
                  value={reasonForVisit}
                  onChange={(e) => setReasonForVisit(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION B: PRODUCT / UPS DETAILS */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs transition-all">
        <button
          type="button"
          onClick={() => toggleSection('ups')}
          className="w-full px-6 py-4 flex items-center justify-between bg-slate-50/80 hover:bg-slate-100/70 transition-colors border-b border-slate-200/80 cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600 border border-purple-100">
              <Cpu className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h2 className="text-sm font-bold text-slate-900">B. Product / UPS Details</h2>
              <p className="text-xs text-slate-500">
                Equipment specifications, model, make, serial number, warranty & call type
              </p>
            </div>
          </div>
          {expandedSections.ups ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </button>

        {expandedSections.ups && (
          <div className="p-6 space-y-5 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Product Select */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Linked Product / Item
                </label>
                <select
                  value={productId}
                  onChange={(e) => handleProductChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all"
                >
                  <option value="">-- Choose From Catalog (Optional) --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.sku ? `(${p.sku})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Model */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Model <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. TP-33200 (200kVA)"
                  value={productModel}
                  onChange={(e) => setProductModel(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border text-slate-800 text-xs placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all ${
                    formErrors.productModel ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200'
                  }`}
                />
                {formErrors.productModel && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {formErrors.productModel}
                  </p>
                )}
              </div>

              {/* Make */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Make <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. TANEJA POWER"
                  value={productMake}
                  onChange={(e) => setProductMake(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border text-slate-800 text-xs placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all ${
                    formErrors.productMake ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200'
                  }`}
                />
                {formErrors.productMake && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {formErrors.productMake}
                  </p>
                )}
              </div>

              {/* Serial Number */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Serial Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. TP-2024-8849"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border text-slate-800 text-xs placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all ${
                    formErrors.serialNumber ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200'
                  }`}
                />
                {formErrors.serialNumber && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {formErrors.serialNumber}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Call Type */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Call Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={callType}
                  onChange={(e) => setCallType(e.target.value as FsrCallType)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none font-medium transition-all"
                >
                  <option value="BD">BD (Breakdown)</option>
                  <option value="PM">PM (Preventive Maintenance)</option>
                  <option value="INSTALLATION">INSTALLATION (Commissioning)</option>
                  <option value="COURTESY">COURTESY (Courtesy Visit)</option>
                </select>
              </div>

              {/* Equipment Status */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Equipment Status
                </label>
                <select
                  value={equipmentStatus}
                  onChange={(e) => setEquipmentStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all"
                >
                  <option value="OPERATIONAL">OPERATIONAL (Working)</option>
                  <option value="UNDER_BREAKDOWN">UNDER BREAKDOWN (Down)</option>
                  <option value="STANDBY">STANDBY</option>
                  <option value="DECOMMISSIONED">DECOMMISSIONED</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </div>

              {/* Warranty Status */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Warranty Status
                </label>
                <select
                  value={warrantyStatus}
                  onChange={(e) => setWarrantyStatus(e.target.value as FsrWarrantyStatus)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all"
                >
                  <option value="UNDER_WARRANTY">UNDER WARRANTY</option>
                  <option value="OUT_OF_WARRANTY">OUT OF WARRANTY</option>
                  <option value="AMC">UNDER AMC</option>
                  <option value="BILLABLE">BILLABLE</option>
                  <option value="EXTENDED_WARRANTY">EXTENDED WARRANTY</option>
                </select>
              </div>

              {/* Billing Status */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Billing Status
                </label>
                <select
                  value={billingStatus}
                  onChange={(e) => setBillingStatus(e.target.value as FsrBillingStatus)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all"
                >
                  <option value="NON_BILLABLE">NON BILLABLE / FREE</option>
                  <option value="BILLABLE">BILLABLE / CHARGEABLE</option>
                  <option value="WARRANTY">WARRANTY COVERED</option>
                  <option value="AMC">AMC COVERED</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION C: VISIT & ASSIGNMENT */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs transition-all">
        <button
          type="button"
          onClick={() => toggleSection('assignment')}
          className="w-full px-6 py-4 flex items-center justify-between bg-slate-50/80 hover:bg-slate-100/70 transition-colors border-b border-slate-200/80 cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h2 className="text-sm font-bold text-slate-900">C. Visit & Field Engineer Assignment</h2>
              <p className="text-xs text-slate-500">
                Scheduled visit date and authorized Service Engineer assignment
              </p>
            </div>
          </div>
          {expandedSections.assignment ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </button>

        {expandedSections.assignment && (
          <div className="p-6 space-y-5 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Visit Date */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Visit Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={visitDate}
                  onChange={(e) => setVisitDate(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border text-slate-800 text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all ${
                    formErrors.visitDate ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200'
                  }`}
                />
              </div>

              {/* Service Engineer */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Assigned Field Service Engineer (FSE)
                </label>
                {isAdminOrManager ? (
                  <select
                    value={serviceEngineerId}
                    onChange={(e) => setServiceEngineerId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all font-medium cursor-pointer"
                  >
                    <option value="" className="text-slate-500 bg-white">-- Assign Field Service Engineer --</option>
                    {engineers.map((emp) => (
                      <option key={emp.id} value={emp.id} className="text-slate-900 bg-white">
                        {emp.fullName} {emp.designation ? `(${emp.designation})` : ''} - {emp.email}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="px-3.5 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium">
                    {user?.fullName || user?.email || 'Logged In Engineer'} (Assigned to You)
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION D: SITE OBSERVATIONS */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs transition-all">
        <button
          type="button"
          onClick={() => toggleSection('observations')}
          className="w-full px-6 py-4 flex items-center justify-between bg-slate-50/80 hover:bg-slate-100/70 transition-colors border-b border-slate-200/80 cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
              <Activity className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h2 className="text-sm font-bold text-slate-900">D. Site Observations & Electrical Readings</h2>
              <p className="text-xs text-slate-500">
                Input/Output voltages, frequency, room environment, UPS location, and parameters
              </p>
            </div>
          </div>
          {expandedSections.observations ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </button>

        {expandedSections.observations && (
          <div className="p-6 space-y-6 animate-fade-in">
            {/* Electrical Readings Grid */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" /> Electrical Parameters
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Input on Mains
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Yes / Normal"
                    value={siteObservation.inputOnMains}
                    onChange={(e) => setSiteObservation({ ...siteObservation, inputOnMains: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Input Voltage (L-N)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 230 V"
                    value={siteObservation.inputVoltageLN}
                    onChange={(e) => setSiteObservation({ ...siteObservation, inputVoltageLN: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Input Voltage (L-L)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 400 V"
                    value={siteObservation.inputVoltageLL}
                    onChange={(e) => setSiteObservation({ ...siteObservation, inputVoltageLL: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Output Voltage (L-N)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 230 V"
                    value={siteObservation.outputVoltageLN}
                    onChange={(e) => setSiteObservation({ ...siteObservation, outputVoltageLN: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Output Voltage (L-L)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 400 V"
                    value={siteObservation.outputVoltageLL}
                    onChange={(e) => setSiteObservation({ ...siteObservation, outputVoltageLL: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    VAC
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 415 VAC"
                    value={siteObservation.vac}
                    onChange={(e) => setSiteObservation({ ...siteObservation, vac: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Input Frequency
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 50.0 Hz"
                    value={siteObservation.inputFrequency}
                    onChange={(e) => setSiteObservation({ ...siteObservation, inputFrequency: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Output Frequency
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 50.0 Hz"
                    value={siteObservation.outputFrequency}
                    onChange={(e) => setSiteObservation({ ...siteObservation, outputFrequency: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    DC Voltage
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 216 V DC"
                    value={siteObservation.dcVoltage}
                    onChange={(e) => setSiteObservation({ ...siteObservation, dcVoltage: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Output Load %
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 65%"
                    value={siteObservation.outputLoadPercent}
                    onChange={(e) => setSiteObservation({ ...siteObservation, outputLoadPercent: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Environment & Location */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Environment Condition */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Environment Condition
                </label>
                <select
                  value={siteObservation.environmentCondition}
                  onChange={(e) => setSiteObservation({ ...siteObservation, environmentCondition: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all"
                >
                  <option value="Good">Satisfactory / Good</option>
                  <option value="Fair">Fair / Normal</option>
                  <option value="Deficient">Deficient / Poor</option>
                </select>
              </div>

              {/* Environment Remarks */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Environment Remarks
                </label>
                <input
                  type="text"
                  placeholder="e.g. Air conditioning working, dust free"
                  value={siteObservation.environmentRemarks}
                  onChange={(e) => setSiteObservation({ ...siteObservation, environmentRemarks: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all"
                />
              </div>

              {/* UPS Location */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  UPS Location
                </label>
                <select
                  value={siteObservation.upsLocation}
                  onChange={(e) =>
                    setSiteObservation({ ...siteObservation, upsLocation: e.target.value as FsrUpsLocation })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all"
                >
                  <option value="COMPUTER_ROOM">Computer Room</option>
                  <option value="ELECTRICAL_ROOM">Electrical Room</option>
                  <option value="NETWORK_ROOM">Network Room</option>
                  <option value="OTHER">Other Location</option>
                </select>
                {siteObservation.upsLocation === 'OTHER' && (
                  <input
                    type="text"
                    placeholder="Specify other location..."
                    value={siteObservation.otherLocationSpecification}
                    onChange={(e) =>
                      setSiteObservation({ ...siteObservation, otherLocationSpecification: e.target.value })
                    }
                    className="w-full mt-2 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all"
                  />
                )}
              </div>
            </div>

            {/* General Observations */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Detailed Observation Notes
              </label>
              <textarea
                rows={3}
                placeholder="Overall physical inspection notes, audible alarms, fan rotation, DC bus stability, capacitor health, etc."
                value={siteObservation.observationsNotes}
                onChange={(e) => setSiteObservation({ ...siteObservation, observationsNotes: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all"
              />
            </div>
          </div>
        )}
      </div>

      {/* SECTION E: BATTERY BANKS & READINGS (DYNAMIC QUANTITY) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs transition-all">
        <button
          type="button"
          onClick={() => toggleSection('batteries')}
          className="w-full px-6 py-4 flex items-center justify-between bg-slate-50/80 hover:bg-slate-100/70 transition-colors border-b border-slate-200/80 cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
              <BatteryCharging className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h2 className="text-sm font-bold text-slate-900">
                E. Battery Bank Records & Dynamic Cell Readings
              </h2>
              <p className="text-xs text-slate-500">
                Variable battery configurations (10, 16, 20, 32 cells etc.) with individual voltages and resistance
              </p>
            </div>
          </div>
          {expandedSections.batteries ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </button>

        {expandedSections.batteries && (
          <div className="p-6 space-y-6 animate-fade-in">
            {batteryBanks.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-2xl">
                <BatteryCharging className="w-10 h-10 text-slate-300 mx-auto mb-2 opacity-60" />
                <p className="text-xs font-semibold text-slate-700">
                  No Battery Banks Added
                </p>
                <p className="text-[11px] text-slate-400 mb-4">
                  Add a battery bank to record Ah rating, total quantity, and cell level readings.
                </p>
                <button
                  type="button"
                  onClick={addBatteryBank}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add Battery Bank
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {batteryBanks.map((bank, bankIdx) => (
                  <div
                    key={bankIdx}
                    className="border border-slate-200 rounded-2xl p-5 bg-slate-50/50 space-y-4"
                  >
                    {/* Bank Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                          #{bank.bankNumber}
                        </span>
                        <input
                          type="text"
                          value={bank.bankDescription}
                          onChange={(e) => updateBatteryBankField(bankIdx, 'bankDescription', e.target.value)}
                          placeholder="Bank Description"
                          className="font-bold text-xs bg-transparent border-b border-dashed border-slate-300 focus:border-blue-500 text-slate-900 px-1 py-0.5 focus:outline-none"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => removeBatteryBank(bankIdx)}
                        className="px-2.5 py-1 text-xs text-rose-500 hover:bg-rose-50 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove Bank
                      </button>
                    </div>

                    {/* Bank Specifications */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Make
                        </label>
                        <input
                          type="text"
                          value={bank.make}
                          onChange={(e) => updateBatteryBankField(bankIdx, 'make', e.target.value)}
                          placeholder="e.g. Exide / Amaron"
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Rating (Ah)
                        </label>
                        <input
                          type="text"
                          value={bank.ah}
                          onChange={(e) => updateBatteryBankField(bankIdx, 'ah', e.target.value)}
                          placeholder="e.g. 100Ah"
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-blue-700 mb-1">
                          Quantity (Cells)
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={128}
                          value={bank.quantity}
                          onChange={(e) => updateBatteryBankField(bankIdx, 'quantity', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-blue-50 border border-blue-200 font-bold text-xs text-blue-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Total Voltage
                        </label>
                        <input
                          type="text"
                          value={bank.voltage}
                          onChange={(e) => updateBatteryBankField(bankIdx, 'voltage', e.target.value)}
                          placeholder="e.g. 192V DC"
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Charging Current
                        </label>
                        <input
                          type="text"
                          value={bank.chargingCurrent}
                          onChange={(e) => updateBatteryBankField(bankIdx, 'chargingCurrent', e.target.value)}
                          placeholder="e.g. 10A"
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Discharging Current
                        </label>
                        <input
                          type="text"
                          value={bank.dischargingCurrent}
                          onChange={(e) => updateBatteryBankField(bankIdx, 'dischargingCurrent', e.target.value)}
                          placeholder="e.g. 25A"
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Dynamic Reading Rows */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Cell Readings ({bank.readings.length} Batteries)
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Values automatically saved in report
                        </span>
                      </div>

                      <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-96">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-100 text-slate-600 sticky top-0 z-10">
                            <tr>
                              <th className="px-3 py-2 w-16 text-center font-bold">Cell #</th>
                              <th className="px-3 py-2 font-semibold">Charging Voltage</th>
                              <th className="px-3 py-2 font-semibold">Discharging Voltage</th>
                              <th className="px-3 py-2 font-semibold">Resistance (mΩ)</th>
                              <th className="px-3 py-2 font-semibold">Remarks</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {bank.readings.map((reading, rIdx) => (
                              <tr key={rIdx} className="hover:bg-slate-50 transition-colors">
                                <td className="px-3 py-1.5 text-center font-bold text-slate-500">
                                  {reading.batteryNumber}
                                </td>
                                <td className="px-2 py-1.5">
                                  <input
                                    type="text"
                                    placeholder="e.g. 13.6V"
                                    value={reading.chargingVoltage}
                                    onChange={(e) =>
                                      updateBatteryReadingField(bankIdx, rIdx, 'chargingVoltage', e.target.value)
                                    }
                                    className="w-full px-2 py-1 bg-slate-50 rounded border border-slate-200 text-xs text-slate-800 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                  />
                                </td>
                                <td className="px-2 py-1.5">
                                  <input
                                    type="text"
                                    placeholder="e.g. 12.1V"
                                    value={reading.dischargingVoltage}
                                    onChange={(e) =>
                                      updateBatteryReadingField(bankIdx, rIdx, 'dischargingVoltage', e.target.value)
                                    }
                                    className="w-full px-2 py-1 bg-slate-50 rounded border border-slate-200 text-xs text-slate-800 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                  />
                                </td>
                                <td className="px-2 py-1.5">
                                  <input
                                    type="text"
                                    placeholder="e.g. 4.8mΩ"
                                    value={reading.internalResistance}
                                    onChange={(e) =>
                                      updateBatteryReadingField(bankIdx, rIdx, 'internalResistance', e.target.value)
                                    }
                                    className="w-full px-2 py-1 bg-slate-50 rounded border border-slate-200 text-xs text-slate-800 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                  />
                                </td>
                                <td className="px-2 py-1.5">
                                  <input
                                    type="text"
                                    placeholder="e.g. Ok"
                                    value={reading.remarks}
                                    onChange={(e) =>
                                      updateBatteryReadingField(bankIdx, rIdx, 'remarks', e.target.value)
                                    }
                                    className="w-full px-2 py-1 bg-slate-50 rounded border border-slate-200 text-xs text-slate-800 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addBatteryBank}
                  className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add Another Battery Bank
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION F: PART REPLACEMENT */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs transition-all">
        <button
          type="button"
          onClick={() => toggleSection('parts')}
          className="w-full px-6 py-4 flex items-center justify-between bg-slate-50/80 hover:bg-slate-100/70 transition-colors border-b border-slate-200/80 cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-50 text-rose-600 border border-rose-100">
              <Wrench className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h2 className="text-sm font-bold text-slate-900">F. Part Replacement Details</h2>
              <p className="text-xs text-slate-500">
                Components, fans, cards, or batteries replaced during the service call
              </p>
            </div>
          </div>
          {expandedSections.parts ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </button>

        {expandedSections.parts && (
          <div className="p-6 space-y-4 animate-fade-in">
            {parts.length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-2xl">
                <p className="text-xs text-slate-500 mb-3">
                  No parts replaced or consumed during this service visit.
                </p>
                <button
                  type="button"
                  onClick={addPart}
                  className="px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Part
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {parts.map((part, pIdx) => (
                  <div
                    key={pIdx}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end"
                  >
                    <div className="lg:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Part Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Cooling Fan 24V DC / Control Card"
                        value={part.partName}
                        onChange={(e) => updatePartField(pIdx, 'partName', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Part / Serial No
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. FAN-24V-80MM"
                        value={part.partNumber}
                        onChange={(e) => updatePartField(pIdx, 'partNumber', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Qty
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={part.quantity}
                        onChange={(e) => updatePartField(pIdx, 'quantity', parseInt(e.target.value, 10) || 1)}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Old Part Status
                      </label>
                      <select
                        value={part.oldPartStatus}
                        onChange={(e) => updatePartField(pIdx, 'oldPartStatus', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="DEFECTIVE_RETURNED">Defective Returned</option>
                        <option value="SCRAPPED">Scrapped at Site</option>
                        <option value="WITH_CUSTOMER">Left With Customer</option>
                        <option value="PENDING_INSPECTION">Pending Inspection</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Remarks
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Replaced under warranty"
                          value={part.remarks}
                          onChange={(e) => updatePartField(pIdx, 'remarks', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removePart(pIdx)}
                        className="p-2 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
                        title="Delete part"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addPart}
                  className="px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Another Part
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION G: STANDBY & CHARGES */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs transition-all">
        <button
          type="button"
          onClick={() => toggleSection('charges')}
          className="w-full px-6 py-4 flex items-center justify-between bg-slate-50/80 hover:bg-slate-100/70 transition-colors border-b border-slate-200/80 cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
              <DollarSign className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h2 className="text-sm font-bold text-slate-900">G. Standby Equipment & Service Charges</h2>
              <p className="text-xs text-slate-500">
                Standby provided, visit charges in INR, and billing remarks
              </p>
            </div>
          </div>
          {expandedSections.charges ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </button>

        {expandedSections.charges && (
          <div className="p-6 space-y-5 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Standby Details */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Standby Details
                </label>
                <input
                  type="text"
                  placeholder="e.g. 10kVA temporary standby unit installed"
                  value={standbyDetails}
                  onChange={(e) => setStandbyDetails(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all"
                />
              </div>

              {/* Service Charges */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Service Charges (₹ INR)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={charges}
                  onChange={(e) => setCharges(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all"
                />
              </div>

              {/* Charges Remarks */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Charges Remarks
                </label>
                <input
                  type="text"
                  placeholder="e.g. Visit charges billed as per AMC clause 4.2"
                  value={chargesRemarks}
                  onChange={(e) => setChargesRemarks(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION H: FEEDBACK */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs transition-all">
        <button
          type="button"
          onClick={() => toggleSection('feedback')}
          className="w-full px-6 py-4 flex items-center justify-between bg-slate-50/80 hover:bg-slate-100/70 transition-colors border-b border-slate-200/80 cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h2 className="text-sm font-bold text-slate-900">H. Feedback & Engineer Recommendations</h2>
              <p className="text-xs text-slate-500">
                FSE suggestions and customer site satisfaction feedback
              </p>
            </div>
          </div>
          {expandedSections.feedback ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </button>

        {expandedSections.feedback && (
          <div className="p-6 space-y-5 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* FSE Feedback */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  FSE Feedback / Suggestions
                </label>
                <textarea
                  rows={3}
                  placeholder="Recommend replacement of battery bank 2 within 6 months, clean air filters monthly..."
                  value={fseFeedback}
                  onChange={(e) => setFseFeedback(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all"
                />
              </div>

              {/* Customer Feedback */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Customer Feedback / Comments
                </label>
                <textarea
                  rows={3}
                  placeholder="Customer remarks on engineer response time and UPS performance..."
                  value={customerFeedback}
                  onChange={(e) => setCustomerFeedback(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Submit Action */}
      <div className="flex items-center justify-end gap-4 pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>{isEditing ? 'Save FSR Changes' : 'Create Service Report'}</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};
