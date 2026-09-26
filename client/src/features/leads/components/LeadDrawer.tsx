import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Pencil,
  Building2,
  Tag,
  IndianRupee,
  User,
  Phone,
  Mail,
  MapPin,
  Clock,
  FileText,
  Send,
  MessageSquare,
  UserCheck,
} from 'lucide-react';
import { Lead, LeadPriority, LeadStatus, LeadSource } from '../types/lead';
import { useAuthStore } from '../../../stores/authStore';
import { navigate } from '../../../app/router/navigation';
import { employeeService } from '../../admin/services/employeeService';
import { Employee } from '../../admin/types/employee.types';
import { customerService } from '../../customers/services/customerService';
import { toast } from '../../../utils/toast';
import { Customer } from '../../customers/types/customer.types';
import { leadsApi } from '../api/leadsApi';

interface LeadDrawerProps {
  isOpen: boolean;
  mode: 'view' | 'edit' | 'add';
  lead: Lead | null;
  onClose: () => void;
  onSave: (savedLead: Lead) => void;
  onSwitchToEdit?: () => void;
}

export const LeadDrawer: React.FC<LeadDrawerProps> = ({
  isOpen,
  mode,
  lead,
  onClose,
  onSave,
  onSwitchToEdit,
}) => {
  const { user } = useAuthStore();
  const [newNoteText, setNewNoteText] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [customersList, setCustomersList] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  useEffect(() => {
    const loadRefData = async () => {
      try {
        if (user?.role === 'ADMIN' || user?.role === 'MANAGER') {
          const empRes = await employeeService.getEmployees().catch(() => null);
          const empList = Array.isArray(empRes) ? empRes : (empRes as any)?.data || [];
          if (Array.isArray(empList) && empList.length > 0) {
            setEmployees(empList);
          }
        }

        const [custRes, leadsRes] = await Promise.all([
          customerService.getCustomers({ limit: 500 }).catch(() => null),
          leadsApi.getLeads({}).catch(() => null),
        ]);

        let combined: Customer[] = [];

        if (custRes) {
          const custData = Array.isArray(custRes)
            ? custRes
            : Array.isArray((custRes as any)?.data)
            ? (custRes as any).data
            : Array.isArray((custRes as any)?.data?.customers)
            ? (custRes as any).data.customers
            : [];
          combined = [...custData];
        }

        if (leadsRes && Array.isArray(leadsRes)) {
          for (const l of leadsRes) {
            if (l.customerName && l.customerName.trim() !== '') {
              const exists = combined.some(
                (c) =>
                  (l.linkedClientId && c.id === l.linkedClientId) ||
                  c.name.toLowerCase() === l.customerName.toLowerCase() ||
                  (c.companyName && l.companyName && c.companyName.toLowerCase() === l.companyName.toLowerCase())
              );
              if (!exists) {
                combined.push({
                  id: l.linkedClientId || `lead-cust-${l.id}`,
                  name: l.customerName,
                  companyName: l.companyName || l.customerName,
                  email: l.email || null,
                  phone: l.phone || null,
                  address: l.address || null,
                  status: 'ACTIVE',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                } as Customer);
              }
            }
          }
        }

        setCustomersList(combined);

        // If lead has a linkedClientId, fetch specific customer by ID
        if (lead?.linkedClientId) {
          try {
            const singleCustRes = await customerService.getCustomerById(lead.linkedClientId);
            const singleCust = (singleCustRes as any)?.data || singleCustRes;
            if (singleCust && singleCust.id) {
              setCustomersList((prev) => {
                if (!prev.some((c) => c.id === singleCust.id)) {
                  return [singleCust, ...prev];
                }
                return prev;
              });
              setSelectedCustomerId(singleCust.id);
              setFormData((prev) => ({
                ...prev,
                customerName: singleCust.name || prev.customerName,
                companyName: singleCust.companyName || singleCust.name || prev.companyName,
                email: singleCust.email || prev.email || '',
                phone: singleCust.phone || prev.phone || '',
                address: singleCust.address || prev.address || '',
                linkedClientId: singleCust.id,
              }));
            }
          } catch (err) {
            console.warn('Failed to fetch linked customer by ID:', err);
          }
        }
      } catch (err) {
        console.warn('Failed to load reference data for LeadDrawer:', err);
      }
    };
    if (isOpen) {
      loadRefData();
    }
  }, [isOpen, lead?.linkedClientId]);

  const [formData, setFormData] = useState<Partial<Lead>>({
    customerName: '',
    companyName: '',
    email: '',
    phone: '',
    address: '',
    productInterested: 'Magnetic Oil Level Gauge (MOG)',
    expectedValue: 10000,
    assignedExecutive: user?.fullName || '',
    priority: 'Medium',
    status: 'New',
    source: 'Web',
  });

  useEffect(() => {
    if (lead && (mode === 'edit' || mode === 'view')) {
      setFormData(lead);
      const linkedId = lead.linkedClientId;
      if (linkedId) {
        setSelectedCustomerId(linkedId);
      } else if (customersList.length > 0) {
        const match = customersList.find(
          (c) =>
            (c.email && lead.email && c.email.toLowerCase() === lead.email.toLowerCase()) ||
            (c.phone && lead.phone && c.phone === lead.phone) ||
            (c.name && lead.customerName && c.name.toLowerCase() === lead.customerName.toLowerCase())
        );
        if (match) {
          setSelectedCustomerId(match.id);
          setFormData((prev) => ({
            ...prev,
            customerName: match.name || prev.customerName,
            companyName: match.companyName || match.name || prev.companyName,
            email: match.email || prev.email || '',
            phone: match.phone || prev.phone || '',
            address: match.address || prev.address || '',
            linkedClientId: match.id,
          }));
        }
      }
    } else if (mode === 'add') {
      setSelectedCustomerId('');
      setFormData({
        customerName: '',
        companyName: '',
        email: '',
        phone: '',
        address: '',
        productInterested: '100 KVA Power Transformer',
        expectedValue: 25000,
        assignedExecutive: user?.fullName || (employees[0]?.fullName || ''),
        assignedEmployeeId: user?.id || (employees[0]?.id || undefined),
        priority: 'Medium',
        status: 'New',
        source: 'Web',
      });
    }
  }, [lead, mode, user, employees, customersList]);

  // Handle ESC key press to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerName || !formData.companyName) {
      toast.warning('Required Information', 'Please enter customer name and company name.');
      return;
    }

    const authorName = user?.fullName || 'User';
    const newLog = {
      id: `act-${Date.now()}`,
      title: mode === 'add' 
        ? `Lead Created in System by ${authorName}` 
        : `Lead details updated by ${authorName}`,
      date: new Date().toISOString().split('T')[0],
      type: 'User',
    };

    const updatedLogs = lead?.activityLogs ? [newLog, ...lead.activityLogs] : [newLog];

    const savedRecord: Lead = {
      id: lead?.id || `lead-${Math.floor(100 + Math.random() * 900)}`,
      customerName: formData.customerName || '',
      companyName: formData.companyName || '',
      email: formData.email || '',
      phone: formData.phone || '',
      address: formData.address || '',
      productInterested: formData.productInterested || 'Equipment',
      expectedValue: Number(formData.expectedValue) || 0,
      assignedExecutive: formData.assignedExecutive || user?.fullName || 'Unassigned',
      assignedEmployeeId: lead?.assignedEmployeeId || user?.id,
      createdBy: lead?.createdBy || `${user?.fullName || 'User'}${user?.role === 'ADMIN' ? ' (Admin)' : user?.role === 'MANAGER' ? ' (Manager)' : ''}`,
      priority: (formData.priority as LeadPriority) || 'Medium',
      status: (formData.status as LeadStatus) || 'New',
      source: (formData.source as LeadSource) || 'Web',
      linkedClientId: selectedCustomerId || formData.linkedClientId || lead?.linkedClientId,
      activityLogs: updatedLogs,
    };

    onSave(savedRecord);
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim() || !lead) return;

    const authorName = user?.fullName || 'Authenticated User';
    const newLogItem = {
      id: `act-${Date.now()}`,
      title: `${newNoteText.trim()} (by ${authorName})`,
      date: new Date().toISOString().split('T')[0],
      type: 'Note',
    };

    const updatedLead: Lead = {
      ...lead,
      activityLogs: [newLogItem, ...(lead.activityLogs || [])],
    };

    onSave(updatedLead);
    setNewNoteText('');
  };

  const handleCreateQuotation = () => {
    onClose();
    if (lead) {
      const params = new URLSearchParams();
      const cid = selectedCustomerId || lead.linkedClientId;
      if (cid) {
        params.set('customerId', cid);
      }
      if (lead.customerName) {
        params.set('customerName', lead.customerName);
      }
      if (lead.companyName) {
        params.set('companyName', lead.companyName);
      }
      if (lead.id) {
        params.set('leadId', lead.id);
      }
      const queryStr = params.toString();
      navigate(`/quotations/new${queryStr ? `?${queryStr}` : ''}`);
    } else {
      navigate('/quotations/new');
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-hidden select-none">
      {/* Dark Overlay Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300 animate-fade-in"
        onClick={onClose}
      />

      {/* Slide-Over Right Panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 z-[100]">
        <div className="w-screen max-w-xl bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-slide-in-right overflow-y-auto">
          
          {/* Drawer Top Navigation Header */}
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-slate-400 font-medium">
                {mode === 'add' ? 'NEW LEAD' : lead?.id}
              </span>
              {mode === 'edit' && (
                <span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                  EDITING MODE
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {mode === 'view' && onSwitchToEdit && (
                <button
                  type="button"
                  onClick={onSwitchToEdit}
                  className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 flex items-center justify-center transition-colors cursor-pointer border border-slate-200/80"
                  title="Edit Lead"
                >
                  <Pencil size={16} />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer border border-slate-200/80"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Drawer Body Content */}
          <div className="p-6 flex-1 space-y-7">
            
            {/* VIEW MODE */}
            {mode === 'view' && lead && (
              <>
                {/* Lead Headline Header */}
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                    {lead.customerName}
                  </h2>
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                    <Building2 size={16} className="text-slate-400" />
                    <span>{lead.companyName}</span>
                  </div>
                </div>

                {/* Status Card Banner */}
                <div className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl flex items-center justify-between shadow-2xs">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                      LEAD STATUS
                    </span>
                    <span className="text-base font-bold text-slate-800">{lead.status}</span>
                  </div>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold tracking-wide ${
                      lead.status.toUpperCase().includes('APPROVED') || lead.status.toUpperCase().includes('COMPLETED')
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                        : lead.status.toUpperCase() === 'LOST'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200/80'
                        : lead.status.toUpperCase() === 'NEW' || lead.status.toUpperCase().includes('NEGOTIATION')
                        ? 'bg-amber-50 text-amber-700 border border-amber-200/80'
                        : 'bg-blue-50 text-blue-700 border border-blue-200/80'
                    }`}
                  >
                    {lead.status}
                  </span>
                </div>

                {/* Key Details Grid */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-5 pt-2 border-b border-slate-100 pb-7">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      PRODUCT INTEREST
                    </span>
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <Tag size={15} className="text-blue-500 shrink-0" />
                      <span>{lead.productInterested}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      EXPECTED VALUE
                    </span>
                    <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                      <IndianRupee size={15} className="text-emerald-600 shrink-0" />
                      <span>{lead.expectedValue.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      ASSIGNED EXECUTIVE
                    </span>
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <User size={15} className="text-slate-400 shrink-0" />
                      <span>{lead.assignedExecutive}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      ASSIGNED BY / CREATED BY
                    </span>
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <UserCheck size={15} className="text-blue-500 shrink-0" />
                      <span>{lead.createdBy || 'System Admin'}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      PRIORITY RATING
                    </span>
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        lead.priority === 'High' || lead.priority === 'Urgent'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : lead.priority === 'Medium'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}
                    >
                      {lead.priority}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      PHONE NUMBER
                    </span>
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <Phone size={15} className="text-slate-400 shrink-0" />
                      <span>{lead.phone || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      EMAIL ADDRESS
                    </span>
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 truncate">
                      <Mail size={15} className="text-slate-400 shrink-0" />
                      <span className="truncate">{lead.email || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="col-span-2 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      SITE ADDRESS
                    </span>
                    <div className="flex items-start gap-2 text-sm font-medium text-slate-700">
                      <MapPin size={16} className="text-slate-400 shrink-0 mt-0.5" />
                      <span>{lead.address || 'No location address listed.'}</span>
                    </div>
                  </div>
                </div>

                {/* Quick Actions & User Context Bar */}
                <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                    <User size={14} className="text-blue-600" />
                    <span>Logged in as: <strong className="text-slate-900">{user?.fullName || 'User'}</strong> ({user?.role || 'USER'})</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateQuotation}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                  >
                    <FileText size={14} />
                    <span>Create Quotation</span>
                  </button>
                </div>

                {/* Add Custom Note / Activity Section */}
                <form onSubmit={handleAddNote} className="space-y-2 pt-2 border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquare size={14} className="text-blue-600" />
                    <span>Post Activity Note / Update</span>
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      placeholder="e.g. Spoke to purchasing team, awaiting budget approval..."
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                    />
                    <button
                      type="submit"
                      disabled={!newNoteText.trim()}
                      className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Send size={13} />
                      <span>Post</span>
                    </button>
                  </div>
                </form>

                {/* Activity Logs Timeline */}
                <div className="space-y-4 pt-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    LEAD ACTIVITY LOGS
                  </span>
                  <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {lead.activityLogs && lead.activityLogs.length > 0 ? (
                      lead.activityLogs.map((log) => (
                        <div key={log.id} className="relative group">
                          <div className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-blue-600 border-2 border-white ring-4 ring-blue-100" />
                          <div className="space-y-0.5">
                            <h4 className="text-sm font-bold text-slate-900 leading-snug">
                              {log.title}
                            </h4>
                            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                              <Clock size={13} />
                              <span>
                                {log.date} &bull; {log.type}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 italic">No activity logged yet.</p>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* EDIT / ADD MODE FORM */}
            {(mode === 'edit' || mode === 'add') && (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                    {mode === 'add' ? 'Add New Lead to Pipeline' : `Edit Lead details (${lead?.id})`}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Fill out the client contact details, equipment requirements, and lead assignment status.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2 space-y-1.5 p-3.5 bg-blue-50/60 border border-blue-100 rounded-xl">
                    <label className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Building2 size={14} className="text-blue-600" />
                        Select Existing Customer (Optional)
                      </span>
                      <span className="text-[10px] text-blue-600 font-normal">Select to auto-fill details</span>
                    </label>
                    <select
                      className="w-full px-3.5 py-2 bg-white border border-blue-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                      value={selectedCustomerId}
                      onChange={(e) => {
                        const custId = e.target.value;
                        setSelectedCustomerId(custId);
                        if (custId) {
                          const foundCust = customersList.find((c) => c.id === custId);
                          if (foundCust) {
                            setFormData((prev) => ({
                              ...prev,
                              customerName: foundCust.name,
                              companyName: foundCust.companyName || foundCust.name,
                              email: foundCust.email || prev.email || '',
                              phone: foundCust.phone || prev.phone || '',
                              address: foundCust.address || prev.address || '',
                              linkedClientId: foundCust.id,
                            }));
                          }
                        }
                      }}
                    >
                      <option value="">-- Create New Customer / Custom Details --</option>
                      {customersList.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.companyName ? `${c.name} (${c.companyName})` : c.name} {c.email ? `- ${c.email}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      CUSTOMER NAME *
                    </label>
                    <input
                      type="text"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="e.g. Divya Dutta"
                      value={formData.customerName || ''}
                      onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      COMPANY NAME *
                    </label>
                    <input
                      type="text"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="e.g. CG Power"
                      value={formData.companyName || ''}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      PHONE NUMBER
                    </label>
                    <input
                      type="text"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="+91 98230 00000"
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      EMAIL ADDRESS
                    </label>
                    <input
                      type="email"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="client@company.com"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      SITE/DELIVERY ADDRESS
                    </label>
                    <input
                      type="text"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Enter industrial plant address"
                      value={formData.address || ''}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      PRODUCT INTERESTED
                    </label>
                    <select
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer"
                      value={formData.productInterested || ''}
                      onChange={(e) => setFormData({ ...formData, productInterested: e.target.value })}
                    >
                      <option value="Magnetic Oil Level Gauge (MOG)">Magnetic Oil Level Gauge (MOG)</option>
                      <option value="Winding Temperature Indicator (WTI)">Winding Temperature Indicator (WTI)</option>
                      <option value="100 KVA Power Transformer">100 KVA Power Transformer</option>
                      <option value="Industrial Switchgear Panel">Industrial Switchgear Panel</option>
                      <option value="Vacuum Circuit Breaker (VCB)">Vacuum Circuit Breaker (VCB)</option>
                      <option value="Oil Temperature Indicator (OTI)">Oil Temperature Indicator (OTI)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      EXPECTED DEAL VALUE (INR)
                    </label>
                    <input
                      type="number"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="9000"
                      value={formData.expectedValue || 0}
                      onChange={(e) => setFormData({ ...formData, expectedValue: Number(e.target.value) })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      ASSIGN EXECUTIVE
                    </label>
                    {user?.role === 'ADMIN' || user?.role === 'MANAGER' ? (
                      <select
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer"
                        value={formData.assignedExecutive || ''}
                        onChange={(e) => {
                          const selectedName = e.target.value;
                          const emp = employees.find((empItem) => empItem.fullName === selectedName);
                          setFormData({
                            ...formData,
                            assignedExecutive: selectedName,
                            assignedEmployeeId: emp ? emp.id : formData.assignedEmployeeId,
                          });
                        }}
                      >
                        {employees.length > 0 ? (
                          employees.map((emp) => (
                            <option key={emp.id} value={emp.fullName}>
                              {emp.fullName} ({emp.role})
                            </option>
                          ))
                        ) : (
                          <>
                            <option value={user?.fullName || 'Nilesh Mehta'}>{user?.fullName || 'Nilesh Mehta'}</option>
                            <option value="Amit Patel">Amit Patel</option>
                            <option value="Rahul Shah (Admin)">Rahul Shah (Admin)</option>
                          </>
                        )}
                      </select>
                    ) : (
                      <input
                        type="text"
                        disabled
                        className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-semibold text-slate-500 cursor-not-allowed"
                        value={user?.fullName || formData.assignedExecutive || 'Assigned to You'}
                      />
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      PRIORITY RATING
                    </label>
                    <select
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer"
                      value={formData.priority || 'Medium'}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value as LeadPriority })}
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      LEAD SOURCE
                    </label>
                    <select
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer"
                      value={formData.source || 'Web'}
                      onChange={(e) => setFormData({ ...formData, source: e.target.value as LeadSource })}
                    >
                      <option value="Web">Web</option>
                      <option value="Referral">Referral</option>
                      <option value="Field Call">Field Call</option>
                      <option value="Exhibition">Exhibition</option>
                      <option value="Direct">Direct</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      WORKFLOW STATUS
                    </label>
                    <select
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer"
                      value={formData.status || 'New'}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as LeadStatus })}
                    >
                      <option value="New">New</option>
                      <option value="Contacted">Contacted</option>
                      <option value="Meeting Scheduled">Meeting Scheduled</option>
                      <option value="Proposal Sent">Proposal Sent</option>
                      <option value="Negotiation">Negotiation</option>
                      <option value="Approved">Approved</option>
                      <option value="Installation">Installation</option>
                      <option value="AMC Support">AMC Support</option>
                      <option value="Completed">Completed</option>
                      <option value="Lost">Lost</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold rounded-xl text-sm shadow-md hover:shadow-lg transition-all cursor-pointer"
                  >
                    Save Lead Record
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
