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
      alert('Access Restricted: Only Managers or Admins can delete lead records.');
      return;
    }

    if (window.confirm(`Are you sure you want to delete lead for "${name}"?`)) {
      try {
        await leadsApi.deleteLead(id);
      } catch (err) {
        console.warn('Delete lead error:', err);
      }
      setLeads((prev) => prev.filter((item) => item.id !== id));
      fetchLeads();
    }
  };

  const handleSaveLead = async (savedLead: Lead) => {
    try {
      const exists = leads.some((item) => item.id === savedLead.id);
      if (exists) {
        const updated = await leadsApi.updateLead(savedLead.id, savedLead);
        const finalLead = updated || savedLead;
        setLeads((prev) => prev.map((item) => (item.id === savedLead.id ? finalLead : item)));
      } else {
        const created = await leadsApi.createLead(savedLead);
        const finalLead = created || savedLead;
        setLeads((prev) => [finalLead, ...prev.filter((l) => l.id !== finalLead.id)]);
      }
    } catch (err) {
      console.error('Save lead error:', err);
    } finally {
      fetchLeads();
    }
    setIsDrawerOpen(false);
  };

  // Helper for Status Badge styling
  const getStatusBadgeStyle = (status: string) => {
    switch (status.toUpperCase()) {
      case 'APPROVED':
      case 'APPROVED/PO':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
      case 'MEETING SCHEDULED':
        return 'bg-blue-50 text-blue-700 border-blue-200/80';
      case 'PROPOSAL SENT':
      case 'QUOTATION SENT':
        return 'bg-purple-50 text-purple-700 border-purple-200/80';
      case 'CONTACTED':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200/80';
      case 'NEGOTIATION':
        return 'bg-amber-50 text-amber-800 border-amber-300';
      case 'INSTALLATION':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 'AMC SUPPORT':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'COMPLETED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'NEW':
        return 'bg-amber-50 text-amber-700 border-amber-200/80';
      case 'LOST':
        return 'bg-rose-50 text-rose-700 border-rose-200/80';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // Helper for Priority Badge styling
  const getPriorityBadgeStyle = (priority: string) => {
    switch (priority.toUpperCase()) {
      case 'URGENT':
      case 'HIGH':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'MEDIUM':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-16 select-none">

      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold tracking-widest text-slate-400 uppercase">
              LEADS PIPELINE
            </span>
            {user && (
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/80">
                User: {user.fullName} ({user.role})
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Lead Management
          </h1>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filteredLeads.length === 0}
            className="px-3.5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 font-bold text-xs sm:text-sm rounded-xl shadow-2xs hover:shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            title="Download CSV report of current leads list"
          >
            <Download size={16} />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus size={18} />
            <span>Add New Lead</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col gap-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Leads</span>
            <Building2 size={16} className="text-blue-500" />
          </div>
          <span className="text-xl font-bold text-slate-900">{stats.totalCount}</span>
          <span className="text-[11px] text-slate-400 font-medium">In CRM Database</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col gap-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Pipeline Value</span>
            <DollarSign size={16} className="text-emerald-500" />
          </div>
          <span className="text-xl font-bold text-slate-900">
            ₹{(stats.totalPipelineValue / 100000).toFixed(1)}L
          </span>
          <span className="text-[11px] text-slate-400 font-medium">Expected revenue</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col gap-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Won Revenue</span>
            <CheckCircle2 size={16} className="text-purple-500" />
          </div>
          <span className="text-xl font-bold text-emerald-600">
            ₹{(stats.wonValue / 100000).toFixed(1)}L
          </span>
          <span className="text-[11px] text-slate-400 font-medium">Approved / Closed</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col gap-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Win Rate</span>
            <TrendingUp size={16} className="text-amber-500" />
          </div>
          <span className="text-xl font-bold text-slate-900">{stats.winRate}%</span>
          <span className="text-[11px] text-slate-400 font-medium">Conversion ratio</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col gap-1 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">High Priority</span>
            <AlertCircle size={16} className="text-rose-500" />
          </div>
          <span className="text-xl font-bold text-rose-600">{stats.urgentCount}</span>
          <span className="text-[11px] text-slate-400 font-medium">Urgent / High deals</span>
        </div>
      </div>

      {/* Filter Toolbar Box */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center gap-3">
        {/* View Scope Tabs ("All Leads" vs "My Leads") */}
        {isAdminOrManager ? (
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80 shrink-0">
            <button
              type="button"
              onClick={() => setViewScope('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${viewScope === 'ALL'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              All Leads
            </button>
            <button
              type="button"
              onClick={() => setViewScope('MY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${viewScope === 'MY'
                ? 'bg-white text-blue-600 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              <UserCheck size={13} />
              <span>My Leads</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200/80 rounded-xl text-xs font-bold shrink-0">
            <UserCheck size={14} className="mr-1.5" />
            <span>My Leads</span>
          </div>
        )}

        {/* Search Field */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            placeholder="Search customer, company, product..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Status Filter */}
        <select
          className="px-3.5 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
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
          className="px-3.5 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
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
            className="px-3.5 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
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
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-6">ID</th>
                <th className="py-4 px-6">
                  <div className="flex items-center gap-1.5 cursor-pointer hover:text-slate-600">
                    <span>CLIENT</span>
                    <ArrowUpDown size={13} />
                  </div>
                </th>
                <th className="py-4 px-6">PRODUCT INTERESTED</th>
                <th className="py-4 px-6">
                  <div className="flex items-center gap-1.5 cursor-pointer hover:text-slate-600">
                    <span>EXPECTED VALUE</span>
                    <ArrowUpDown size={13} />
                  </div>
                </th>
                <th className="py-4 px-6">{isAdminOrManager ? 'ASSIGNED TO' : 'ASSIGNED BY'}</th>
                <th className="py-4 px-6">PRIORITY</th>
                <th className="py-4 px-6">STATUS</th>
                <th className="py-4 px-6 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredLeads.length > 0 ? (
                filteredLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="hover:bg-slate-50/60 transition-colors group"
                  >
                    {/* ID */}
                    <td className="py-4 px-6 font-mono text-xs text-slate-400 font-medium">
                      {lead.id}
                    </td>

                    {/* CLIENT */}
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {lead.customerName}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-slate-400 font-medium mt-0.5">
                          <Building2 size={13} />
                          <span>{lead.companyName}</span>
                        </div>
                      </div>
                    </td>

                    {/* PRODUCT INTERESTED */}
                    <td className="py-4 px-6 font-medium text-slate-700">
                      {lead.productInterested}
                    </td>

                    {/* EXPECTED VALUE */}
                    <td className="py-4 px-6 font-bold text-slate-900">
                      ₹{lead.expectedValue.toLocaleString('en-IN')}
                    </td>

                    {/* ASSIGNED TO / ASSIGNED BY */}
                    <td className="py-4 px-6 font-medium text-slate-700">
                      {isAdminOrManager ? (
                        lead.assignedExecutive || 'Unassigned'
                      ) : (
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900">{lead.createdBy || 'System Admin'}</span>
                          <span className="text-[11px] text-slate-400">Assigned to: {lead.assignedExecutive}</span>
                        </div>
                      )}
                    </td>

                    {/* PRIORITY */}
                    <td className="py-4 px-6">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getPriorityBadgeStyle(
                          lead.priority
                        )}`}
                      >
                        {lead.priority}
                      </span>
                    </td>

                    {/* STATUS */}
                    <td className="py-4 px-6">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusBadgeStyle(
                          lead.status
                        )}`}
                      >
                        {lead.status}
                      </span>
                    </td>

                    {/* ACTIONS */}
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenView(lead)}
                          title="View Lead Details"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer border border-transparent hover:border-blue-200"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(lead)}
                          title="Edit Lead"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer border border-transparent hover:border-slate-200"
                        >
                          <Pencil size={16} />
                        </button>
                        {isAdminOrManager && (
                          <button
                            type="button"
                            onClick={() => handleDeleteLead(lead.id, lead.customerName)}
                            title="Delete Lead"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer border border-transparent hover:border-rose-200"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Search size={24} className="text-slate-300" />
                      <p className="text-sm font-semibold text-slate-600">No leads found matching criteria</p>
                      <p className="text-xs text-slate-400">Try adjusting your search query or filters.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
