import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Search,
  Building2,
  Eye,
  Pencil,
  Trash2,
  ArrowUpDown,
} from 'lucide-react';
import { Lead } from '../types/lead';
import { initialLeads } from '../data/initialLeads';
import { LeadDrawer } from '../components/LeadDrawer';
import { leadsApi } from '../api/leadsApi';

export const LeadManagementPage: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('ALL');

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
      if (Array.isArray(data) && data.length > 0) {
        setLeads(data);
      }
    } catch (err) {
      // Graceful fallback to initial mock data if server API is starting
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

      return matchesSearch && matchesStatus && matchesPriority && matchesAssignee;
    });
  }, [leads, searchQuery, selectedStatus, selectedPriority, selectedAssignee]);

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
    if (window.confirm(`Are you sure you want to delete lead for "${name}"?`)) {
      try {
        await leadsApi.deleteLead(id);
      } catch (err) {
        // Fallback for offline mode
      }
      setLeads((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const handleSaveLead = async (savedLead: Lead) => {
    try {
      const exists = leads.some((item) => item.id === savedLead.id);
      if (exists) {
        const updated = await leadsApi.updateLead(savedLead.id, savedLead);
        setLeads((prev) => prev.map((item) => (item.id === savedLead.id ? updated || savedLead : item)));
      } else {
        const created = await leadsApi.createLead(savedLead);
        setLeads((prev) => [created || savedLead, ...prev]);
      }
    } catch (err) {
      setLeads((prev) => {
        const exists = prev.some((item) => item.id === savedLead.id);
        if (exists) {
          return prev.map((item) => (item.id === savedLead.id ? savedLead : item));
        }
        return [savedLead, ...prev];
      });
    }
    setIsDrawerOpen(false);
  };

  // Helper for Status Badge styling
  const getStatusBadgeStyle = (status: string) => {
    switch (status.toUpperCase()) {
      case 'APPROVED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
      case 'MEETING SCHEDULED':
        return 'bg-blue-50 text-blue-700 border-blue-200/80';
      case 'PROPOSAL SENT':
        return 'bg-purple-50 text-purple-700 border-purple-200/80';
      case 'CONTACTED':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200/80';
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
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Lead Management
          </h1>
        </div>
        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <Plus size={18} />
          <span>Add New Lead</span>
        </button>
      </div>

      {/* Filter Toolbar Box */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center gap-3">
        {/* Search Field */}
        <div className="relative flex-1 min-w-[240px]">
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
          <option value="APPROVED">Approved</option>
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

        {/* Assignee Filter */}
        <select
          className="px-3.5 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
          value={selectedAssignee}
          onChange={(e) => setSelectedAssignee(e.target.value)}
        >
          <option value="ALL">All Assignees</option>
          <option value="Nilesh Mehta">Nilesh Mehta</option>
          <option value="Amit Patel">Amit Patel</option>
          <option value="Rahul Shah (Admin)">Rahul Shah (Admin)</option>
        </select>
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
                <th className="py-4 px-6">ASSIGNED TO</th>
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

                    {/* ASSIGNED TO */}
                    <td className="py-4 px-6 font-medium text-slate-700">
                      {lead.assignedExecutive}
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
                        <button
                          type="button"
                          onClick={() => handleDeleteLead(lead.id, lead.customerName)}
                          title="Delete Lead"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer border border-transparent hover:border-rose-200"
                        >
                          <Trash2 size={16} />
                        </button>
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
