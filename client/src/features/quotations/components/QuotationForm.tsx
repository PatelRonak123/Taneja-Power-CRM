import React, { useState, useEffect } from 'react';
import {
  CreateQuotationPayload,
  LineItemFormInput,
  QuotationType,
  QuotationDetailedView,
  QuotationAmcScopeItem,
  QuotationAmcExclusion,
  QuotationAmcEscalation,
} from '../types/quotation.types';
import { customerService } from '../../customers/services/customerService';
import { productService } from '../../products/services/productService';
import { Customer, CustomerDestination, CustomerStatus } from '../../customers/types/customer.types';
import { CustomerModal } from '../../customers/components/CustomerModal';
import { Product } from '../../products/types/product.types';
import { Button } from '../../../components/ui/Button';
import { toast } from '../../../utils/toast';
import {
  Plus,
  Trash2,
  Building2,
  Package,
  FileText,
  DollarSign,
  AlertTriangle,
  Save,
  Shield,
  Clock,
  ListChecks,
  XCircle,
  PhoneCall,
  UserCheck,
  MoveUp,
  MoveDown,
  ExternalLink,
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

  // AMC Contract Configuration State
  const [amcPlan, setAmcPlan] = useState<string>(
    initialData?.currentRevision?.amcPlan || 'Ultra Care (UC)'
  );
  const [amcStartDate, setAmcStartDate] = useState<string>(
    initialData?.currentRevision?.amcStartDate
      ? new Date(initialData.currentRevision.amcStartDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  );
  const [amcEndDate, setAmcEndDate] = useState<string>(
    initialData?.currentRevision?.amcEndDate
      ? new Date(initialData.currentRevision.amcEndDate).toISOString().split('T')[0]
      : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [amcServiceFrequency, setAmcServiceFrequency] = useState<string>(
    initialData?.currentRevision?.amcServiceFrequency || 'Quarterly'
  );
  const [amcScheduledVisits, setAmcScheduledVisits] = useState<number>(
    initialData?.currentRevision?.amcScheduledVisits ?? 4
  );
  const [amcBreakdownVisitType, setAmcBreakdownVisitType] = useState<string>(
    initialData?.currentRevision?.amcBreakdownVisitType || 'UNLIMITED'
  );

  // Customer / Site Snapshots & End User State
  const [customerCode, setCustomerCode] = useState<string>(
    initialData?.currentRevision?.customerCode || ''
  );
  const [branch, setBranch] = useState<string>(
    initialData?.currentRevision?.branch || ''
  );
  const [zone, setZone] = useState<string>(
    initialData?.currentRevision?.zone || ''
  );
  const [sameAsCustomer, setSameAsCustomer] = useState<boolean>(() => {
    if (!initialData?.currentRevision?.endUser) return true;
    const custName = initialData?.customer?.companyName || initialData?.customer?.name;
    return initialData.currentRevision.endUser === custName;
  });
  const [endUser, setEndUser] = useState<string>(
    initialData?.currentRevision?.endUser || ''
  );

  // AMC Commercial Terms State
  const [specialClauses, setSpecialClauses] = useState<string>(
    initialData?.currentRevision?.specialClauses ||
      'Effective only after receiving full advance payment along with official Purchase Order. Expiry date shall not be extended on account of delayed payment.'
  );
  const [amcPaymentTerms, setAmcPaymentTerms] = useState<string>(
    initialData?.currentRevision?.amcPaymentTerms || '100% Advance along with Purchase Order.'
  );

  // AMC Scope of Work State
  const [amcScope, setAmcScope] = useState<QuotationAmcScopeItem[]>(() => {
    if (initialData?.currentRevision?.amcScope && initialData.currentRevision.amcScope.length > 0) {
      return initialData.currentRevision.amcScope.map((s, idx) => ({
        description: s.description,
        sortOrder: s.sortOrder || idx + 1,
      }));
    }
    return [
      { description: 'Servicing of Stabilizer', sortOrder: 1 },
      { description: 'Check Input & Output Voltage Variation', sortOrder: 2 },
      { description: 'Check Input Current & Output Current', sortOrder: 3 },
      { description: 'Auto & Manual Facility Check', sortOrder: 4 },
      { description: 'Check Motor Condition', sortOrder: 5 },
      { description: 'Check Cut Off Switch & Display', sortOrder: 6 },
    ];
  });

  // AMC Exclusions State
  const [amcExclusions, setAmcExclusions] = useState<QuotationAmcExclusion[]>(() => {
    if (initialData?.currentRevision?.amcExclusions && initialData.currentRevision.amcExclusions.length > 0) {
      return initialData.currentRevision.amcExclusions.map((e, idx) => ({
        description: e.description,
        sortOrder: e.sortOrder || idx + 1,
      }));
    }
    return [
      { description: 'Transformer', sortOrder: 1 },
      { description: 'MCCB', sortOrder: 2 },
      { description: 'Capacitor', sortOrder: 3 },
    ];
  });

  // AMC Malfunction Escalations State
  const [amcEscalations, setAmcEscalations] = useState<QuotationAmcEscalation[]>(() => {
    const existing = initialData?.currentRevision?.amcEscalations || [];
    const findLvl = (lvl: 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3') => existing.find((e) => e.level === lvl);

    return [
      {
        level: 'LEVEL_1',
        contactName: findLvl('LEVEL_1')?.contactName || 'Support Service Desk',
        phone: findLvl('LEVEL_1')?.phone || '9876543210',
        email: findLvl('LEVEL_1')?.email || 'service@tanejapower.com',
        sortOrder: 1,
      },
      {
        level: 'LEVEL_2',
        contactName: findLvl('LEVEL_2')?.contactName || '',
        phone: findLvl('LEVEL_2')?.phone || '',
        email: findLvl('LEVEL_2')?.email || '',
        sortOrder: 2,
      },
      {
        level: 'LEVEL_3',
        contactName: findLvl('LEVEL_3')?.contactName || '',
        phone: findLvl('LEVEL_3')?.phone || '',
        email: findLvl('LEVEL_3')?.email || '',
        sortOrder: 3,
      },
    ];
  });

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
        equipmentType: it.equipmentType || null,
        equipmentConfiguration: it.equipmentConfiguration || null,
        equipmentRating: it.equipmentRating || null,
        sortOrder: it.sortOrder || 0,
      }));
    }
    return [
      {
        itemType: initialData?.quotationType === 'AMC' ? 'AMC' : 'PRODUCT',
        productName: initialData?.quotationType === 'AMC' ? 'STABILIZER AMC' : '',
        equipmentType: initialData?.quotationType === 'AMC' ? 'STABILIZER' : null,
        equipmentConfiguration: initialData?.quotationType === 'AMC' ? '50 KVA' : null,
        equipmentRating: initialData?.quotationType === 'AMC' ? '30 KVA' : null,
        unit: 'NOS',
        quantity: 1,
        unitPrice: initialData?.quotationType === 'AMC' ? 9000 : 0,
        discountPercent: 0,
        discountAmount: 0,
        gstRate: 18,
        hsnSac: initialData?.quotationType === 'AMC' ? '998719' : null,
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

  // Add New Customer Drawer / Modal State
  const [customerModalOpen, setCustomerModalOpen] = useState<boolean>(false);
  const [customerFormSubmitting, setCustomerFormSubmitting] = useState<boolean>(false);
  const [customerFormError, setCustomerFormError] = useState<string | null>(null);
  const [customerFormData, setCustomerFormData] = useState<{
    name: string;
    companyName: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    notes: string;
    status: CustomerStatus;
  }>({
    name: '',
    companyName: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: 'Gujarat',
    pincode: '',
    notes: '',
    status: 'ACTIVE',
  });

  const handleOpenAddCustomer = () => {
    setCustomerFormError(null);
    setCustomerFormData({
      name: '',
      companyName: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      state: 'Gujarat',
      pincode: '',
      notes: '',
      status: 'ACTIVE',
    });
    setCustomerModalOpen(true);
  };

  const handleCustomerInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setCustomerFormData((prev) => ({ ...prev, [name]: value }));
    if (customerFormError) setCustomerFormError(null);
  };

  const handleCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCustomerFormError(null);

    if (!customerFormData.name.trim() || customerFormData.name.trim().length < 2) {
      setCustomerFormError('Primary contact name must be at least 2 characters.');
      return;
    }

    setCustomerFormSubmitting(true);
    try {
      const res = await customerService.createCustomer({
        name: customerFormData.name.trim(),
        companyName: customerFormData.companyName.trim() || undefined,
        phone: customerFormData.phone.trim() || undefined,
        email: customerFormData.email.trim() || undefined,
        address: customerFormData.address.trim() || undefined,
        city: customerFormData.city.trim() || undefined,
        state: customerFormData.state.trim() || undefined,
        pincode: customerFormData.pincode.trim() || undefined,
        notes: customerFormData.notes.trim() || undefined,
        status: customerFormData.status,
      });

      if (res.success && res.data) {
        const newCust = res.data;
        setCustomers((prev) => [newCust, ...prev.filter((c) => c.id !== newCust.id)]);
        setSelectedCustomerId(newCust.id);
        setSelectedDestinationId('');
        setCustomerModalOpen(false);
        toast.success(`Customer "${newCust.name}" created and selected successfully!`);
      } else {
        setCustomerFormError('Failed to create customer record.');
      }
    } catch (err: any) {
      setCustomerFormError(err?.message || 'Failed to create customer record.');
    } finally {
      setCustomerFormSubmitting(false);
    }
  };

  // Load initial customers and products
  useEffect(() => {
    const loadPrerequisites = async () => {
      try {
        setLoadingData(true);
        const [custRes, prodRes] = await Promise.all([
          customerService.getCustomers({ limit: 100 }),
          productService.getProducts({ limit: 100 }),
        ]);

        let loadedCustomers = custRes.data || [];
        if (prodRes.data) setProducts(prodRes.data);

        // Auto-select client if URL search parameters provide customer info (e.g. from Leads pipeline)
        const params = new URLSearchParams(window.location.search);
        const paramCustomerId = params.get('customerId');
        const paramCustomerName = params.get('customerName');
        const paramCompanyName = params.get('companyName');

        let targetId = initialData?.customerId || '';

        if (!targetId && paramCustomerId) {
          const exists = loadedCustomers.find((c) => c.id === paramCustomerId);
          if (exists) {
            targetId = exists.id;
          } else {
            try {
              const fetchRes = await customerService.getCustomerById(paramCustomerId);
              if (fetchRes.data) {
                loadedCustomers = [fetchRes.data, ...loadedCustomers];
                targetId = fetchRes.data.id;
              }
            } catch (e) {
              console.error('Failed to fetch customer by URL parameter id', e);
            }
          }
        }

        if (!targetId && (paramCustomerName || paramCompanyName)) {
          const targetName = (paramCustomerName || '').toLowerCase().trim();
          const targetCompany = (paramCompanyName || '').toLowerCase().trim();
          const match = loadedCustomers.find(
            (c) =>
              (targetName && c.name.toLowerCase().trim() === targetName) ||
              (targetCompany && c.companyName && c.companyName.toLowerCase().trim() === targetCompany) ||
              (targetName && c.companyName && c.companyName.toLowerCase().trim() === targetName) ||
              (targetCompany && c.name.toLowerCase().trim() === targetCompany)
          );
          if (match) {
            targetId = match.id;
          }
        }

        setCustomers(loadedCustomers);
        if (targetId) {
          setSelectedCustomerId(targetId);
        }
      } catch (err) {
        console.error('Failed to load customers/products', err);
      } finally {
        setLoadingData(false);
      }
    };

    loadPrerequisites();
  }, [initialData?.customerId]);

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

  // Sync End User if sameAsCustomer toggle is checked
  useEffect(() => {
    if (sameAsCustomer && selectedCustomer) {
      setEndUser(selectedCustomer.companyName || selectedCustomer.name);
    }
  }, [sameAsCustomer, selectedCustomer]);

  // Calculated AMC Duration (Months)
  const calculateAmcDurationMonths = () => {
    if (!amcStartDate || !amcEndDate) return 12;
    const start = new Date(amcStartDate);
    const end = new Date(amcEndDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const months = Math.round(diffDays / 30);
    return months > 0 ? months : 12;
  };

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
        item.discountAmount = Math.round(gross * (Number(value) / 100) * 100) / 100;
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
        productName: quotationType === 'AMC' ? 'STABILIZER AMC' : '',
        equipmentType: quotationType === 'AMC' ? 'STABILIZER' : null,
        equipmentConfiguration: quotationType === 'AMC' ? '50 KVA' : null,
        equipmentRating: quotationType === 'AMC' ? '30 KVA' : null,
        unit: 'NOS',
        quantity: 1,
        unitPrice: 0,
        discountPercent: 0,
        discountAmount: 0,
        gstRate: 18,
        hsnSac: quotationType === 'AMC' ? '998719' : null,
        sortOrder: prev.length,
      },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Scope handlers
  const handleAddScopeItem = () => {
    setAmcScope((prev) => [
      ...prev,
      { description: '', sortOrder: prev.length + 1 },
    ]);
  };

  const handleScopeChange = (index: number, description: string) => {
    setAmcScope((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], description };
      return copy;
    });
  };

  const handleRemoveScopeItem = (index: number) => {
    setAmcScope((prev) => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, sortOrder: i + 1 })));
  };

  const handleMoveScope = (index: number, direction: 'up' | 'down') => {
    setAmcScope((prev) => {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy.map((s, i) => ({ ...s, sortOrder: i + 1 }));
    });
  };

  // Exclusion handlers
  const handleAddExclusion = () => {
    setAmcExclusions((prev) => [
      ...prev,
      { description: '', sortOrder: prev.length + 1 },
    ]);
  };

  const handleExclusionChange = (index: number, description: string) => {
    setAmcExclusions((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], description };
      return copy;
    });
  };

  const handleRemoveExclusion = (index: number) => {
    setAmcExclusions((prev) => prev.filter((_, i) => i !== index).map((e, i) => ({ ...e, sortOrder: i + 1 })));
  };

  const handleMoveExclusion = (index: number, direction: 'up' | 'down') => {
    setAmcExclusions((prev) => {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy.map((e, i) => ({ ...e, sortOrder: i + 1 }));
    });
  };

  // Escalation contact handlers
  const handleEscalationChange = (
    level: 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3',
    field: 'contactName' | 'phone' | 'email',
    val: string
  ) => {
    setAmcEscalations((prev) =>
      prev.map((item) => (item.level === level ? { ...item, [field]: val } : item))
    );
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

    if (quotationType === 'AMC') {
      if (new Date(amcEndDate) < new Date(amcStartDate)) {
        setFormError('AMC Contract End Date cannot be earlier than Start Date.');
        return;
      }
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
        equipmentType: quotationType === 'AMC' ? it.equipmentType || 'STABILIZER' : it.equipmentType || null,
        equipmentConfiguration: quotationType === 'AMC' ? it.equipmentConfiguration || null : it.equipmentConfiguration || null,
        equipmentRating: quotationType === 'AMC' ? it.equipmentRating || null : it.equipmentRating || null,
        sortOrder: idx,
      })),
    };

    if (quotationType === 'AMC') {
      payload.amcPlan = amcPlan;
      payload.amcStartDate = amcStartDate;
      payload.amcEndDate = amcEndDate;
      payload.amcServiceFrequency = amcServiceFrequency;
      payload.amcScheduledVisits = Number(amcScheduledVisits) || 0;
      payload.amcBreakdownVisitType = amcBreakdownVisitType;
      payload.customerCode = customerCode.trim() || null;
      payload.branch = branch.trim() || null;
      payload.zone = zone.trim() || null;
      payload.endUser = sameAsCustomer
        ? (selectedCustomer?.companyName || selectedCustomer?.name || endUser.trim() || null)
        : endUser.trim() || null;
      payload.specialClauses = specialClauses.trim() || null;
      payload.amcPaymentTerms = amcPaymentTerms.trim() || null;

      payload.amcScope = amcScope
        .filter((s) => s.description.trim())
        .map((s, idx) => ({
          description: s.description.trim(),
          sortOrder: idx + 1,
        }));

      payload.amcExclusions = amcExclusions
        .filter((e) => e.description.trim())
        .map((e, idx) => ({
          description: e.description.trim(),
          sortOrder: idx + 1,
        }));

      payload.amcEscalations = amcEscalations
        .filter((esc) => esc.contactName?.trim() || esc.phone?.trim() || esc.email?.trim())
        .map((esc, idx) => ({
          level: esc.level,
          contactName: esc.contactName?.trim() || null,
          phone: esc.phone?.trim() || null,
          email: esc.email?.trim() || null,
          sortOrder: idx + 1,
        }));
    }

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
                    productName: newType === 'AMC' && !it.productName ? 'STABILIZER AMC' : it.productName,
                    equipmentType: newType === 'AMC' ? it.equipmentType || 'STABILIZER' : it.equipmentType,
                    equipmentConfiguration: newType === 'AMC' ? it.equipmentConfiguration || '50 KVA' : it.equipmentConfiguration,
                    equipmentRating: newType === 'AMC' ? it.equipmentRating || '30 KVA' : it.equipmentRating,
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
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                Select Client / Account <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleOpenAddCustomer}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100/80 border border-blue-200/70 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                  title="Directly open the Add New Customer drawer"
                >
                  <Plus size={12} className="stroke-[2.5]" />
                  <span>Add New Client</span>
                </button>
                <a
                  href="/customers"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-slate-400 hover:text-slate-600 p-0.5 inline-flex items-center"
                  title="Open Customer Directory in new tab"
                >
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>
            <select
              value={selectedCustomerId}
              onChange={(e) => {
                if (e.target.value === '__ADD_NEW__') {
                  handleOpenAddCustomer();
                  return;
                }
                setSelectedCustomerId(e.target.value);
                setSelectedDestinationId('');
              }}
              className="px-3 py-2 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white cursor-pointer"
              required
            >
              <option value="">
                {loadingData ? '-- Loading Corporate Customers... --' : '-- Choose Corporate Customer --'}
              </option>
              <option value="__ADD_NEW__" className="text-blue-600 font-semibold bg-blue-50/80">
                 + Add New Customer...
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

        {/* AMC SNAPSHOT EXTENSIONS (Customer Code, Branch, Zone, End User) */}
        {quotationType === 'AMC' && (
          <div className="p-4 bg-blue-50/40 border border-blue-200/60 rounded-2xl flex flex-col gap-4 animate-in fade-in">
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900 uppercase tracking-wider">
              <UserCheck size={16} className="text-blue-600" />
              <span>AMC Customer & Location Identifiers</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-700">Customer Code / CC</label>
                <input
                  type="text"
                  value={customerCode}
                  onChange={(e) => setCustomerCode(e.target.value)}
                  placeholder="e.g. CC-10982"
                  className="px-3 py-1.5 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-700">Branch</label>
                <input
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="e.g. Vadodara Main"
                  className="px-3 py-1.5 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-700">Zone</label>
                <input
                  type="text"
                  value={zone}
                  onChange={(e) => setZone(e.target.value)}
                  placeholder="e.g. West Zone"
                  className="px-3 py-1.5 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-700">End User</label>
                  <label className="flex items-center gap-1 text-[10px] text-blue-700 font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sameAsCustomer}
                      onChange={(e) => setSameAsCustomer(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Same as Customer</span>
                  </label>
                </div>
                <input
                  type="text"
                  value={endUser}
                  onChange={(e) => setEndUser(e.target.value)}
                  disabled={sameAsCustomer}
                  placeholder="Plant / End Facility Name"
                  className="px-3 py-1.5 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>
            </div>
          </div>
        )}

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

      {/* SECTION 2: AMC CONTRACT CONFIGURATION (Condition: quotationType === 'AMC') */}
      {quotationType === 'AMC' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col gap-5 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Shield size={18} className="text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                2. AMC Contract Configuration
              </h2>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
              Calculated Period: {calculateAmcDurationMonths()} Months
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* AMC Plan */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700">AMC Plan / Tier</label>
              <select
                value={amcPlan}
                onChange={(e) => setAmcPlan(e.target.value)}
                className="px-3 py-2 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
              >
                <option value="Ultra Care (UC)">Ultra Care (UC)</option>
                <option value="Silver Care">Silver Care</option>
                <option value="Gold Care">Gold Care</option>
                <option value="Platinum Care">Platinum Care</option>
                <option value="Comprehensive AMC">Comprehensive AMC</option>
                <option value="Non-Comprehensive AMC">Non-Comprehensive AMC</option>
              </select>
            </div>

            {/* Contract Start Date */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700">Contract Start Date</label>
              <input
                type="date"
                value={amcStartDate}
                onChange={(e) => setAmcStartDate(e.target.value)}
                className="px-3 py-2 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl"
                required
              />
            </div>

            {/* Contract End Date */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700">Contract End Date</label>
              <input
                type="date"
                value={amcEndDate}
                onChange={(e) => setAmcEndDate(e.target.value)}
                className="px-3 py-2 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Service Frequency */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700">Preventive Maintenance Frequency</label>
              <select
                value={amcServiceFrequency}
                onChange={(e) => setAmcServiceFrequency(e.target.value)}
                className="px-3 py-2 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value="Monthly">Monthly</option>
                <option value="Bi-Monthly">Bi-Monthly</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Half-Yearly">Half-Yearly</option>
                <option value="Yearly">Yearly</option>
                <option value="Custom">Custom</option>
              </select>
            </div>

            {/* Scheduled Visits */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700">Scheduled Preventive Visits</label>
              <input
                type="number"
                min={0}
                value={amcScheduledVisits}
                onChange={(e) => setAmcScheduledVisits(Number(e.target.value))}
                className="px-3 py-2 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl"
                required
              />
            </div>

            {/* Breakdown Visit Entitlement */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700">Breakdown Visit Entitlement</label>
              <select
                value={amcBreakdownVisitType}
                onChange={(e) => setAmcBreakdownVisitType(e.target.value)}
                className="px-3 py-2 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value="UNLIMITED">Unlimited Breakdown Visits</option>
                <option value="LIMITED">Limited Breakdown Visits</option>
                <option value="INCLUDED">Included</option>
                <option value="NOT_INCLUDED">Not Included</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: DYNAMIC LINE ITEMS & COVERED EQUIPMENT */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Package size={18} className="text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              {quotationType === 'AMC' ? '3. Covered Equipment & Line Items' : '2. Deliverables & Line Items'} ({items.length})
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

                {/* AMC Specific Equipment Specification Inputs */}
                {quotationType === 'AMC' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-blue-50/50 border border-blue-200/60 rounded-xl">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-blue-900">Equipment Type</label>
                      <input
                        type="text"
                        value={item.equipmentType || ''}
                        onChange={(e) => handleItemChange(index, 'equipmentType', e.target.value)}
                        placeholder="e.g. STABILIZER / TRANSFORMER"
                        className="px-3 py-1.5 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-blue-900">Equipment Configuration</label>
                      <input
                        type="text"
                        value={item.equipmentConfiguration || ''}
                        onChange={(e) => handleItemChange(index, 'equipmentConfiguration', e.target.value)}
                        placeholder="e.g. 50 KVA"
                        className="px-3 py-1.5 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-blue-900">Equipment Rating</label>
                      <input
                        type="text"
                        value={item.equipmentRating || ''}
                        onChange={(e) => handleItemChange(index, 'equipmentRating', e.target.value)}
                        placeholder="e.g. 30 KVA"
                        className="px-3 py-1.5 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl"
                      />
                    </div>
                  </div>
                )}

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
                      placeholder="e.g., 998719"
                      className="px-3 py-1.5 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                {/* Quantity, Unit, Price, Discount, GST Rate, Line Total */}
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3 pt-2 border-t border-slate-200">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-700">Qty</label>
                    <input
                      type="number"
                      step="any"
                      min={0.001}
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                      className="h-9 px-3 text-[13px] font-medium text-slate-900 bg-white border border-slate-200 rounded-lg text-right tabular-nums focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-700">Unit</label>
                    <select
                      value={item.unit}
                      onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                      className="h-9 px-2.5 text-[13px] font-medium text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 cursor-pointer"
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
                    <label className="text-xs font-medium text-slate-700 truncate">
                      {quotationType === 'AMC' ? 'AMC Price / Unit (₹)' : 'Unit Price (₹)'}
                    </label>
                    <input
                      type="number"
                      step="any"
                      min={0}
                      value={item.unitPrice}
                      onChange={(e) => handleItemChange(index, 'unitPrice', Number(e.target.value))}
                      className="h-9 px-3 text-[13px] font-medium text-slate-900 bg-white border border-slate-200 rounded-lg text-right tabular-nums focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-700">Discount (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step="any"
                      value={item.discountPercent || 0}
                      onChange={(e) => handleItemChange(index, 'discountPercent', Number(e.target.value))}
                      className="h-9 px-3 text-[13px] font-medium text-slate-900 bg-white border border-slate-200 rounded-lg text-right tabular-nums focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-700">GST Rate (%)</label>
                    <select
                      value={item.gstRate}
                      onChange={(e) => handleItemChange(index, 'gstRate', Number(e.target.value))}
                      className="h-9 px-2.5 text-[13px] font-medium text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 cursor-pointer text-right"
                    >
                      <option value={0}>0% (Exempt)</option>
                      <option value={5}>5%</option>
                      <option value={12}>12%</option>
                      <option value={18}>18% (Standard)</option>
                      <option value={28}>28%</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-500 text-right">Line Total</label>
                    <div className="h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-end text-xs font-semibold text-slate-900 tabular-nums">
                      ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 4 & 5: AMC SCOPE OF WORK & AMC EXCLUSIONS */}
      {quotationType === 'AMC' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in">
          {/* SCOPE OF WORK */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ListChecks size={18} className="text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  4. AMC Scope of Work
                </h2>
              </div>
              <button
                type="button"
                onClick={handleAddScopeItem}
                className="px-2.5 py-1 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <Plus size={14} /> Add Scope Item
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {amcScope.map((scope, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    value={scope.description}
                    onChange={(e) => handleScopeChange(idx, e.target.value)}
                    placeholder="Enter scope of work task..."
                    className="flex-1 px-3 py-1.5 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => handleMoveScope(idx, 'up')}
                    disabled={idx === 0}
                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                  >
                    <MoveUp size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveScope(idx, 'down')}
                    disabled={idx === amcScope.length - 1}
                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                  >
                    <MoveDown size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveScopeItem(idx)}
                    className="p-1 text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* EXCLUSIONS */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <XCircle size={18} className="text-rose-600" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  5. AMC Excluded Items
                </h2>
              </div>
              <button
                type="button"
                onClick={handleAddExclusion}
                className="px-2.5 py-1 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <Plus size={14} /> Add Exclusion
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {amcExclusions.map((ex, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-rose-50 text-rose-600 text-[11px] font-bold flex items-center justify-center shrink-0">
                    ✕
                  </span>
                  <input
                    type="text"
                    value={ex.description}
                    onChange={(e) => handleExclusionChange(idx, e.target.value)}
                    placeholder="Enter excluded component or service..."
                    className="flex-1 px-3 py-1.5 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => handleMoveExclusion(idx, 'up')}
                    disabled={idx === 0}
                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                  >
                    <MoveUp size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveExclusion(idx, 'down')}
                    disabled={idx === amcExclusions.length - 1}
                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                  >
                    <MoveDown size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveExclusion(idx)}
                    className="p-1 text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 6: FINANCIAL SUMMARY & ADDITIONAL CHARGES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Additional Charges & Adjustments */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <DollarSign size={18} className="text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              {quotationType === 'AMC' ? '6. Freight & Adjustments' : '3. Freight & Adjustments'}
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

      {/* SECTION 7 & 8: AMC COMMERCIAL TERMS & MALFUNCTION ESCALATIONS (Condition: quotationType === 'AMC') */}
      {quotationType === 'AMC' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in">
          {/* AMC COMMERCIAL TERMS */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Clock size={18} className="text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                7. AMC Commercial Terms
              </h2>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-700">AMC Payment Terms</label>
                <textarea
                  rows={2}
                  value={amcPaymentTerms}
                  onChange={(e) => setAmcPaymentTerms(e.target.value)}
                  placeholder="e.g. 100% Advance along with Purchase Order."
                  className="px-3 py-2 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-700">Special AMC Clauses</label>
                <textarea
                  rows={3}
                  value={specialClauses}
                  onChange={(e) => setSpecialClauses(e.target.value)}
                  placeholder="Special stipulations regarding response time, scope boundaries..."
                  className="px-3 py-2 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* ESCALATION MATRIX */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <PhoneCall size={18} className="text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                8. Service Malfunction Escalation Matrix
              </h2>
            </div>

            <div className="flex flex-col gap-3">
              {amcEscalations.map((esc) => (
                <div key={esc.level} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-2">
                  <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider">
                    {esc.level.replace('_', ' ')} Contact
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={esc.contactName || ''}
                      onChange={(e) => handleEscalationChange(esc.level, 'contactName', e.target.value)}
                      placeholder="Contact Person / Role"
                      className="px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg"
                    />
                    <input
                      type="text"
                      value={esc.phone || ''}
                      onChange={(e) => handleEscalationChange(esc.level, 'phone', e.target.value)}
                      placeholder="Phone / Mobile"
                      className="px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg"
                    />
                    <input
                      type="email"
                      value={esc.email || ''}
                      onChange={(e) => handleEscalationChange(esc.level, 'email', e.target.value)}
                      placeholder="Email Address"
                      className="px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 9: GENERIC TERMS & CONDITIONS */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col gap-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <FileText size={18} className="text-blue-600" />
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            {quotationType === 'AMC' ? '9. General Terms, Delivery & Notes' : '4. Terms, Delivery & Notes'}
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
        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isSubmitting}
          leftIcon={<Save size={16} />}
        >
          {isEditing ? 'Save Quotation Changes' : 'Save as Draft Quotation'}
        </Button>
      </div>

      {/* Embedded Customer Creation Drawer */}
      <CustomerModal
        modalMode={customerModalOpen ? 'create' : null}
        onClose={() => setCustomerModalOpen(false)}
        onSubmit={handleCustomerSubmit}
        formData={customerFormData}
        onInputChange={handleCustomerInputChange}
        formSubmitting={customerFormSubmitting}
        formError={customerFormError}
      />
    </form>
  );
};

