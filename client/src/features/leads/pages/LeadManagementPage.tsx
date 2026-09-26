import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Search,
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
} from 'lucide-react';
import { Lead } from '../types/lead';
import { LeadDrawer } from '../components/LeadDrawer';
import { leadsApi } from '../api/leadsApi';
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
        <div className="relative flex-1 min-w-50">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            className="w-full h-9 pl-9 pr-3 bg-white border border-border rounded-lg text-[13px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
            placeholder="Search customer, company, product..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Status Filter */}
        <select
          className="h-9 px-2.5 bg-white border border-border rounded-lg text-[13px] font-medium text-slate-700 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all cursor-pointer"
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
        >
          <option value="ALL">All Statuses</option>
          <option value="NEW">New</option>
          <option value="CONTACTED">Contacted</option>
          <option value="MEETING SCHEDULED">Meeting Scheduled</option>
          <option value="PROPOSAL SENT">Proposal Sent</option>
          <option value="NEGOTIATION">Negotiation</option>
          <option value="APPROVED">Approved / PO</option>
          <option value="INSTALLATION">Installation</option>
          <option value="AMC SUPPORT">AMC Support</option>
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
          <Table density="standard" className="min-w-225 md:min-w-0 md:table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="md:w-[10%]">ID</TableHead>
                <TableHead className="md:w-[22%]">
                  <div className="flex items-center gap-1.5 cursor-pointer hover:text-slate-600">
                    <span>CLIENT</span>
                    <ArrowUpDown size={12} />
                  </div>
                </TableHead>
                <TableHead className="md:w-[18%]">PRODUCT INTERESTED</TableHead>
                <TableHead align="right" className="md:w-[14%]">
                  <div className="flex items-center justify-end gap-1.5 cursor-pointer hover:text-slate-600">
                    <span>EXPECTED VALUE</span>
                    <ArrowUpDown size={12} />
                  </div>
                </TableHead>
                <TableHead className="md:w-[14%]">{isAdminOrManager ? 'ASSIGNED TO' : 'ASSIGNED BY'}</TableHead>
                <TableHead align="center" className="md:w-[8%]">PRIORITY</TableHead>
                <TableHead align="center" className="md:w-[9%]">STATUS</TableHead>
                <TableHead align="right" className="md:w-[8%]">ACTIONS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.length === 0 ? (
                <TableEmptyState
                  colSpan={8}
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
                    <TableCell align="center" className="align-middle">
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
                    </TableCell>

                    {/* STATUS */}
                    <TableCell align="center" className="align-middle">
                      <StatusPill
                        variant={
                          lead.status.toUpperCase().includes('APPROVED') || lead.status.toUpperCase() === 'COMPLETED'
                            ? 'success'
                            : lead.status.toUpperCase() === 'LOST'
                            ? 'danger'
                            : lead.status.toUpperCase() === 'NEW' || lead.status.toUpperCase() === 'NEGOTIATION'
                            ? 'warning'
                            : 'info'
                        }
                        dot
                        size="xs"
                      >
                        {lead.status}
                      </StatusPill>
                    </TableCell>

                    {/* ACTIONS */}
                    <TableCell align="right" className="align-middle whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
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
        onSwitchToEdit={() => setDrawerMode('edit')}
      />

    </div>
  );
};
