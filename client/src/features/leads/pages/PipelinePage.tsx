import React, { useState, useEffect, useRef, useMemo } from 'react';
import { RotateCw, Building2, GripVertical, UserCheck } from 'lucide-react';
import { SearchInput } from '../../../components/ui/SearchInput';
import { leadsApi } from '../api/leadsApi';
import { Lead, LeadStatus } from '../types/lead';
import { LeadDrawer } from '../components/LeadDrawer';
import { useAuthStore } from '../../../stores/authStore';
import { employeeService } from '../../admin/services/employeeService';
import { Employee } from '../../admin/types/employee.types';
import { Button } from '../../../components/ui/Button';

import { toast } from '../../../utils/toast';

interface PipelineColumn {
  stageId: string;
  stageTitle: string;
  targetStatus: LeadStatus;
  statusKeys: string[];
  dealCount: number;
  totalValueFormatted: string;
  deals: Lead[];
}

const DEFAULT_STAGES: Array<{
  id: string;
  title: string;
  targetStatus: LeadStatus;
  statusKeys: string[];
  isManual?: boolean;
}> = [
  { id: 'NEW LEADS', title: 'NEW LEADS', targetStatus: 'New', statusKeys: ['NEW', 'NEW LEADS', 'NEW_LEAD', 'NEW_LEADS'], isManual: true },
  { id: 'CONTACTED', title: 'CONTACTED', targetStatus: 'Contacted', statusKeys: ['CONTACTED'], isManual: true },
  { id: 'MEETING SCHEDULED', title: 'MEETING SCHEDULED', targetStatus: 'Meeting Scheduled', statusKeys: ['MEETING SCHEDULED', 'MEETING_SCHEDULED'] },
  { id: 'QUOTATION SENT', title: 'QUOTATION SENT', targetStatus: 'Quotation Sent', statusKeys: ['QUOTATION SENT', 'QUOTATION_SENT', 'PROPOSAL SENT', 'PROPOSAL_SENT'] },
  { id: 'NEGOTIATION', title: 'NEGOTIATION', targetStatus: 'Negotiation', statusKeys: ['NEGOTIATION'], isManual: true },
  { id: 'ORDER CONFIRMED', title: 'ORDER CONFIRMED', targetStatus: 'Order Confirmed', statusKeys: ['ORDER CONFIRMED', 'ORDER_CONFIRMED', 'APPROVED/PO', 'APPROVED'] },
  { id: 'READY FOR DISPATCH', title: 'READY FOR DISPATCH', targetStatus: 'Ready for Dispatch', statusKeys: ['READY FOR DISPATCH', 'READY_FOR_DISPATCH'] },
  { id: 'DISPATCHED', title: 'DISPATCHED', targetStatus: 'Dispatched', statusKeys: ['DISPATCHED'] },
  { id: 'INSTALLATION', title: 'INSTALLATION', targetStatus: 'Installation', statusKeys: ['INSTALLATION'] },
  { id: 'COMPLETED', title: 'COMPLETED', targetStatus: 'Completed', statusKeys: ['COMPLETED', 'WON'] },
];

export const PipelinePage: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  const isManager = user?.role === 'MANAGER';
  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const [columns, setColumns] = useState<PipelineColumn[]>([]);
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const res = await employeeService.getEmployees();
        const empList = Array.isArray(res) ? res : (res as any)?.data || [];
        if (Array.isArray(empList) && empList.length > 0) {
          setEmployees(empList);
        }
      } catch (err) {
        console.warn('Failed to load employees in PipelinePage:', err);
      }
    };
    if (isAdminOrManager) {
      loadEmployees();
    }
  }, [isAdminOrManager]);

  // Kanban Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [viewScope, setViewScope] = useState<'ALL' | 'MY'>('ALL');

  // Drag and Drop State
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null);
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);
  const isDraggingRef = useRef(false);

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'view' | 'edit'>('view');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const filteredAllLeads = useMemo(() => {
    return allLeads.filter((l) => {
      const matchesSearch =
        !searchQuery ||
        l.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.productInterested.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesAssignee =
        selectedAssignee === 'ALL' || l.assignedExecutive === selectedAssignee;
      const matchesPriority =
        selectedPriority === 'ALL' || (l.priority || '').toUpperCase() === selectedPriority.toUpperCase();
      const matchesScope =
        isAdmin ||
        viewScope === 'ALL' ||
        (user?.fullName && (l.assignedExecutive || '').toLowerCase().includes(user.fullName.toLowerCase()));

      return matchesSearch && matchesAssignee && matchesPriority && matchesScope;
    });
  }, [allLeads, searchQuery, selectedAssignee, selectedPriority, viewScope, user, isAdmin]);

  const buildPipelineColumns = (leadsList: Lead[]): PipelineColumn[] => {
    return DEFAULT_STAGES.map((stage) => {
      const stageDeals = leadsList.filter((l) =>
        stage.statusKeys.includes((l.status || '').toUpperCase())
      );

      const totalVal = stageDeals.reduce((sum, d) => sum + (d.expectedValue || 0), 0);
      const valLakhs = (totalVal / 100000).toFixed(1);

      return {
        stageId: stage.id,
        stageTitle: stage.title,
        targetStatus: stage.targetStatus,
        statusKeys: stage.statusKeys,
        dealCount: stageDeals.length,
        totalValueFormatted: `₹${valLakhs}L`,
        deals: stageDeals,
      };
    });
  };



  const loadPipeline = async () => {
    setIsLoading(true);
    try {
      const fetched = await leadsApi.getLeads();
      if (Array.isArray(fetched)) {
        setAllLeads(fetched);
      }
    } catch (err) {
      console.warn('Failed to load pipeline deals:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPipeline();
  }, []);

  useEffect(() => {
    setColumns(buildPipelineColumns(filteredAllLeads));
  }, [filteredAllLeads]);

  // --- Drag and Drop Handlers ---
  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    e.dataTransfer.setData('text/plain', dealId);
    e.dataTransfer.effectAllowed = 'move';

    const cardEl = e.currentTarget as HTMLElement;

    if (cardEl && e.dataTransfer.setDragImage) {
      const clone = cardEl.cloneNode(true) as HTMLElement;
      clone.id = 'drag-ghost-preview-clone';
      clone.style.position = 'absolute';
      clone.style.top = '-9999px';
      clone.style.left = '-9999px';
      clone.style.width = `${cardEl.offsetWidth}px`;
      clone.style.opacity = '1';
      clone.style.zIndex = '999999';
      clone.style.backgroundColor = '#ffffff';
      clone.style.border = '2px solid #60a5fa';
      clone.style.borderRadius = '1rem';
      clone.style.boxShadow = '0 20px 25px -5px rgba(59, 130, 246, 0.25), 0 10px 10px -5px rgba(0, 0, 0, 0.1)';
      clone.style.pointerEvents = 'none';

      document.body.appendChild(clone);
      e.dataTransfer.setDragImage(clone, 40, 25);

      setTimeout(() => {
        if (document.body.contains(clone)) {
          document.body.removeChild(clone);
        }
      }, 0);
    }

    isDraggingRef.current = true;
    setTimeout(() => {
      setDraggedDealId(dealId);
    }, 10);
  };

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverStageId !== stageId) {
      setDragOverStageId(stageId);
    }
  };

  const handleDragLeave = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    if (dragOverStageId === stageId && !e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverStageId(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedDealId(null);
    setDragOverStageId(null);
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 100);
  };

  const handleDrop = async (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    setDragOverStageId(null);
    const dealId = draggedDealId || e.dataTransfer.getData('text/plain');
    setDraggedDealId(null);
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 100);

    if (!dealId) return;

    const targetStage = DEFAULT_STAGES.find((s) => s.id === targetStageId);
    if (!targetStage) return;

    const targetStatus = targetStage.targetStatus;
    const existingLead = allLeads.find((l) => l.id === dealId);

    // If status is unchanged, skip update
    if (existingLead && targetStage.statusKeys.includes((existingLead.status || '').toUpperCase())) {
      return;
    }

    // Check if dragging into a system-driven stage is attempted
    if (!targetStage.isManual) {
      toast.warning(
        'System-Driven Stage',
        `"${targetStage.title}" is automatically updated when the business action occurs (Follow-up meeting, Quotation email send, Sales order, Dispatch stock-out, or FSR completion).`
      );
      return;
    }

    // 1. Instant Optimistic State Update with Activity Stamping
    const authorName = user?.fullName || 'Authenticated User';
    const newLogItem = {
      id: `act-${Date.now()}`,
      title: `Stage moved to ${targetStatus} by ${authorName}`,
      date: new Date().toISOString().split('T')[0],
      type: 'System',
    };

    const previousLeads = [...allLeads];
    const updatedLeads = allLeads.map((l) =>
      l.id === dealId
        ? { ...l, status: targetStatus, activityLogs: [newLogItem, ...(l.activityLogs || [])] }
        : l
    );
    setAllLeads(updatedLeads);

    // 2. Persist status update to backend database
    try {
      await leadsApi.updateLead(dealId, { status: targetStatus });
    } catch (err: any) {
      console.warn('Backend persistence failed for lead:', dealId, err);
      toast.error('Cannot change stage', err?.message || 'Failed to update deal stage');
      setAllLeads(previousLeads);
    }
  };

  const handleCardClick = (lead: Lead) => {
    if (isDraggingRef.current) return;
    setSelectedLead(lead);
    setDrawerMode('view');
    setIsDrawerOpen(true);
  };

  const handleSaveLead = (updated: Lead) => {
    const updatedList = allLeads.map((l) => (l.id === updated.id ? updated : l));
    setAllLeads(updatedList);
    setColumns(buildPipelineColumns(updatedList));
    setIsDrawerOpen(false);
  };

  const getPriorityBadgeStyle = (priority: string) => {
    switch ((priority || '').toUpperCase()) {
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
    <div className="space-y-5 max-w-full mx-auto pb-10 select-none">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-5 rounded-xl border border-border shadow-xs">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium tracking-wider text-slate-400 uppercase">
              KANBAN WORKFLOW
            </span>
            {user && (
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/80">
                User: {user.fullName} ({user.role})
              </span>
            )}
          </div>
          <h1 className="text-[22px] font-semibold text-slate-900 tracking-tight leading-tight">
            Deals Pipeline
          </h1>
          <p className="text-[13px] text-slate-500 leading-relaxed mt-0.5">
            Visualize deal velocity and manage stage-by-stage sales progression
          </p>
        </div>

        <Button
          variant="outline"
          size="md"
          onClick={loadPipeline}
          disabled={isLoading}
        >
          <RotateCw size={14} className={isLoading ? 'animate-spin mr-1.5' : 'mr-1.5'} />
          <span>Reload Board</span>
        </Button>
      </div>

      {/* Kanban Filter & View Bar */}
      <div className="bg-card p-3.5 rounded-xl border border-border shadow-xs flex flex-wrap items-center gap-2.5">
        {/* Scope View Toggle ("All Deals" vs "My Deals") */}
        {isAdmin ? (
          <div className="flex items-center px-3 py-1.5 bg-slate-100 text-slate-800 border border-slate-200/80 rounded-lg text-xs font-semibold shrink-0">
            <Building2 size={13} className="mr-1.5 text-slate-500" />
            <span>All Deals</span>
          </div>
        ) : isManager ? (
          <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-border shrink-0">
            <button
              type="button"
              onClick={() => setViewScope('ALL')}
              className={`h-8 px-3 rounded-md text-xs font-medium transition-all cursor-pointer ${viewScope === 'ALL'
                ? 'bg-white text-slate-900 shadow-xs border border-border/60'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              All Deals
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
              <span>My Deals</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200/80 rounded-lg text-xs font-medium shrink-0">
            <UserCheck size={13} className="mr-1.5" />
            <span>My Deals</span>
          </div>
        )}

        {/* Search Field */}
        <SearchInput
          placeholder="Search deals, company, product..."
          value={searchQuery}
          onChange={setSearchQuery}
          wrapperClassName="flex-1 min-w-50"
        />

        {/* Assignee Filter (Admin/Manager only) */}
        {isAdminOrManager && (
          <select
            className="h-9 px-2.5 bg-white border border-border rounded-lg text-[13px] font-medium text-slate-700 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 cursor-pointer max-w-48 truncate"
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

        {/* Priority Filter */}
        <select
          className="h-9 px-2.5 bg-white border border-border rounded-lg text-[13px] font-medium text-slate-700 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 cursor-pointer"
          value={selectedPriority}
          onChange={(e) => setSelectedPriority(e.target.value)}
        >
          <option value="ALL">All Priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </select>
      </div>

      {/* Horizontal Scrollable Kanban Columns Container */}
      <div className="flex gap-5 overflow-x-auto pb-6 custom-scrollbar no-scrollbar items-start">
        {columns.map((col) => {
          const isTargetColumn = dragOverStageId === col.stageId;

          return (
            <div
              key={col.stageId}
              onDragOver={(e) => handleDragOver(e, col.stageId)}
              onDragLeave={(e) => handleDragLeave(e, col.stageId)}
              onDrop={(e) => handleDrop(e, col.stageId)}
              className={`w-80 shrink-0 rounded-3xl p-4 flex flex-col gap-4 max-h-[calc(100vh-220px)] overflow-y-auto custom-scrollbar no-scrollbar transition-all duration-200 ${isTargetColumn
                ? 'bg-blue-50/80 border-2 border-blue-400/90 ring-4 ring-blue-500/10 shadow-md scale-[1.01]'
                : 'bg-slate-100/70 border border-slate-200/70'
                }`}
            >
              {/* Column Header */}
              <div className="flex flex-col gap-1 pb-1 border-b border-slate-200/60">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    {col.stageTitle}
                  </h3>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full border shadow-2xs transition-colors ${isTargetColumn
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 border-slate-200'
                      }`}
                  >
                    {col.dealCount}
                  </span>
                </div>
                <div className="text-[11px] font-semibold text-slate-400">
                  <span>{col.totalValueFormatted}</span>
                  <span className="mx-1">&bull;</span>
                  <span>{col.dealCount} deals</span>
                </div>
              </div>

              {/* Deals List Cards */}
              <div className="flex flex-col gap-3.5 min-h-25">
                {col.deals.length > 0 ? (
                  col.deals.map((deal) => {
                    const isBeingDragged = draggedDealId === deal.id;

                    return (
                      <div
                        key={deal.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, deal.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => handleCardClick(deal)}
                        className={`bg-white p-4 rounded-2xl border shadow-2xs transition-all flex flex-col gap-3 group ${isBeingDragged
                          ? 'opacity-40 border-2 border-dashed border-blue-400/80 bg-blue-50/40 shadow-none scale-[0.99]'
                          : 'border-slate-200/90 hover:shadow-md hover:border-blue-400/60 cursor-grab active:cursor-grabbing hover:-translate-y-0.5'
                          }`}
                      >
                        {/* Top Row: Priority & Date */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <GripVertical size={13} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${getPriorityBadgeStyle(
                                deal.priority
                              )}`}
                            >
                              {deal.priority}
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-slate-400">
                            {deal.activityLogs?.[0]?.date || '2026-08-18'}
                          </span>
                        </div>

                        {/* Middle Row: Name & Company */}
                        <div className="flex flex-col gap-0.5">
                          <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {deal.customerName}
                          </h4>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                            <Building2 size={13} className="text-slate-400" />
                            <span>{deal.companyName}</span>
                          </div>
                        </div>

                        {/* Bottom Row: Product & Value */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                          <span className="text-slate-500 truncate max-w-42.5 font-medium">
                            {deal.productInterested}
                          </span>
                          <span className="font-bold text-slate-900 shrink-0">
                            ₹{(deal.expectedValue || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  /* Empty Column Drop Target */
                  <div
                    className={`h-28 border-2 border-dashed rounded-2xl flex items-center justify-center text-xs font-semibold transition-all ${isTargetColumn
                      ? 'border-blue-400 bg-blue-100/40 text-blue-600 scale-[1.01]'
                      : 'border-slate-200 text-slate-400 bg-white/40'
                      }`}
                  >
                    <span>Drop deals here</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Slide-Over Right Drawer for View/Edit */}
      <LeadDrawer
        isOpen={isDrawerOpen}
        mode={drawerMode}
        lead={selectedLead}
        onClose={() => setIsDrawerOpen(false)}
        onSave={handleSaveLead}
        onSwitchToEdit={() => setDrawerMode('edit')}
      />
    </div>
  );
};

