import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  X,
} from 'lucide-react';
import { FollowUpEntitySection } from '../../follow-ups/components/FollowUpEntitySection';
import { customerService } from '../services/customerService';
import {
  Customer,
  CustomerDestination,
  CustomerStatus,
  DestinationStatus,
  CustomerMetrics,
} from '../types/customer.types';
import { CustomerMetricsCards } from '../components/CustomerMetricsCards';
import { CustomerToolbar } from '../components/CustomerToolbar';
import { CustomerTable } from '../components/CustomerTable';
import { CustomerModal } from '../components/CustomerModal';
import { DestinationsDrawer } from '../components/DestinationsDrawer';
import { DestinationModal } from '../components/DestinationModal';
import { CustomerEquipmentDrawer } from '../components/CustomerEquipmentDrawer';
import { useAuthStore } from '../../../stores/authStore';
import { toast } from '../../../utils/toast';
import { confirmModal } from '../../../utils/confirmModal';
import { Button } from '../../../components/ui/Button';

export const CustomerManagementPage: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Metrics
  const [metrics, setMetrics] = useState<CustomerMetrics>({
    total: 0,
    active: 0,
    inactive: 0,
    totalDestinations: 0,
  });

  // Customer Modal State ('create' | 'edit' | null)
  const [customerModalMode, setCustomerModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [customerFormSubmitting, setCustomerFormSubmitting] = useState<boolean>(false);
  const [customerFormError, setCustomerFormError] = useState<string | null>(null);

  // Customer Form Data
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
    state: '',
    pincode: '',
    notes: '',
    status: 'ACTIVE',
  });

  // Destinations & Equipment Detail Drawer / View State
  const [selectedCustomerForDestinations, setSelectedCustomerForDestinations] =
    useState<Customer | null>(null);
  const [selectedCustomerForFollowUps, setSelectedCustomerForFollowUps] =
    useState<Customer | null>(null);
  const [selectedCustomerForEquipment, setSelectedCustomerForEquipment] =
    useState<Customer | null>(null);
  const [destinations, setDestinations] = useState<CustomerDestination[]>([]);
  const [loadingDestinations, setLoadingDestinations] = useState<boolean>(false);

  // Destination Modal State ('create' | 'edit' | null)
  const [destinationModalMode, setDestinationModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingDestinationId, setEditingDestinationId] = useState<string | null>(null);
  const [destinationFormSubmitting, setDestinationFormSubmitting] = useState<boolean>(false);
  const [destinationFormError, setDestinationFormError] = useState<string | null>(null);

  // Destination Form Data
  const [destinationFormData, setDestinationFormData] = useState<{
    name: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    latitude: string;
    longitude: string;
    placeId: string;
    contactPerson: string;
    contactPhone: string;
    notes: string;
    status: DestinationStatus;
  }>({
    name: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    latitude: '',
    longitude: '',
    placeId: '',
    contactPerson: '',
    contactPhone: '',
    notes: '',
    status: 'ACTIVE',
  });

  const [deletingCustomerId, setDeletingCustomerId] = useState<string | null>(null);
  const [deletingDestinationId, setDeletingDestinationId] = useState<string | null>(null);

  // Load Customers
  const fetchCustomers = async (targetPage: number = page) => {
    setLoading(true);
    try {
      const response = await customerService.getCustomers({
        search: searchQuery.trim() || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        page: targetPage,
        limit,
      });

      if (response.success && Array.isArray(response.data)) {
        setCustomers(response.data);
        if (response.meta) {
          setTotalCount(response.meta.total || response.data.length);
          setTotalPages(response.meta.totalPages || 1);
          setPage(response.meta.page || targetPage);
          if (response.meta.metrics) {
            setMetrics(response.meta.metrics as CustomerMetrics);
          }
        }
      } else {
        setCustomers([]);
      }
    } catch (err: any) {
      toast.error('Failed to load customers', err?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    fetchCustomers(1);
  }, [searchQuery, statusFilter]);

  // Load Destinations for Selected Customer
  const fetchDestinations = async (customerId: string) => {
    setLoadingDestinations(true);
    try {
      const response = await customerService.getDestinations(customerId);
      if (response.success && Array.isArray(response.data)) {
        setDestinations(response.data);
      } else {
        setDestinations([]);
      }
    } catch (err: any) {
      toast.error('Failed to load destinations', err?.message || 'Failed to load destinations for customer');
    } finally {
      setLoadingDestinations(false);
    }
  };

  // Search Submit (immediate)
  const handleSearchSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setPage(1);
    fetchCustomers(1);
  };

  // Open Create Customer Modal
  const handleOpenCreateCustomer = () => {
    setCustomerModalMode('create');
    setEditingCustomerId(null);
    setCustomerFormError(null);
    setCustomerFormData({
      name: '',
      companyName: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      notes: '',
      status: 'ACTIVE',
    });
  };

  // Open Edit Customer Modal
  const handleOpenEditCustomer = (customer: Customer) => {
    setCustomerModalMode('edit');
    setEditingCustomerId(customer.id);
    setCustomerFormError(null);
    setCustomerFormData({
      name: customer.name || '',
      companyName: customer.companyName || '',
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      city: customer.city || '',
      state: customer.state || '',
      pincode: customer.pincode || '',
      notes: customer.notes || '',
      status: customer.status || 'ACTIVE',
    });
  };

  const handleCustomerInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setCustomerFormData((prev) => ({ ...prev, [name]: value }));
    if (customerFormError) setCustomerFormError(null);
  };

  // Customer Form Submit
  const handleCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCustomerFormError(null);

    if (!customerFormData.name.trim() || customerFormData.name.trim().length < 2) {
      setCustomerFormError('Customer name must be at least 2 characters long.');
      return;
    }

    setCustomerFormSubmitting(true);
    try {
      if (customerModalMode === 'create') {
        const response = await customerService.createCustomer({
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

        if (response.success) {
          toast.success(`Customer "${response.data.name}" created successfully!`);
          setCustomerModalMode(null);
          fetchCustomers(1);
        }
      } else if (customerModalMode === 'edit' && editingCustomerId) {
        const response = await customerService.updateCustomer(editingCustomerId, {
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

        if (response.success) {
          toast.success(`Customer "${response.data.name}" updated successfully!`);
          setCustomerModalMode(null);
          fetchCustomers(page);
          if (selectedCustomerForDestinations?.id === editingCustomerId) {
            setSelectedCustomerForDestinations(response.data);
          }
        }
      }
    } catch (err: any) {
      setCustomerFormError(
        err?.message ||
          `Failed to ${customerModalMode === 'create' ? 'create' : 'update'} customer.`
      );
    } finally {
      setCustomerFormSubmitting(false);
    }
  };

  // Delete Customer
  const handleDeleteCustomer = async (customer: Customer) => {
    const confirmMsg =
      customer.destinationCount && customer.destinationCount > 0
        ? `Are you sure you want to delete customer "${customer.name}"? This will also remove ${customer.destinationCount} associated destination(s).`
        : `Are you sure you want to delete customer "${customer.name}"?`;

    const isConfirmed = await confirmModal.danger(
      'Delete Customer',
      confirmMsg,
      'Delete Customer'
    );

    if (!isConfirmed) return;

    setDeletingCustomerId(customer.id);
    try {
      const response = await customerService.deleteCustomer(customer.id);
      if (response.success) {
        toast.success(`Customer "${customer.name}" removed successfully.`);
        if (selectedCustomerForDestinations?.id === customer.id) {
          setSelectedCustomerForDestinations(null);
        }
        fetchCustomers(page);
      }
    } catch (err: any) {
      toast.error('Failed to delete customer', err?.message);
    } finally {
      setDeletingCustomerId(null);
    }
  };

  // Open Destinations Drawer for Customer
  const handleOpenDestinations = (customer: Customer) => {
    setSelectedCustomerForDestinations(customer);
    fetchDestinations(customer.id);
  };

  // Open Create Destination Modal
  const handleOpenCreateDestination = () => {
    setDestinationModalMode('create');
    setEditingDestinationId(null);
    setDestinationFormError(null);
    setDestinationFormData({
      name: '',
      address: selectedCustomerForDestinations?.address || '',
      city: selectedCustomerForDestinations?.city || '',
      state: selectedCustomerForDestinations?.state || '',
      pincode: selectedCustomerForDestinations?.pincode || '',
      latitude: '',
      longitude: '',
      placeId: '',
      contactPerson: selectedCustomerForDestinations?.name || '',
      contactPhone: selectedCustomerForDestinations?.phone || '',
      notes: '',
      status: 'ACTIVE',
    });
  };

  // Open Edit Destination Modal
  const handleOpenEditDestination = (destination: CustomerDestination) => {
    setDestinationModalMode('edit');
    setEditingDestinationId(destination.id);
    setDestinationFormError(null);
    setDestinationFormData({
      name: destination.name || '',
      address: destination.address || '',
      city: destination.city || '',
      state: destination.state || '',
      pincode: destination.pincode || '',
      latitude: destination.latitude ? destination.latitude.toString() : '',
      longitude: destination.longitude ? destination.longitude.toString() : '',
      placeId: destination.placeId || '',
      contactPerson: destination.contactPerson || '',
      contactPhone: destination.contactPhone || '',
      notes: destination.notes || '',
      status: destination.status || 'ACTIVE',
    });
  };

  const handleDestinationInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setDestinationFormData((prev) => ({ ...prev, [name]: value }));
    if (destinationFormError) setDestinationFormError(null);
  };

  const handleSelectAddressSuggestion = (suggestion: {
    address: string;
    city: string;
    state: string;
    pincode: string;
    latitude: string;
    longitude: string;
    placeId?: string;
    name?: string;
  }) => {
    setDestinationFormData((prev) => ({
      ...prev,
      name: prev.name.trim() === '' && suggestion.name ? suggestion.name : prev.name,
      address: suggestion.address || prev.address,
      city: suggestion.city || prev.city,
      state: suggestion.state || prev.state,
      pincode: suggestion.pincode || prev.pincode,
      latitude: suggestion.latitude || prev.latitude,
      longitude: suggestion.longitude || prev.longitude,
      placeId: suggestion.placeId || prev.placeId,
    }));
    if (destinationFormError) setDestinationFormError(null);
  };

  // Destination Form Submit
  const handleDestinationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerForDestinations) return;
    setDestinationFormError(null);

    if (!destinationFormData.name.trim() || destinationFormData.name.trim().length < 2) {
      setDestinationFormError('Destination name must be at least 2 characters.');
      return;
    }

    setDestinationFormSubmitting(true);
    try {
      if (destinationModalMode === 'create') {
        const response = await customerService.createDestination(
          selectedCustomerForDestinations.id,
          {
            name: destinationFormData.name.trim(),
            address: destinationFormData.address.trim() || undefined,
            city: destinationFormData.city.trim() || undefined,
            state: destinationFormData.state.trim() || undefined,
            pincode: destinationFormData.pincode.trim() || undefined,
            latitude: destinationFormData.latitude.trim() || null,
            longitude: destinationFormData.longitude.trim() || null,
            placeId: destinationFormData.placeId.trim() || undefined,
            contactPerson: destinationFormData.contactPerson.trim() || undefined,
            contactPhone: destinationFormData.contactPhone.trim() || undefined,
            notes: destinationFormData.notes.trim() || undefined,
            status: destinationFormData.status,
          }
        );

        if (response.success) {
          toast.success(`Destination "${response.data.name}" added successfully!`);
          setDestinationModalMode(null);
          fetchDestinations(selectedCustomerForDestinations.id);
          fetchCustomers(page);
        }
      } else if (destinationModalMode === 'edit' && editingDestinationId) {
        const response = await customerService.updateDestination(
          selectedCustomerForDestinations.id,
          editingDestinationId,
          {
            name: destinationFormData.name.trim(),
            address: destinationFormData.address.trim() || undefined,
            city: destinationFormData.city.trim() || undefined,
            state: destinationFormData.state.trim() || undefined,
            pincode: destinationFormData.pincode.trim() || undefined,
            latitude: destinationFormData.latitude.trim() || null,
            longitude: destinationFormData.longitude.trim() || null,
            placeId: destinationFormData.placeId.trim() || undefined,
            contactPerson: destinationFormData.contactPerson.trim() || undefined,
            contactPhone: destinationFormData.contactPhone.trim() || undefined,
            notes: destinationFormData.notes.trim() || undefined,
            status: destinationFormData.status,
          }
        );

        if (response.success) {
          toast.success(`Destination "${response.data.name}" updated successfully!`);
          setDestinationModalMode(null);
          fetchDestinations(selectedCustomerForDestinations.id);
          fetchCustomers(page);
        }
      }
    } catch (err: any) {
      setDestinationFormError(
        err?.message ||
          `Failed to ${destinationModalMode === 'create' ? 'add' : 'update'} destination.`
      );
    } finally {
      setDestinationFormSubmitting(false);
    }
  };

  // Delete Destination
  const handleDeleteDestination = async (destination: CustomerDestination) => {
    if (!selectedCustomerForDestinations) return;

    const isConfirmed = await confirmModal.danger(
      'Remove Destination',
      `Are you sure you want to remove destination "${destination.name}"? This destination will be permanently deleted.`,
      'Remove'
    );

    if (!isConfirmed) return;

    setDeletingDestinationId(destination.id);
    try {
      const response = await customerService.deleteDestination(
        selectedCustomerForDestinations.id,
        destination.id
      );
      if (response.success) {
        toast.success(`Destination "${destination.name}" removed successfully.`);
        fetchDestinations(selectedCustomerForDestinations.id);
        fetchCustomers(page);
      }
    } catch (err: any) {
      toast.error('Failed to delete destination', err?.message);
    } finally {
      setDeletingDestinationId(null);
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-5 rounded-xl border border-border shadow-xs">
        <div className="flex flex-col gap-1 max-w-3xl">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200/60 text-blue-700 text-[11px] font-semibold uppercase tracking-wider">
              <Building2 size={12} className="text-blue-600" /> Directory
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium text-slate-600 bg-slate-100 border border-slate-200 tabular-nums">
              {totalCount} {!isAdmin ? 'My Clients' : 'Total Clients'}
            </span>
          </div>
          <h1 className="text-[22px] font-semibold text-slate-900 tracking-tight leading-tight">
            Customer & Destination Management
          </h1>
          <p className="text-[13px] text-slate-500 leading-normal">
            {!isAdmin
              ? 'View and manage your registered client accounts, contact details, and service destination sites.'
              : 'Manage enterprise client accounts, configure multi-facility service destination sites, and coordinate GPS location markers.'}
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          leftIcon={<Plus size={16} />}
          onClick={handleOpenCreateCustomer}
          className="shrink-0"
        >
          Add Customer
        </Button>
      </div>

      {/* Metrics Header Cards */}
      <CustomerMetricsCards metrics={metrics} />

      {/* Toolbar: Search and Filter */}
      <CustomerToolbar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        onSearchSubmit={handleSearchSubmit}
        onClearSearch={() => {
          setSearchQuery('');
          setPage(1);
          fetchCustomers(1);
        }}
        onRefresh={() => fetchCustomers(page)}
        loading={loading}
      />

      {/* Customer Data Table */}
      <CustomerTable
        customers={customers}
        loading={loading}
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        page={page}
        limit={limit}
        totalPages={totalPages}
        totalCount={totalCount}
        onPageChange={(p) => {
          setPage(p);
          fetchCustomers(p);
        }}
        onOpenCreate={handleOpenCreateCustomer}
        onOpenDestinations={handleOpenDestinations}
        onOpenFollowUps={setSelectedCustomerForFollowUps}
        onOpenEquipment={setSelectedCustomerForEquipment}
        onEditCustomer={handleOpenEditCustomer}
        onDeleteCustomer={handleDeleteCustomer}
        deletingCustomerId={deletingCustomerId}
        isAdmin={isAdmin}
      />

      {/* Customer Create / Edit Modal */}
      <CustomerModal
        modalMode={customerModalMode}
        onClose={() => setCustomerModalMode(null)}
        onSubmit={handleCustomerSubmit}
        formData={customerFormData}
        onInputChange={handleCustomerInputChange}
        formSubmitting={customerFormSubmitting}
        formError={customerFormError}
      />

      {/* Installed Equipment & Assets Drawer */}
      <CustomerEquipmentDrawer
        customer={selectedCustomerForEquipment}
        onClose={() => setSelectedCustomerForEquipment(null)}
      />

      {/* Destinations Management Modal / Drawer */}
      <DestinationsDrawer
        customer={selectedCustomerForDestinations}
        destinations={destinations}
        loading={loadingDestinations}
        onClose={() => {
          setSelectedCustomerForDestinations(null);
          setDestinationModalMode(null);
        }}
        onAddDestination={handleOpenCreateDestination}
        onEditDestination={handleOpenEditDestination}
        onDeleteDestination={handleDeleteDestination}
        deletingDestinationId={deletingDestinationId}
        canManage={true}
      />

      {/* Destination Create / Edit Modal */}
      <DestinationModal
        modalMode={destinationModalMode}
        isOpen={destinationModalMode !== null && selectedCustomerForDestinations !== null}
        onClose={() => setDestinationModalMode(null)}
        onSubmit={handleDestinationSubmit}
        formData={destinationFormData}
        onInputChange={handleDestinationInputChange}
        onSelectAddressSuggestion={handleSelectAddressSuggestion}
        formSubmitting={destinationFormSubmitting}
        formError={destinationFormError}
      />

      {/* Customer Follow-ups Slide-over Drawer */}
      {selectedCustomerForFollowUps && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setSelectedCustomerForFollowUps(null)}
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 z-50">
            <div className="w-screen max-w-2xl bg-white shadow-2xl flex flex-col border-l border-slate-200 overflow-y-auto">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Follow-ups: {selectedCustomerForFollowUps.companyName || selectedCustomerForFollowUps.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Manage and schedule follow-ups for this customer
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCustomerForFollowUps(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-6">
                <FollowUpEntitySection
                  customerId={selectedCustomerForFollowUps.id}
                  customerName={selectedCustomerForFollowUps.companyName || selectedCustomerForFollowUps.name}
                  defaultTitle={`Follow-up: ${selectedCustomerForFollowUps.companyName || selectedCustomerForFollowUps.name}`}
                  defaultType="CUSTOMER_VISIT"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerManagementPage;
