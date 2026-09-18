import React, { useState, useEffect } from 'react';
import {
  CreateQuotationPayload,
  LineItemFormInput,
  QuotationType,
  QuotationDetailedView,
} from '../types/quotation.types';
import { customerService } from '../../customers/services/customerService';
import { productService } from '../../products/services/productService';
import { Customer, CustomerDestination } from '../../customers/types/customer.types';
import { Product } from '../../products/types/product.types';
import {
  Plus,
  Trash2,
  Building2,
  Package,
  FileText,
  DollarSign,
  AlertTriangle,
  Save,
} from 'lucide-react';

interface Props {
  initialData?: QuotationDetailedView;
  isEditing?: boolean;
  onSubmit: (payload: CreateQuotationPayload) => Promise<void>;
  isSubmitting?: boolean;
}

export const QuotationForm: React.FC<Props> = ({
  initialData,
  isEditing = false,
  onSubmit,
  isSubmitting = false,
}) => {
  // Master lists
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [destinations, setDestinations] = useState<CustomerDestination[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Selected entities
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    initialData?.customerId || ''
  );
  const [selectedDestinationId, setSelectedDestinationId] = useState<string>(
    initialData?.destinationId || ''
  );

  // Header State
  const [quotationType, setQuotationType] = useState<QuotationType>(
    initialData?.quotationType || 'PRODUCT'
  );
  const [quotationDate, setQuotationDate] = useState<string>(
    initialData?.currentRevision?.quotationDate
      ? new Date(initialData.currentRevision.quotationDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  );
  const [validityDays, setValidityDays] = useState<number>(
    initialData?.currentRevision?.validityDays || 30
  );
  const [currency] = useState<string>(
    initialData?.currentRevision?.currency || 'INR'
  );
  const [subject, setSubject] = useState<string>(
    initialData?.currentRevision?.subject || ''
  );

  // Line Items State
  const [items, setItems] = useState<LineItemFormInput[]>(() => {
    if (initialData?.currentRevision?.items && initialData.currentRevision.items.length > 0) {
      return initialData.currentRevision.items.map((it) => ({
        productId: it.productId || null,
        itemType: it.itemType,
        productName: it.productName,
        productSku: it.productSku || null,
        description: it.description || null,
        make: it.make || null,
        model: it.model || null,
        technicalSpecifications: it.technicalSpecifications || null,
        hsnSac: it.hsnSac || null,
        unit: it.unit || 'NOS',
        quantity: parseFloat(it.quantity) || 1,
        unitPrice: parseFloat(it.unitPrice) || 0,
        discountPercent: parseFloat(it.discountPercent) || 0,
        discountAmount: parseFloat(it.discountAmount) || 0,
        gstRate: parseFloat(it.gstRate) || 18,
        serviceDurationMonths: it.serviceDurationMonths || null,
        serviceVisitsIncluded: it.serviceVisitsIncluded || null,
        serviceScope: it.serviceScope || null,
        sortOrder: it.sortOrder || 0,
      }));
    }
    return [
      {
        itemType: 'PRODUCT',
        productName: '',
        unit: 'NOS',
        quantity: 1,
        unitPrice: 0,
        discountPercent: 0,
        discountAmount: 0,
        gstRate: 18,
        sortOrder: 0,
      },
    ];
  });

  // Additional Charges
  const [freightCharges, setFreightCharges] = useState<number>(
    initialData?.currentRevision?.freightCharges
      ? parseFloat(initialData.currentRevision.freightCharges)
      : 0
  );
  const [otherCharges, setOtherCharges] = useState<number>(
    initialData?.currentRevision?.otherCharges
      ? parseFloat(initialData.currentRevision.otherCharges)
      : 0
  );
  const [roundOff, setRoundOff] = useState<number>(
    initialData?.currentRevision?.roundOff
      ? parseFloat(initialData.currentRevision.roundOff)
      : 0
  );

  // Terms & Notes
  const [termsAndConditions, setTermsAndConditions] = useState<string>(
    initialData?.currentRevision?.termsAndConditions ||
      '1. Prices are valid for 30 days from quotation date.\n2. Taxes extra as applicable under Indian GST laws.\n3. Standard warranty applies.'
  );
  const [paymentTerms, setPaymentTerms] = useState<string>(
    initialData?.currentRevision?.paymentTerms || '50% Advance with Purchase Order, 50% on dispatch.'
  );
  const [deliveryTerms, setDeliveryTerms] = useState<string>(
    initialData?.currentRevision?.deliveryTerms || 'Ready stock subject to prior sales / 2-3 weeks.'
  );
  const [warrantyTerms, setWarrantyTerms] = useState<string>(
    initialData?.currentRevision?.warrantyTerms || '12 Months standard manufacturer warranty.'
  );
  const [notes, setNotes] = useState<string>(initialData?.currentRevision?.notes || '');
  const [internalRemarks, setInternalRemarks] = useState<string>(
    initialData?.currentRevision?.internalRemarks || ''
  );

  const [formError, setFormError] = useState<string | null>(null);

  // Load initial customers and products
  useEffect(() => {
    const loadPrerequisites = async () => {
      try {
        setLoadingData(true);
        const [custRes, prodRes] = await Promise.all([
          customerService.getCustomers({ limit: 100 }),
          productService.getProducts({ limit: 100 }),
        ]);

        if (custRes.data) setCustomers(custRes.data);
        if (prodRes.data) setProducts(prodRes.data);
      } catch (err) {
        console.error('Failed to load customers/products', err);
      } finally {
        setLoadingData(false);
      }
    };

    loadPrerequisites();
  }, []);

  // Load destinations when selected customer changes
  useEffect(() => {
    if (!selectedCustomerId) {
      setDestinations([]);
      return;
    }

    const loadDestinations = async () => {
      try {
        const res = await customerService.getDestinations(selectedCustomerId);
        if (res.data) {
          setDestinations(res.data);
        }
      } catch (err) {
        console.error('Failed to load destinations', err);
      }
    };

    loadDestinations();
  }, [selectedCustomerId]);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) || initialData?.customer;
  const selectedDestination = destinations.find((d) => d.id === selectedDestinationId) || initialData?.destination;

  // Determine state for provisional tax calculation
  const customerState = selectedDestination?.state || selectedCustomer?.state || 'Gujarat';
  const isIntraState =
    customerState.trim().toLowerCase() === 'gujarat' ||
    customerState.trim().toLowerCase() === 'gj' ||
    customerState.trim().toLowerCase().includes('gujarat');

  // Handle line item modifications
  const handleItemChange = (index: number, field: keyof LineItemFormInput, value: any) => {
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };

      // If product selection changed
      if (field === 'productId') {
        const prod = products.find((p) => p.id === value);
        if (prod) {
          item.productName = prod.name;
          item.productSku = prod.sku;
          item.unitPrice = Number(prod.price) || 0;
          item.description = prod.description || '';
        }
      }

      // If discount percent changed, recalculate discount amount
      if (field === 'discountPercent') {
        const gross = item.quantity * item.unitPrice;
        item.discountAmount = Math.round((gross * (Number(value) / 100)) * 100) / 100;
      }

      // If discount amount changed, recalculate discount percent
      if (field === 'discountAmount') {
        const gross = item.quantity * item.unitPrice;
        item.discountPercent = gross > 0 ? Math.round((Number(value) / gross) * 10000) / 100 : 0;
      }

      updated[index] = item;
      return updated;
    });
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        itemType: quotationType === 'AMC' ? 'AMC' : quotationType === 'SERVICE' ? 'SERVICE' : 'PRODUCT',
        productName: '',
        unit: 'NOS',
        quantity: 1,
        unitPrice: 0,
        discountPercent: 0,
        discountAmount: 0,
        gstRate: 18,
        sortOrder: prev.length,
      },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Provisional Frontend Calculation for UX
  const calculateProvisionalSummary = () => {
    let subtotal = 0;
    let totalDiscount = 0;
    let taxableAmount = 0;
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;

    items.forEach((item) => {
      const gross = item.quantity * item.unitPrice;
      const discount = item.discountAmount || (gross * (item.discountPercent || 0)) / 100;
      const taxable = Math.max(0, gross - discount);
      const gstRate = item.gstRate || 0;

      subtotal += gross;
      totalDiscount += discount;
      taxableAmount += taxable;

      if (isIntraState) {
        const cgst = (taxable * (gstRate / 2)) / 100;
        const sgst = (taxable * (gstRate / 2)) / 100;
        cgstAmount += cgst;
        sgstAmount += sgst;
      } else {
        const igst = (taxable * gstRate) / 100;
        igstAmount += igst;
      }
    });

    const totalTax = cgstAmount + sgstAmount + igstAmount;
    const rawGrandTotal = taxableAmount + totalTax + (freightCharges || 0) + (otherCharges || 0);
    const grandTotal = Math.round((rawGrandTotal + (roundOff || 0)) * 100) / 100;

    return {
      subtotal,
      totalDiscount,
      taxableAmount,
      cgstAmount,
      sgstAmount,
      igstAmount,
      totalTax,
      grandTotal,
    };
  };

  const provisional = calculateProvisionalSummary();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCustomerId) {
      setFormError('Please select a customer.');
      return;
    }

    if (items.length === 0 || items.some((i) => !i.productName.trim() || i.quantity <= 0)) {
      setFormError('Please ensure all line items have a valid name and quantity greater than 0.');
      return;
    }

    setFormError(null);

    const payload: CreateQuotationPayload = {
      quotationType,
      customerId: selectedCustomerId,
      destinationId: selectedDestinationId || null,
      quotationDate,
      validityDays: Number(validityDays),
      currency,
      subject: subject.trim() || null,
      termsAndConditions: termsAndConditions.trim() || null,
      paymentTerms: paymentTerms.trim() || null,
      deliveryTerms: deliveryTerms.trim() || null,
      warrantyTerms: warrantyTerms.trim() || null,
      notes: notes.trim() || null,
      internalRemarks: internalRemarks.trim() || null,
      freightCharges: Number(freightCharges) || 0,
      otherCharges: Number(otherCharges) || 0,
      roundOff: Number(roundOff) || 0,
      items: items.map((it, idx) => ({
        ...it,
        quantity: Number(it.quantity),
        unitPrice: Number(it.unitPrice),
        discountPercent: Number(it.discountPercent) || 0,
        discountAmount: Number(it.discountAmount) || 0,
        gstRate: Number(it.gstRate) || 0,
        sortOrder: idx,
      })),
    };

    await onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-7xl mx-auto pb-16">
      {/* Pending Approval Warning Alert */}
      {isEditing && initialData?.status === 'PENDING_APPROVAL' && (
        <div className="p-4 bg-amber-50 border border-amber-300/80 rounded-2xl flex items-start gap-3 shadow-xs">
          <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
          <div className="flex flex-col gap-0.5">
            <h4 className="text-xs font-bold text-amber-900">
              Editing Pending Quotation (Auto-Withdrawal Notice)
            </h4>
            <p className="text-xs text-amber-700 leading-relaxed">
              This quotation is currently in <strong>Pending Approval</strong>. Saving changes will automatically withdraw its approval submission and revert the status back to <strong>Draft</strong>. It must be submitted for management approval again before dispatch.
            </p>
          </div>
        </div>
      )}

      {formError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-2xl shadow-xs">
          {formError}
        </div>
      )}

      {/* SECTION 1: HEADER & CUSTOMER DETAILS */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col gap-5">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Building2 size={18} className="text-blue-600" />
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            1. Quotation Header & Client Setup
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Quotation Type */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700">Quotation Type</label>
            <select
              value={quotationType}
              onChange={(e) => {
                const newType = e.target.value as QuotationType;
                setQuotationType(newType);
                setItems((prev) =>
                  prev.map((it) => ({
                    ...it,
                    itemType: newType === 'AMC' ? 'AMC' : newType === 'SERVICE' ? 'SERVICE' : 'PRODUCT',
                  }))
                );
              }}
              className="px-3 py-2 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white"
            >
              <option value="PRODUCT">Normal Product Supply</option>
              <option value="TECHNICAL">Technical High Voltage Equipment</option>
              <option value="SERVICE">Service / Repair / Testing</option>
              <option value="AMC">Annual Maintenance Contract (AMC)</option>
            </select>
          </div>

          {/* Quotation Date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700">Quotation Date</label>
            <input
              type="date"
              value={quotationDate}
              onChange={(e) => setQuotationDate(e.target.value)}
              className="px-3 py-2 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white"
              required
            />
          </div>

          {/* Validity Days */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700">Validity Period (Days)</label>
            <input
              type="number"
              min={1}
              max={365}
              value={validityDays}
              onChange={(e) => setValidityDays(Number(e.target.value))}
              className="px-3 py-2 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Customer Selection */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700">
              Select Client / Account <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => {
                setSelectedCustomerId(e.target.value);
                setSelectedDestinationId('');
              }}
              className="px-3 py-2 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white"
              required
            >
              <option value="">
                {loadingData ? '-- Loading Corporate Customers... --' : '-- Choose Corporate Customer --'}
              </option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName ? `${c.companyName} (${c.name})` : c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Destination Site Selection */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700">Delivery / Destination Site</label>
            <select
              value={selectedDestinationId}
              onChange={(e) => setSelectedDestinationId(e.target.value)}
              disabled={!selectedCustomerId || destinations.length === 0}
              className="px-3 py-2 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white disabled:opacity-60"
            >
              <option value="">
                {destinations.length === 0
                  ? '-- No facility sites registered (Uses client address) --'
                  : '-- Choose Delivery Facility Site --'}
              </option>
              {destinations.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.city}, {d.state})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Customer Information Read-only Snapshot Preview */}
        {selectedCustomer && (
          <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-xl flex flex-col md:flex-row justify-between gap-4 text-xs text-slate-700 animate-in fade-in">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Billing Entity Snapshot
              </span>
              <div className="font-bold text-slate-900 text-sm">
                {selectedCustomer.companyName || selectedCustomer.name}
              </div>
              <div className="text-slate-500">
                Contact: {selectedCustomer.name} • {selectedCustomer.email || 'No email'} •{' '}
                {selectedCustomer.phone || 'No phone'}
              </div>
              <div className="text-slate-600 mt-0.5">
                {selectedCustomer.address || 'No street address'}, {selectedCustomer.city || ''},{' '}
                {selectedCustomer.state || ''} {selectedCustomer.pincode ? `- ${selectedCustomer.pincode}` : ''}
              </div>
            </div>

            <div className="flex flex-col gap-1 shrink-0 md:text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Tax Jurisdiction
              </span>
              <div className="inline-flex items-center gap-1.5 font-semibold text-slate-800">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isIntraState ? 'bg-emerald-500' : 'bg-blue-500'
                  }`}
                />
                <span>
                  State: <strong>{customerState}</strong> ({isIntraState ? 'Intra-State: CGST + SGST' : 'Inter-State: IGST'})
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                Authoritative calculation will be finalized by backend.
              </span>
            </div>
          </div>
        )}

        {/* Quotation Subject */}
        <div className="flex flex-col gap-1.5 pt-1">
          <label className="text-xs font-bold text-slate-700">Subject / Deal Heading</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g., Quotation for 11KV Transformer Bushing & On-Site Installation"
            className="px-3.5 py-2 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
        </div>
      </div>

      {/* SECTION 2: DYNAMIC LINE ITEMS */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Package size={18} className="text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              2. Deliverables & Line Items ({items.length})
            </h2>
          </div>
          <button
            type="button"
            onClick={addItem}
            className="px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200/60 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus size={14} />
            <span>Add Item</span>
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {items.map((item, index) => {
            const gross = item.quantity * item.unitPrice;
            const discount = item.discountAmount || (gross * (item.discountPercent || 0)) / 100;
            const taxable = Math.max(0, gross - discount);
            const gst = (taxable * (item.gstRate || 0)) / 100;
            const total = taxable + gst;

            return (
              <div
                key={index}
                className="p-4 bg-slate-50/80 border border-slate-200 rounded-2xl flex flex-col gap-3 relative transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                      {index + 1}
                    </span>
                    <span>Item #{index + 1}</span>
                  </span>

                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      title="Remove line item"
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                {/* Product Autocomplete Picker & Item Name */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-600">Select Catalog Equipment</label>
                    <select
                      value={item.productId || ''}
                      onChange={(e) => handleItemChange(index, 'productId', e.target.value || null)}
                      className="px-3 py-1.5 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl"
                    >
                      <option value="">-- Custom / Manual Entry --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sku}) - ₹{Number(p.price).toLocaleString('en-IN')}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2 flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-600">
                      Item Name / Heading <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={item.productName}
                      onChange={(e) => handleItemChange(index, 'productName', e.target.value)}
                      placeholder="Equipment or service title"
                      className="px-3 py-1.5 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl font-medium"
                      required
                    />
                  </div>
                </div>

                {/* Description & Technical details */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="md:col-span-2 flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-600">Description / Specifications</label>
                    <input
                      type="text"
                      value={item.description || ''}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      placeholder="Standard scope or description..."
                      className="px-3 py-1.5 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-600">Make / Brand</label>
                    <input
                      type="text"
                      value={item.make || ''}
                      onChange={(e) => handleItemChange(index, 'make', e.target.value)}
                      placeholder="e.g., Taneja / ABB"
                      className="px-3 py-1.5 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-600">HSN / SAC Code</label>
                    <input
                      type="text"
                      value={item.hsnSac || ''}
                      onChange={(e) => handleItemChange(index, 'hsnSac', e.target.value)}
                      placeholder="e.g., 8504"
                      className="px-3 py-1.5 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                {/* SERVICE / AMC SPECIALIZED FIELDS */}
                {(item.itemType === 'SERVICE' || item.itemType === 'AMC' || quotationType === 'AMC' || quotationType === 'SERVICE') && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-blue-50/50 border border-blue-200/50 rounded-xl">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-blue-900">Contract Duration (Months)</label>
                      <input
                        type="number"
                        min={1}
                        value={item.serviceDurationMonths || ''}
                        onChange={(e) => handleItemChange(index, 'serviceDurationMonths', Number(e.target.value))}
                        placeholder="e.g., 12"
                        className="px-3 py-1.5 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-blue-900">Visits Included</label>
                      <input
                        type="number"
                        min={1}
                        value={item.serviceVisitsIncluded || ''}
                        onChange={(e) => handleItemChange(index, 'serviceVisitsIncluded', Number(e.target.value))}
                        placeholder="e.g., 4"
                        className="px-3 py-1.5 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-blue-900">Service Scope Summary</label>
                      <input
                        type="text"
                        value={item.serviceScope || ''}
                        onChange={(e) => handleItemChange(index, 'serviceScope', e.target.value)}
                        placeholder="Quarterly maintenance & oil filtration"
                        className="px-3 py-1.5 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl"
                      />
                    </div>
                  </div>
                )}

                {/* Quantity, Unit, Price, Discount, GST Rate, Line Total */}
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3 pt-1 border-t border-slate-200/60">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-600">Qty</label>
                    <input
                      type="number"
                      step="any"
                      min={0.001}
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-600">Unit</label>
                    <select
                      value={item.unit}
                      onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                      className="px-2.5 py-1.5 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl"
                    >
                      <option value="NOS">NOS</option>
                      <option value="SET">SET</option>
                      <option value="MTR">MTR</option>
                      <option value="KG">KG</option>
                      <option value="LOT">LOT</option>
                      <option value="YR">YR</option>
                      <option value="HR">HR</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-600">Unit Price (₹)</label>
                    <input
                      type="number"
                      step="any"
                      min={0}
                      value={item.unitPrice}
                      onChange={(e) => handleItemChange(index, 'unitPrice', Number(e.target.value))}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-600">Discount (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step="any"
                      value={item.discountPercent || 0}
                      onChange={(e) => handleItemChange(index, 'discountPercent', Number(e.target.value))}
                      className="px-3 py-1.5 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-600">GST Rate (%)</label>
                    <select
                      value={item.gstRate}
                      onChange={(e) => handleItemChange(index, 'gstRate', Number(e.target.value))}
                      className="px-2.5 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl"
                    >
                      <option value={0}>0% (Exempt)</option>
                      <option value={5}>5%</option>
                      <option value={12}>12%</option>
                      <option value={18}>18% (Standard)</option>
                      <option value={28}>28%</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1 bg-white p-2 rounded-xl border border-slate-200 text-right">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Line Total</label>
                    <div className="text-xs font-bold text-slate-900">
                      ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: FINANCIAL SUMMARY & ADDITIONAL CHARGES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Additional Charges & Adjustments */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <DollarSign size={18} className="text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              3. Freight & Adjustments
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700">Freight (₹)</label>
              <input
                type="number"
                min={0}
                value={freightCharges}
                onChange={(e) => setFreightCharges(Number(e.target.value))}
                className="px-3 py-2 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700">Other Charges (₹)</label>
              <input
                type="number"
                min={0}
                value={otherCharges}
                onChange={(e) => setOtherCharges(Number(e.target.value))}
                className="px-3 py-2 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700">Round Off (₹)</label>
              <input
                type="number"
                step="any"
                value={roundOff}
                onChange={(e) => setRoundOff(Number(e.target.value))}
                className="px-3 py-2 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Provisional Financial Breakdown Card */}
        <div className="bg-slate-950 text-white p-6 rounded-2xl shadow-lg border border-slate-800 flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Provisional Totals Summary
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-900/60 text-blue-300 border border-blue-700/50">
              INR ({currency})
            </span>
          </div>

          <div className="flex flex-col gap-2 text-xs text-slate-300">
            <div className="flex justify-between">
              <span>Gross Subtotal:</span>
              <span className="font-semibold text-white">
                ₹{provisional.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            {provisional.totalDiscount > 0 && (
              <div className="flex justify-between text-rose-400">
                <span>Total Discount:</span>
                <span>-₹{provisional.totalDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-slate-200">
              <span>Taxable Amount:</span>
              <span>₹{provisional.taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>

            {isIntraState ? (
              <>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>CGST:</span>
                  <span>₹{provisional.cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>SGST:</span>
                  <span>₹{provisional.sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>IGST (Inter-State):</span>
                <span>₹{provisional.igstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            )}

            <div className="flex justify-between">
              <span>Total Tax:</span>
              <span className="font-semibold text-white">
                ₹{provisional.totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="border-t border-slate-800 my-1" />

            <div className="flex justify-between text-base font-bold text-emerald-400">
              <span>Estimated Grand Total:</span>
              <span>₹{provisional.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 4: TERMS & CONDITIONS */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col gap-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <FileText size={18} className="text-blue-600" />
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            4. Terms, Delivery & Notes
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700">Payment Terms</label>
            <textarea
              rows={2}
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              className="px-3 py-2 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700">Delivery Terms</label>
            <textarea
              rows={2}
              value={deliveryTerms}
              onChange={(e) => setDeliveryTerms(e.target.value)}
              className="px-3 py-2 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700">Warranty Terms</label>
            <textarea
              rows={2}
              value={warrantyTerms}
              onChange={(e) => setWarrantyTerms(e.target.value)}
              className="px-3 py-2 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700">Terms & Conditions</label>
            <textarea
              rows={3}
              value={termsAndConditions}
              onChange={(e) => setTermsAndConditions(e.target.value)}
              className="px-3 py-2 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700">Public Quotation Notes</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes visible on the final quotation..."
              className="px-3 py-2 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700">Internal Audit Remarks</label>
            <textarea
              rows={3}
              value={internalRemarks}
              onChange={(e) => setInternalRemarks(e.target.value)}
              placeholder="Internal notes, pricing rationale, margin analysis..."
              className="px-3 py-2 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
        </div>
      </div>

      {/* SUBMISSION FOOTER BUTTONS */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-600/30 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
        >
          <Save size={16} />
          <span>{isSubmitting ? 'Saving...' : isEditing ? 'Save Quotation Changes' : 'Save as Draft Quotation'}</span>
        </button>
      </div>
    </form>
  );
};
