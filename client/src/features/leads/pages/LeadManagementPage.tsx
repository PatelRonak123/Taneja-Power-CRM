import React, { useState, useEffect, useMemo } from 'react';
import { SearchInput } from '../../../components/ui/SearchInput';
import {
  Plus,
  Building2,
  Eye,
  Pencil,
  Trash2,
  ArrowUpDown,
  Download,
  TrendingUp,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  MapPin,
} from 'lucide-react';
import { Lead } from '../types/lead';
import { LeadDrawer } from '../components/LeadDrawer';
import { leadsApi } from '../api/leadsApi';
import { DestinationsDrawer } from '../../customers/components/DestinationsDrawer';
import { DestinationModal } from '../../customers/components/DestinationModal';
import { CustomerDestination, DestinationStatus } from '../../customers/types/customer.types';
import { useAuthStore } from '../../../stores/authStore';
import { employeeService } from '../../admin/services/employeeService';
import { Employee } from '../../admin/types/employee.types';
import { toast } from '../../../utils/toast';
import { confirmModal } from '../../../utils/confirmModal';
import { Button } from '../../../components/ui/Button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmptyState,
} from '../../../components/ui/table';
import { StatusPill } from '../../../components/ui/StatusPill';

export const LeadManagementPage: React.FC = () => {
  const { user } = useAuthStore();
  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const [leads, setLeads] = useState<Lead[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('ALL');
  const [viewScope, setViewScope] = useState<'ALL' | 'MY'>('ALL');

  // Lead Destinations state
  const [selectedLeadForDestinations, setSelectedLeadForDestinations] = useState<Lead | null>(null);
  const [destinations, setDestinations] = useState<CustomerDestination[]>([]);
  const [loadingDestinations, setLoadingDestinations] = useState(false);
  const [destinationModalMode, setDestinationModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingDestinationId, setEditingDestinationId] = useState<string | null>(null);
  const [deletingDestinationId, setDeletingDestinationId] = useState<string | null>(null);
  const [destinationFormSubmitting, setDestinationFormSubmitting] = useState(false);
  const [destinationFormError, setDestinationFormError] = useState<string | null>(null);
  const [destinationFormData, setDestinationFormData] = useState<{
    name: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    latitude: string;
    longitude: string;
    placeId?: string;
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

  const fetchDestinations = async (leadId: string) => {
    setLoadingDestinations(true);
    try {
      const data = await leadsApi.getLeadDestinations(leadId);
      setDestinations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Failed to load lead destinations:', err);
      setDestinations([]);
    } finally {
      setLoadingDestinations(false);
    }
  };

  const handleOpenDestinations = (lead: Lead) => {
    setSelectedLeadForDestinations(lead);
    fetchDestinations(lead.id);
  };

  const handleOpenCreateDestination = () => {
    if (!selectedLeadForDestinations) return;
    setDestinationFormData({
      name: '',
      address: selectedLeadForDestinations.address || '',
      city: '',
      state: '',
      pincode: '',
      latitude: '',
      longitude: '',
      placeId: '',
      contactPerson: selectedLeadForDestinations.customerName || '',
      contactPhone: selectedLeadForDestinations.phone || '',
      notes: '',
      status: 'ACTIVE',
    });
    setDestinationFormError(null);
    setEditingDestinationId(null);
    setDestinationModalMode('create');
  };

  const handleOpenEditDestination = (dest: CustomerDestination) => {
    setDestinationFormData({
      name: dest.name || '',
      address: dest.address || '',
      city: dest.city || '',
      state: dest.state || '',
      pincode: dest.pincode || '',
      latitude: dest.latitude ? String(dest.latitude) : '',
      longitude: dest.longitude ? String(dest.longitude) : '',
      placeId: dest.placeId || '',
      contactPerson: dest.contactPerson || '',
      contactPhone: dest.contactPhone || '',
      notes: dest.notes || '',
      status: dest.status || 'ACTIVE',
    });
    setDestinationFormError(null);
    setEditingDestinationId(dest.id);
    setDestinationModalMode('edit');
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

  const handleDestinationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadForDestinations) return;
    setDestinationFormError(null);

    if (!destinationFormData.name.trim() || destinationFormData.name.trim().length < 2) {
      setDestinationFormError('Destination name must be at least 2 characters.');
      return;
    }

    setDestinationFormSubmitting(true);
    try {
      if (destinationModalMode === 'create') {
        await leadsApi.createLeadDestination(selectedLeadForDestinations.id, {
          name: destinationFormData.name.trim(),
          address: destinationFormData.address.trim() || undefined,
          city: destinationFormData.city.trim() || undefined,
          state: destinationFormData.state.trim() || undefined,
          pincode: destinationFormData.pincode.trim() || undefined,
          latitude: destinationFormData.latitude.trim() || null,
          longitude: destinationFormData.longitude.trim() || null,
          placeId: destinationFormData.placeId?.trim() || undefined,
          contactPerson: destinationFormData.contactPerson.trim() || undefined,
          contactPhone: destinationFormData.contactPhone.trim() || undefined,
          notes: destinationFormData.notes.trim() || undefined,
          status: destinationFormData.status,
        });

        toast.success('Destination registered successfully!');
        setDestinationModalMode(null);
        fetchDestinations(selectedLeadForDestinations.id);
        fetchLeads();
      } else if (destinationModalMode === 'edit' && editingDestinationId) {
        await leadsApi.updateLeadDestination(
          selectedLeadForDestinations.id,
          editingDestinationId,
          {
            name: destinationFormData.name.trim(),
            address: destinationFormData.address.trim() || undefined,
            city: destinationFormData.city.trim() || undefined,
            state: destinationFormData.state.trim() || undefined,
            pincode: destinationFormData.pincode.trim() || undefined,
            latitude: destinationFormData.latitude.trim() || null,
            longitude: destinationFormData.longitude.trim() || null,
            placeId: destinationFormData.placeId?.trim() || undefined,
            contactPerson: destinationFormData.contactPerson.trim() || undefined,
            contactPhone: destinationFormData.contactPhone.trim() || undefined,
            notes: destinationFormData.notes.trim() || undefined,
            status: destinationFormData.status,
          }
        );

        toast.success('Destination updated successfully!');
        setDestinationModalMode(null);
        fetchDestinations(selectedLeadForDestinations.id);
        fetchLeads();
      }
    } catch (err: any) {
      setDestinationFormError(err?.message || 'Failed to save destination');
    } finally {
      setDestinationFormSubmitting(false);
    }
  };

  const handleDeleteDestination = async (destination: CustomerDestination) => {
    if (!selectedLeadForDestinations) return;
    const confirmed = await confirmModal({
      title: 'Remove Destination Site',
      message: `Are you sure you want to remove "${destination.name}" from this lead?`,
      confirmText: 'Remove Destination',
      variant: 'danger',
    });
    if (!confirmed) return;

    setDeletingDestinationId(destination.id);
    try {
      await leadsApi.deleteLeadDestination(selectedLeadForDestinations.id, destination.id);
      toast.success(`Destination "${destination.name}" removed successfully.`);
      fetchDestinations(selectedLeadForDestinations.id);
      fetchLeads();
    } catch (err: any) {
      toast.error('Failed to delete destination', err?.message);
    } finally {
      setDeletingDestinationId(null);
    }
  };


  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const res = await employeeService.getEmployees();
        const empList = Array.isArray(res) ? res : (res as any)?.data || [];
        if (Array.isArray(empList) && empList.length > 0) {
          setEmployees(empList);
        }
      } catch (err) {
        console.warn('Failed to load employee list:', err);
      }
    };
    if (isAdminOrManager) {
      loadEmployees();
    }
  }, [isAdminOrManager]);

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'view' | 'edit' | 'add'>('view');
  const [activeLead, setActiveLead] = useState<Lead | null>(null);

  // Fetch leads from backend
  const fetchLeads = async () => {
    try {
      const data = await leadsApi.getLeads({
        search: searchQuery,
        status: selectedStatus,
        priority: selectedPriority,
        assignee: selectedAssignee,
      });
      if (Array.isArray(data)) {
        setLeads(data);
      }
    } catch (err) {
      console.warn('Fetch leads error:', err);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [searchQuery, selectedStatus, selectedPriority, selectedAssignee]);

  // Filtered leads calculation
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchesSearch =
        lead.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.productInterested.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (lead.id && lead.id.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        selectedStatus === 'ALL' || lead.status.toUpperCase() === selectedStatus.toUpperCase();

      const matchesPriority =
        selectedPriority === 'ALL' || lead.priority.toUpperCase() === selectedPriority.toUpperCase();

      const matchesAssignee =
        selectedAssignee === 'ALL' || lead.assignedExecutive === selectedAssignee;

      const matchesScope =
        viewScope === 'ALL' ||
        (user?.fullName &&
          lead.assignedExecutive?.toLowerCase().includes(user.fullName.toLowerCase()));

      return matchesSearch && matchesStatus && matchesPriority && matchesAssignee && matchesScope;
    });
  }, [leads, searchQuery, selectedStatus, selectedPriority, selectedAssignee, viewScope, user]);

  // Key Stats Calculations
  const stats = useMemo(() => {
    const totalCount = leads.length;
    const totalPipelineValue = leads.reduce((sum, l) => sum + (l.expectedValue || 0), 0);
    const wonLeads = leads.filter((l) =>
      ['APPROVED', 'COMPLETED', 'APPROVED/PO'].includes((l.status || '').toUpperCase())
    );
    const wonValue = wonLeads.reduce((sum, l) => sum + (l.expectedValue || 0), 0);
    const winRate = totalCount > 0 ? Math.round((wonLeads.length / totalCount) * 100) : 0;
    const urgentCount = leads.filter((l) =>
      ['HIGH', 'URGENT'].includes((l.priority || '').toUpperCase())
    ).length;

    return { totalCount, totalPipelineValue, wonValue, winRate, urgentCount };
  }, [leads]);

  // CSV Export helper
  const handleExportCsv = () => {
    if (filteredLeads.length === 0) return;
    const headers = [
      'ID',
      'Customer Name',
      'Company Name',
      'Email',
      'Phone',
      'Product Interested',
      'Expected Value (INR)',
      'Assigned Executive',
      'Priority',
      'Status',
      'Source',
    ];

    const rows = filteredLeads.map((l) => [
      l.id,
      `"${(l.customerName || '').replace(/"/g, '""')}"`,
      `"${(l.companyName || '').replace(/"/g, '""')}"`,
      l.email || '',
      l.phone || '',
      `"${(l.productInterested || '').replace(/"/g, '""')}"`,
      l.expectedValue || 0,
      `"${(l.assignedExecutive || '').replace(/"/g, '""')}"`,
      l.priority,
      l.status,
      l.source || '',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `leads_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.info('Export Complete', 'Leads CSV downloaded successfully.');
  };

  // Drawer Action Triggers
  const handleOpenView = (lead: Lead) => {
    setActiveLead(lead);
    setDrawerMode('view');
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (lead: Lead) => {
    setActiveLead(lead);
    setDrawerMode('edit');
    setIsDrawerOpen(true);
  };

  const handleOpenAdd = () => {
    setActiveLead(null);
    setDrawerMode('add');
    setIsDrawerOpen(true);
  };

  const handleDeleteLead = async (id: string, name: string) => {
    if (!isAdminOrManager) {
      toast.warning('Permission Denied', 'Access Restricted: Only Managers or Admins can delete lead records.');
      return;
    }

    const isConfirmed = await confirmModal.danger(
      'Delete Lead',
      `Are you sure you want to delete lead for "${name}"? This record will be permanently deleted.`,
      'Delete Lead'
    );

    if (isConfirmed) {
      try {
        await leadsApi.deleteLead(id);
        toast.success(`Lead for "${name}" deleted successfully.`);
        setLeads((prev) => prev.filter((item) => item.id !== id));
        fetchLeads();
      } catch (err: any) {
        toast.error('Failed to delete lead', err?.message);
      }
    }
  };

  const handleLeadUpdated = (updatedLead: Lead) => {
    setLeads((prev) => prev.map((item) => (item.id === updatedLead.id ? updatedLead : item)));
    setActiveLead(updatedLead);
  };

  const handleSaveLead = async (savedLead: Lead) => {
    try {
      const exists = leads.some((item) => item.id === savedLead.id);
      if (exists) {
        const updated = await leadsApi.updateLead(savedLead.id, savedLead);
        const finalLead = updated || savedLead;
        setLeads((prev) => prev.map((item) => (item.id === savedLead.id ? finalLead : item)));
        toast.success('Lead updated successfully');
      } else {
        const created = await leadsApi.createLead(savedLead);
        const finalLead = created || savedLead;
        setLeads((prev) => [finalLead, ...prev.filter((l) => l.id !== finalLead.id)]);
        toast.success('Lead created successfully');
      }
    } catch (err: any) {
      toast.error('Failed to save lead', err?.message);
    } finally {
      fetchLeads();
    }
    setIsDrawerOpen(false);
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-10 select-none">

      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 sm:p-5 rounded-xl border border-border shadow-xs">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-medium tracking-wider text-slate-400 uppercase">
              LEADS PIPELINE
            </span>
            {user && (
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/80 whitespace-nowrap">
                User: {user.fullName} ({user.role})
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-[22px] font-semibold text-slate-900 tracking-tight leading-tight">
            Lead Management
          </h1>
          <p className="text-xs sm:text-[13px] text-slate-500 leading-relaxed mt-0.5">
            Capture, track, and convert prospective client opportunities into active orders
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 w-full sm:w-auto shrink-0">
          <Button
            variant="outline"
            size="md"
            className="flex-1 sm:flex-initial"
            onClick={handleExportCsv}
            disabled={filteredLeads.length === 0}
            title="Download CSV report of current leads list"
          >
            <Download size={14} className="mr-1.5 shrink-0" />
            <span className="truncate">Export CSV</span>
          </Button>
          <Button
            variant="primary"
            size="md"
            className="flex-1 sm:flex-initial"
            onClick={handleOpenAdd}
          >
            <Plus size={15} className="mr-1.5 shrink-0" />
            <span className="truncate">Add New Lead</span>
          </Button>
        </div>
      </div>

      {/* KPI Stats Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3.5">
        <div className="bg-card p-2.5 sm:p-4 rounded-lg sm:rounded-xl border border-border shadow-xs flex items-center justify-between min-w-0">
          <div className="space-y-0.5 sm:space-y-1 min-w-0">
            <span className="text-[11px] sm:text-xs text-slate-500 font-medium block truncate">Total Leads</span>
            <span className="text-base sm:text-[22px] font-bold text-slate-900 tabular-nums leading-tight sm:leading-none block truncate">{stats.totalCount}</span>
            <span className="text-[10px] sm:text-[11px] text-slate-400 block truncate">In CRM Database</span>
          </div>
          <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-md sm:rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 [&>svg]:w-3.5 [&>svg]:h-3.5 sm:[&>svg]:w-[18px] sm:[&>svg]:h-[18px]">
            <Building2 />
          </div>
        </div>

        <div className="bg-card p-2.5 sm:p-4 rounded-lg sm:rounded-xl border border-border shadow-xs flex items-center justify-between min-w-0">
          <div className="space-y-0.5 sm:space-y-1 min-w-0">
            <span className="text-[11px] sm:text-xs text-slate-500 font-medium block truncate">Pipeline Value</span>
            <span className="text-base sm:text-[22px] font-bold text-slate-900 tabular-nums leading-tight sm:leading-none block truncate">
              ₹{(stats.totalPipelineValue / 100000).toFixed(1)}L
            </span>
            <span className="text-[10px] sm:text-[11px] text-slate-400 block truncate">Expected revenue</span>
          </div>
          <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-md sm:rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 [&>svg]:w-3.5 [&>svg]:h-3.5 sm:[&>svg]:w-[18px] sm:[&>svg]:h-[18px]">
            <DollarSign />
          </div>
        </div>

        <div className="bg-card p-2.5 sm:p-4 rounded-lg sm:rounded-xl border border-border shadow-xs flex items-center justify-between min-w-0">
          <div className="space-y-0.5 sm:space-y-1 min-w-0">
            <span className="text-[11px] sm:text-xs text-slate-500 font-medium block truncate">Won Revenue</span>
            <span className="text-base sm:text-[22px] font-bold text-emerald-600 tabular-nums leading-tight sm:leading-none block truncate">
              ₹{(stats.wonValue / 100000).toFixed(1)}L
            </span>
            <span className="text-[10px] sm:text-[11px] text-slate-400 block truncate">Approved / Closed</span>
          </div>
          <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-md sm:rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 [&>svg]:w-3.5 [&>svg]:h-3.5 sm:[&>svg]:w-[18px] sm:[&>svg]:h-[18px]">
            <CheckCircle2 />
          </div>
        </div>

        <div className="bg-card p-2.5 sm:p-4 rounded-lg sm:rounded-xl border border-border shadow-xs flex items-center justify-between min-w-0">
          <div className="space-y-0.5 sm:space-y-1 min-w-0">
            <span className="text-[11px] sm:text-xs text-slate-500 font-medium block truncate">Win Rate</span>
            <span className="text-base sm:text-[22px] font-bold text-slate-900 tabular-nums leading-tight sm:leading-none block truncate">{stats.winRate}%</span>
            <span className="text-[10px] sm:text-[11px] text-slate-400 block truncate">Conversion ratio</span>
          </div>
          <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-md sm:rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 [&>svg]:w-3.5 [&>svg]:h-3.5 sm:[&>svg]:w-[18px] sm:[&>svg]:h-[18px]">
            <TrendingUp />
          </div>
        </div>

        <div className="bg-card p-2.5 sm:p-4 rounded-lg sm:rounded-xl border border-border shadow-xs flex items-center justify-between min-w-0 col-span-2 sm:col-span-1">
          <div className="space-y-0.5 sm:space-y-1 min-w-0">
            <span className="text-[11px] sm:text-xs text-slate-500 font-medium block truncate">High Priority</span>
            <span className="text-base sm:text-[22px] font-bold text-rose-600 tabular-nums leading-tight sm:leading-none block truncate">{stats.urgentCount}</span>
            <span className="text-[10px] sm:text-[11px] text-slate-400 block truncate">Urgent / High deals</span>
          </div>
          <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-md sm:rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 [&>svg]:w-3.5 [&>svg]:h-3.5 sm:[&>svg]:w-[18px] sm:[&>svg]:h-[18px]">
            <AlertCircle />
          </div>
        </div>
      </div>

      {/* Filter Toolbar Box */}
      <div className="bg-card p-3.5 rounded-xl border border-border shadow-xs flex flex-wrap items-center gap-2.5">
        {/* View Scope Tabs ("All Leads" vs "My Leads") */}
        {isAdminOrManager ? (
          <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-border shrink-0">
            <button
              type="button"
              onClick={() => setViewScope('ALL')}
              className={`h-8 px-3 rounded-md text-xs font-medium transition-all cursor-pointer ${viewScope === 'ALL'
                ? 'bg-white text-slate-900 shadow-xs border border-border/60'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              All Leads
            </button>
            <button
              type="button"
              onClick={() => setViewScope('MY')}
              className={`h-8 px-3 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center gap-1 ${viewScope === 'MY'
                ? 'bg-white text-blue-600 shadow-xs border border-border/60'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <UserCheck size={13} />
              <span>My Leads</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200/80 rounded-lg text-xs font-medium shrink-0">
            <UserCheck size={13} className="mr-1.5" />
            <span>My Leads</span>
          </div>
        )}

        {/* Search Field */}
        <SearchInput
          placeholder="Search customer, company, product..."
          value={searchQuery}
          onChange={setSearchQuery}
          wrapperClassName="flex-1 min-w-50"
        />

        {/* Status Filter */}
        <select
          className="h-9 px-2.5 bg-white border border-border rounded-lg text-[13px] font-medium text-slate-700 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all cursor-pointer"
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
        >
          <option value="ALL">All Statuses</option>
          <option value="NEW">New Leads</option>
          <option value="CONTACTED">Contacted</option>
          <option value="MEETING SCHEDULED">Meeting Scheduled</option>
          <option value="QUOTATION SENT">Quotation Sent</option>
          <option value="NEGOTIATION">Negotiation</option>
          <option value="ORDER CONFIRMED">Order Confirmed</option>
          <option value="READY FOR DISPATCH">Ready for Dispatch</option>
          <option value="DISPATCHED">Dispatched</option>
          <option value="INSTALLATION">Installation</option>
          <option value="COMPLETED">Completed</option>
          <option value="LOST">Lost</option>
        </select>

        {/* Priority Filter */}
        <select
          className="h-9 px-2.5 bg-white border border-border rounded-lg text-[13px] font-medium text-slate-700 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all cursor-pointer"
          value={selectedPriority}
          onChange={(e) => setSelectedPriority(e.target.value)}
        >
          <option value="ALL">All Priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </select>

        {/* Assignee Filter (Only for Admin/Manager) */}
        {isAdminOrManager && (
          <select
            className="h-9 px-2.5 bg-white border border-border rounded-lg text-[13px] font-medium text-slate-700 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all cursor-pointer max-w-48 truncate"
            value={selectedAssignee}
            onChange={(e) => setSelectedAssignee(e.target.value)}
          >
            <option value="ALL">All Assignees</option>
            {employees.length > 0 ? (
              employees.map((emp) => (
                <option key={emp.id} value={emp.fullName}>
                  {emp.fullName}
                </option>
              ))
            ) : (
              <>
                <option value="Nilesh Mehta">Nilesh Mehta</option>
                <option value="Amit Patel">Amit Patel</option>
                <option value="Rahul Shah (Admin)">Rahul Shah (Admin)</option>
              </>
            )}
          </select>
        )}
      </div>

      {/* Leads Table Container */}
      <div className="bg-card rounded-xl border border-border shadow-xs overflow-hidden flex flex-col w-full">
        <div className="w-full overflow-x-auto">
          <Table density="standard" className="w-full min-w-[980px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-24 min-w-[85px]">ID</TableHead>
                <TableHead className="min-w-[180px]">
                  <div className="flex items-center gap-1.5 cursor-pointer hover:text-slate-600">
                    <span>CLIENT</span>
                    <ArrowUpDown size={12} />
                  </div>
                </TableHead>
                <TableHead className="min-w-[150px]">SERVICE DESTINATIONS</TableHead>
                <TableHead className="min-w-[170px]">PRODUCT INTERESTED</TableHead>
                <TableHead align="right" className="min-w-[130px]">
                  <div className="flex items-center justify-end gap-1.5 cursor-pointer hover:text-slate-600">
                    <span>EXPECTED VALUE</span>
                    <ArrowUpDown size={12} />
                  </div>
                </TableHead>
                <TableHead className="min-w-[140px]">{isAdminOrManager ? 'ASSIGNED TO' : 'ASSIGNED BY'}</TableHead>
                <TableHead align="center" className="w-28 min-w-[95px]">PRIORITY</TableHead>
                <TableHead align="center" className="w-40 min-w-[150px]">STATUS</TableHead>
                <TableHead align="right" className="w-32 min-w-[120px]">ACTIONS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.length === 0 ? (
                <TableEmptyState
                  colSpan={9}
                  icon={<Building2 size={24} />}
                  title="No leads found matching criteria"
                  description="No leads match your active filters. Try resetting search criteria or adding a new lead."
                  action={
                    <button
                      type="button"
                      onClick={handleOpenAdd}
                      className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium cursor-pointer shadow-xs"
                    >
                      Add New Lead
                    </button>
                  }
                />
              ) : (
                filteredLeads.map((lead) => (
                  <TableRow
                    key={lead.id}
                    className="hover:bg-slate-50/60 transition-colors group"
                  >
                    {/* ID */}
                    <TableCell className="align-middle font-mono text-[11px] text-slate-500 font-medium">
                      {lead.id}
                    </TableCell>

                    {/* CLIENT */}
                    <TableCell className="align-middle">
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-slate-900 text-xs truncate">
                          {lead.customerName}
                        </span>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 font-normal mt-0.5 truncate">
                          <Building2 size={11} className="shrink-0" />
                          <span className="truncate">{lead.companyName}</span>
                        </div>
                      </div>
                    </TableCell>

                    {/* SERVICE DESTINATIONS */}
                    <TableCell className="align-middle">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200/70 hover:bg-indigo-100 transition-colors cursor-pointer"
                        onClick={() => handleOpenDestinations(lead)}
                        title="Click to view/manage lead destinations & facilities"
                      >
                        <MapPin size={11} />
                        <span className="tabular-nums">
                          {lead.destinationCount || 0}{' '}
                          {lead.destinationCount === 1 ? 'Site' : 'Sites'}
                        </span>
                      </button>
                    </TableCell>

                    {/* PRODUCT INTERESTED */}
                    <TableCell className="align-middle text-slate-700 text-xs font-medium">
                      {lead.productInterested}
                    </TableCell>

                    {/* EXPECTED VALUE */}
                    <TableCell align="right" className="align-middle font-semibold text-slate-900 text-xs tabular-nums">
                      ₹{lead.expectedValue.toLocaleString('en-IN')}
                    </TableCell>

                    {/* ASSIGNED TO / ASSIGNED BY */}
                    <TableCell className="align-middle text-slate-700 text-xs">
                      {isAdminOrManager ? (
                        lead.assignedExecutive || 'Unassigned'
                      ) : (
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-900">{lead.createdBy || 'System Admin'}</span>
                          <span className="text-[11px] text-slate-400">Assigned: {lead.assignedExecutive}</span>
                        </div>
                      )}
                    </TableCell>

                    {/* PRIORITY */}
                    <TableCell align="center" className="align-middle whitespace-nowrap">
                      <div className="flex justify-center">
                        <StatusPill
                          variant={
                            lead.priority.toUpperCase() === 'URGENT' || lead.priority.toUpperCase() === 'HIGH'
                              ? 'danger'
                              : lead.priority.toUpperCase() === 'MEDIUM'
                              ? 'warning'
                              : 'neutral'
                          }
                          size="xs"
                        >
                          {lead.priority}
                        </StatusPill>
                      </div>
                    </TableCell>

                    {/* STATUS */}
                    <TableCell align="center" className="align-middle whitespace-nowrap px-3">
                      <div className="flex justify-center">
                        <StatusPill
                          variant={
                            lead.status.toUpperCase().includes('COMPLETED') || lead.status.toUpperCase().includes('DISPATCHED') || lead.status.toUpperCase().includes('APPROVED')
                              ? 'success'
                              : lead.status.toUpperCase() === 'LOST'
                              ? 'danger'
                              : lead.status.toUpperCase().includes('NEW') || lead.status.toUpperCase().includes('NEGOTIATION') || lead.status.toUpperCase().includes('CONTACTED')
                              ? 'warning'
                              : 'info'
                          }
                          dot
                          size="xs"
                        >
                          {lead.status}
                        </StatusPill>
                      </div>
                    </TableCell>

                    {/* ACTIONS */}
                    <TableCell align="right" className="align-middle whitespace-nowrap pl-4 pr-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenView(lead)}
                          title="View Lead Details"
                          className="p-1.5 rounded-md border border-border bg-white text-slate-500 hover:text-blue-600 hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(lead)}
                          title="Edit Lead"
                          className="p-1.5 rounded-md border border-border bg-white text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          <Pencil size={13} />
                        </button>
                        {isAdminOrManager && (
                          <button
                            type="button"
                            onClick={() => handleDeleteLead(lead.id, lead.customerName)}
                            title="Delete Lead"
                            className="p-1.5 rounded-md border border-border bg-white text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Slide-Over Drawer Integration */}
      <LeadDrawer
        isOpen={isDrawerOpen}
        mode={drawerMode}
        lead={activeLead}
        onClose={() => setIsDrawerOpen(false)}
        onSave={handleSaveLead}
        onLeadUpdated={handleLeadUpdated}
        onSwitchToEdit={() => setDrawerMode('edit')}
        onOpenDestinations={handleOpenDestinations}
      />

      {/* Lead Destinations Drawer */}
      <DestinationsDrawer
        customer={
          selectedLeadForDestinations
            ? {
                name: selectedLeadForDestinations.customerName,
                companyName: selectedLeadForDestinations.companyName,
              }
            : null
        }
        title="Lead Destinations & Facilities"
        destinations={destinations}
        loading={loadingDestinations}
        onClose={() => {
          setSelectedLeadForDestinations(null);
          setDestinationModalMode(null);
        }}
        onAddDestination={handleOpenCreateDestination}
        onEditDestination={handleOpenEditDestination}
        onDeleteDestination={handleDeleteDestination}
        deletingDestinationId={deletingDestinationId}
        canManage={true}
      />

      {/* Register Destination Site Modal */}
      <DestinationModal
        modalMode={destinationModalMode}
        isOpen={Boolean(destinationModalMode)}
        onClose={() => setDestinationModalMode(null)}
        onSubmit={handleDestinationSubmit}
        formData={destinationFormData}
        onInputChange={handleDestinationInputChange}
        onSelectAddressSuggestion={handleSelectAddressSuggestion}
        formSubmitting={destinationFormSubmitting}
        formError={destinationFormError}
      />

    </div>
  );
};

