import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { amcContractApi, AmcContract, AmcServiceRequest, AmcServiceVisit } from '../api/amcContractApi';
import { calculatePreventiveVisits } from '../../../utils/amcCalculations';
import { navigate, useCurrentPath } from '../../../app/router/navigation';
import { useAuthStore } from '../../../stores/authStore';
import { AmcServiceReportModal } from '../components/AmcServiceReportModal';
import { FsrReportModal } from '../../field-service/components/FsrReportModal';
import { toast } from '../../../utils/toast';
import { FollowUpEntitySection } from '../../follow-ups/components/FollowUpEntitySection';
import { UpdateAmcPaymentModal } from '../components/UpdateAmcPaymentModal';
import { ActivateAmcContractModal } from '../components/ActivateAmcContractModal';
import {
  checkAmcActivationEligibility,
  AMC_ACTIVATION_QUERY_KEYS,
} from '../utils/amc-activation-eligibility.util';
import { taskService } from '../../tasks/services/taskService';
import { Employee } from '../../admin/types/employee.types';
import {
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  ArrowLeft,
  Wrench,
  Zap,
  PhoneCall,
  AlertOctagon,
  Plus,
  ClipboardList,
  FileSpreadsheet,
  X,
  Play,
  FileText,
  RotateCcw,
  Link,
  Ban,
  FileEdit,
  ShoppingCart,
  ShieldAlert,
  ShieldCheck,
  Check,
  DollarSign,
  ChevronDown,
  UserX,
  Search,
} from 'lucide-react';

export const AmcContractDetailPage: React.FC = () => {
  const { user } = useAuthStore();
  const isManagerOrAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const designationLower = (user?.designation || '').toLowerCase();
  const isServiceOffice =
    ((user?.role === 'USER' || (user as any)?.role === 'SERVICE') &&
      designationLower.includes('service')) ||
    (user?.workType === 'OFFICE' && designationLower.includes('service'));
  const isAccountantOffice =
    user?.role === 'USER' && designationLower.includes('accountant');
  // Payment recording/updating is restricted to Admin, Manager, or Accountant Office only (NOT Service Office)
  const canUpdatePayment = (isManagerOrAdmin || isAccountantOffice) && !isServiceOffice;
  const canManageContract = isManagerOrAdmin || isServiceOffice;
  // Office roles (Admin, Manager, Service Office, or any Office user) do not start field visits directly
  const isOfficeRole =
    user?.role === 'ADMIN' ||
    user?.role === 'MANAGER' ||
    user?.workType === 'OFFICE' ||
    !user?.workType ||
    (user?.designation || '').toLowerCase().includes('service');
  const canStartVisit = !isOfficeRole && user?.workType === 'FIELD';
  const currentPath = useCurrentPath();
  // Extract contract ID from route e.g. /amc-contracts/:id
  const contractId = currentPath.split('/')[2];

  const [contract, setContract] = useState<AmcContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const isActivatingRef = useRef(false);
  const queryClient = useQueryClient();
  const [isActivateModalOpen, setIsActivateModalOpen] = useState(false);

  // Evaluate activation eligibility based on business rules & API response fields
  const activationEligibility = useMemo(() => {
    return checkAmcActivationEligibility(contract);
  }, [contract]);

  // Edit Contract Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editEndUser, setEditEndUser] = useState('');
  const [editBranch, setEditBranch] = useState('');
  const [editZone, setEditZone] = useState('');
  const [editFrequency, setEditFrequency] = useState('');
  const [editScheduledVisits, setEditScheduledVisits] = useState('');
  const [editBreakdownType, setEditBreakdownType] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editSpecialClauses, setEditSpecialClauses] = useState('');
  const [editPaymentTerms, setEditPaymentTerms] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const calculatedEditVisits = useMemo(() => {
    return calculatePreventiveVisits(editStartDate, editEndDate, editFrequency);
  }, [editStartDate, editEndDate, editFrequency]);

  const handleOpenEditModal = () => {
    if (!contract) return;
    setEditEndUser(contract.endUser || '');
    setEditBranch(contract.branch || '');
    setEditZone(contract.zone || '');
    setEditFrequency(contract.serviceFrequency || 'Quarterly');
    setEditScheduledVisits(String(contract.scheduledVisits || 4));
    setEditBreakdownType(contract.breakdownVisitType || 'UNLIMITED');
    setEditStartDate(contract.contractStartDate ? contract.contractStartDate.slice(0, 10) : '');
    setEditEndDate(contract.contractEndDate ? contract.contractEndDate.slice(0, 10) : '');
    setEditSpecialClauses(contract.specialClauses || '');
    setEditPaymentTerms(contract.amcPaymentTerms || '');
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract) return;
    try {
      setEditLoading(true);
      await amcContractApi.updateContract(contract.id, {
        endUser: editEndUser.trim() || undefined,
        branch: editBranch.trim() || undefined,
        zone: editZone.trim() || undefined,
        serviceFrequency: editFrequency,
        scheduledVisits: calculatedEditVisits || Number(editScheduledVisits) || 4,
        breakdownVisitType: editBreakdownType,
        contractStartDate: editStartDate ? new Date(editStartDate).toISOString() : undefined,
        contractEndDate: editEndDate ? new Date(editEndDate).toISOString() : undefined,
        specialClauses: editSpecialClauses.trim() || undefined,
        amcPaymentTerms: editPaymentTerms.trim() || undefined,
      });
      setIsEditModalOpen(false);
      toast.success('Contract details updated successfully');
      await fetchContractDetail();
    } catch (err: any) {
      toast.error('Failed to update contract details', err?.message);
    } finally {
      setEditLoading(false);
    }
  };

  // Service Report Modal
  const [activeReportVisitId, setActiveReportVisitId] = useState<string | null>(null);
  const [activeFsrId, setActiveFsrId] = useState<string | null>(null);

  // Breakdown Request Modal
  const [isBreakdownModalOpen, setIsBreakdownModalOpen] = useState(false);
  const [equipmentId, setEquipmentId] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [priority, setPriority] = useState('HIGH');
  const [escalationLevel, setEscalationLevel] = useState('LEVEL_1');
  const [requestedAt, setRequestedAt] = useState('');

  // Escalation Action Modal
  const [isEscalateModalOpen, setIsEscalateModalOpen] = useState(false);
  const [selectedEscalateReq, setSelectedEscalateReq] = useState<AmcServiceRequest | null>(null);
  const [targetEscalationLevel, setTargetEscalationLevel] = useState('LEVEL_2');
  const [escalationNotes, setEscalationNotes] = useState('');

  // Breakdown Request Detail Modal
  const [selectedBreakdownReqDetail, setSelectedBreakdownReqDetail] = useState<AmcServiceRequest | null>(null);

  // Termination Modal
  const [isTerminateModalOpen, setIsTerminateModalOpen] = useState(false);
  const [terminationReason, setTerminationReason] = useState('');
  const [terminationNoticeDate, setTerminationNoticeDate] = useState('');
  const [terminationDate, setTerminationDate] = useState('');

  // Renewal Modal
  const [isRenewalModalOpen, setIsRenewalModalOpen] = useState(false);
  const [renewalStartDate, setRenewalStartDate] = useState('');
  const [renewalEndDate, setRenewalEndDate] = useState('');
  const [renewalAmcPlan, setRenewalAmcPlan] = useState('');
  const [renewalFrequency, setRenewalFrequency] = useState('');
  const [renewalScheduledVisits, setRenewalScheduledVisits] = useState('');
  const [renewalBreakdownType, setRenewalBreakdownType] = useState('');
  const [renewalTotalAmount, setRenewalTotalAmount] = useState('');
  const [renewalLoading, setRenewalLoading] = useState(false);

  const calculatedRenewalVisits = useMemo(() => {
    return calculatePreventiveVisits(renewalStartDate, renewalEndDate, renewalFrequency);
  }, [renewalStartDate, renewalEndDate, renewalFrequency]);

  // Renewal history chain
  const [renewalChain, setRenewalChain] = useState<{ ancestors: AmcContract[]; successors: AmcContract[] } | null>(null);
  const [isUpdatePaymentModalOpen, setIsUpdatePaymentModalOpen] = useState(false);

  // Coverage Decision Modal State
  const [selectedReqForCoverage, setSelectedReqForCoverage] = useState<AmcServiceRequest | null>(null);
  const [coverageType, setCoverageType] = useState<'AMC_COVERED' | 'CHARGEABLE'>('AMC_COVERED');
  const [coverageNotes, setCoverageNotes] = useState('');
  const [coverageSubmitting, setCoverageSubmitting] = useState(false);

  // Repair Task Dispatch Modal State
  const [selectedReqForRepairTask, setSelectedReqForRepairTask] = useState<AmcServiceRequest | null>(null);
  const [repairAssignedToId, setRepairAssignedToId] = useState('');
  const [repairScheduledDate, setRepairScheduledDate] = useState('');
  const [repairScheduledStartTime, setRepairScheduledStartTime] = useState('09:00');
  const [repairScheduledEndTime, setRepairScheduledEndTime] = useState('11:00');
  const [repairPriority, setRepairPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('HIGH');
  const [repairNotes, setRepairNotes] = useState('');
  const [repairTaskSubmitting, setRepairTaskSubmitting] = useState(false);
  const [fieldEmployees, setFieldEmployees] = useState<Employee[]>([]);

  const [isAssigneeDropdownOpen, setIsAssigneeDropdownOpen] = useState(false);
  const [assigneeSearchQuery, setAssigneeSearchQuery] = useState('');
  const assigneeDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedReqForRepairTask) {
      setIsAssigneeDropdownOpen(false);
      setAssigneeSearchQuery('');
      taskService.getFieldEmployees().then((res) => {
        if (res.data) setFieldEmployees(res.data);
      }).catch((err) => console.error('Failed to load field employees', err));
    }
  }, [selectedReqForRepairTask]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        assigneeDropdownRef.current &&
        !assigneeDropdownRef.current.contains(event.target as Node)
      ) {
        setIsAssigneeDropdownOpen(false);
      }
    };
    if (isAssigneeDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAssigneeDropdownOpen]);

  const filteredFieldEmployees = useMemo(() => {
    if (!assigneeSearchQuery.trim()) return fieldEmployees;
    const q = assigneeSearchQuery.toLowerCase();
    return fieldEmployees.filter(
      (emp) =>
        emp.fullName.toLowerCase().includes(q) ||
        (emp.designation || '').toLowerCase().includes(q) ||
        (emp.email || '').toLowerCase().includes(q)
    );
  }, [fieldEmployees, assigneeSearchQuery]);

  const selectedEngineer = useMemo(() => {
    return fieldEmployees.find((emp) => emp.id === repairAssignedToId);
  }, [fieldEmployees, repairAssignedToId]);

  const handleCoverageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReqForCoverage || !contract) return;
    try {
      setCoverageSubmitting(true);
      await amcContractApi.setCoverageDecision(contract.id, selectedReqForCoverage.id, {
        coverageType,
        coverageNotes: coverageNotes.trim() || undefined,
      });
      toast.success('Coverage Decision Recorded', `Request marked as ${coverageType === 'AMC_COVERED' ? 'AMC Covered' : 'Chargeable'}.`);
      setSelectedReqForCoverage(null);
      setCoverageNotes('');
      await fetchContractDetail();
    } catch (err: any) {
      toast.error('Failed to set coverage decision', err?.message);
    } finally {
      setCoverageSubmitting(false);
    }
  };

  const handleRepairTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReqForRepairTask || !contract) return;
    try {
      setRepairTaskSubmitting(true);
      await amcContractApi.createRepairTask(contract.id, selectedReqForRepairTask.id, {
        assignedToId: repairAssignedToId || undefined,
        scheduledDate: repairScheduledDate || undefined,
        scheduledStartTime: repairScheduledStartTime || undefined,
        scheduledEndTime: repairScheduledEndTime || undefined,
        priority: repairPriority,
        notes: repairNotes.trim() || undefined,
      });
      toast.success('Repair Task Dispatched', 'Field task created and assigned to engineer.');
      setSelectedReqForRepairTask(null);
      setRepairNotes('');
      setRepairAssignedToId('');
      await fetchContractDetail();
    } catch (err: any) {
      toast.error('Failed to dispatch repair task', err?.message);
    } finally {
      setRepairTaskSubmitting(false);
    }
  };

  const handleCreateRepairQuotation = (reqItem: AmcServiceRequest) => {
    if (!contract) return;
    try {
      sessionStorage.setItem(
        'pending_repair_link',
        JSON.stringify({
          contractId: contract.id,
          requestId: reqItem.id,
          customerId: contract.customerId,
          equipmentId: reqItem.equipmentId,
          defectNotes: reqItem.issueDescription,
          amcContractNumber: contract.contractNumber,
        })
      );
    } catch (err) {
      console.error('Failed to save repair link in session storage', err);
    }
    navigate(`/quotations/new?type=SERVICE&customerId=${contract.customerId}&sourceRequestId=${reqItem.id}`);
  };

  const handleStartVisit = async (visitId: string) => {
    try {
      setActionLoading(true);
      await amcContractApi.startVisit(visitId);
      toast.success('Service visit started');
      await fetchContractDetail();
    } catch (err: any) {
      toast.error('Failed to start visit', err?.message);
    } finally {
      setActionLoading(false);
    }
  };

  const fetchContractDetail = useCallback(async () => {
    if (!contractId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await amcContractApi.getContractById(contractId);
      if (res.data) {
        setContract(res.data);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load contract details.');
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  const fetchRenewalChain = useCallback(async () => {
    if (!contractId) return;
    try {
      const res = await amcContractApi.getContractHistory(contractId);
      if (res.data) {
        setRenewalChain({ ancestors: res.data.ancestors, successors: res.data.successors });
      }
    } catch {
      // non-critical, ignore
    }
  }, [contractId]);

  useEffect(() => {
    fetchContractDetail();
    fetchRenewalChain();
  }, [fetchContractDetail, fetchRenewalChain]);

  const handleActivate = async () => {
    if (!contract) return;
    if (isActivatingRef.current) return;

    // Validate eligibility on client before sending request
    const eligibility = checkAmcActivationEligibility(contract);
    if (!eligibility.isEligible) {
      toast.warning('Activation Ineligible', eligibility.blockingReason);
      return;
    }

    isActivatingRef.current = true;
    try {
      setActionLoading(true);
      await amcContractApi.activateContract(contract.id);
      setIsActivateModalOpen(false);
      toast.success(
        'AMC Contract Activated',
        'Contract is now ACTIVE. Preventive service schedule generated, equipment updated to AMC_COVERED, and follow-up completed.'
      );

      // Invalidate relevant TanStack Query keys to update lists, equipment, follow-ups & dashboards
      AMC_ACTIVATION_QUERY_KEYS.forEach((queryKey) => {
        queryClient.invalidateQueries({ queryKey });
      });

      // Refetch current contract details and renewal chain
      await fetchContractDetail();
      await fetchRenewalChain();
    } catch (err: any) {
      toast.error('Failed to activate contract', err?.message || 'Server error occurred during activation.');
    } finally {
      isActivatingRef.current = false;
      setActionLoading(false);
    }
  };

  const handleTerminate = async () => {
    if (!contract || !terminationReason.trim()) return;
    try {
      setActionLoading(true);
      await amcContractApi.terminateContract(contract.id, {
        reason: terminationReason,
        terminationNoticeDate: terminationNoticeDate || undefined,
        terminationDate: terminationDate || undefined,
      });
      setIsTerminateModalOpen(false);
      setTerminationReason('');
      setTerminationNoticeDate('');
      setTerminationDate('');
      toast.warning('Contract Terminated', 'AMC Contract has been terminated.');
      await fetchContractDetail();
    } catch (err: any) {
      toast.error('Failed to terminate contract', err?.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleInitiateRenewal = () => {
    if (!contract) return;
    // Pre-fill renewal form with source contract data
    const srcEnd = new Date(contract.contractEndDate);
    const newStart = new Date(srcEnd);
    newStart.setDate(newStart.getDate() + 1);
    const newEnd = new Date(newStart);
    newEnd.setFullYear(newEnd.getFullYear() + 1);

    setRenewalStartDate(newStart.toISOString().split('T')[0]);
    setRenewalEndDate(newEnd.toISOString().split('T')[0]);
    setRenewalAmcPlan(contract.amcPlan || '');
    setRenewalFrequency(contract.serviceFrequency || '');
    setRenewalScheduledVisits(String(contract.scheduledVisits || 4));
    setRenewalBreakdownType(contract.breakdownVisitType || 'UNLIMITED');
    setRenewalTotalAmount(contract.totalAmount || '');
    setIsRenewalModalOpen(true);
  };

  const handleConfirmRenewal = async () => {
    if (!contract || !renewalStartDate || !renewalEndDate) return;
    try {
      setRenewalLoading(true);
      const res = await amcContractApi.renewContract(contract.id, {
        contractStartDate: renewalStartDate,
        contractEndDate: renewalEndDate,
        amcPlan: renewalAmcPlan || undefined,
        serviceFrequency: renewalFrequency || undefined,
        scheduledVisits: calculatedRenewalVisits || (renewalScheduledVisits ? Number(renewalScheduledVisits) : undefined),
        breakdownVisitType: renewalBreakdownType || undefined,
        totalAmount: renewalTotalAmount || undefined,
      });
      setIsRenewalModalOpen(false);
      toast.success('Renewal Contract Created', 'Navigate to the new contract to activate it.');
      // Navigate to the new renewal contract
      if (res.data?.id) {
        navigate(`/amc-contracts/${res.data.id}`);
      } else {
        await fetchContractDetail();
      }
    } catch (err: any) {
      toast.error('Failed to create renewal contract', err?.message);
    } finally {
      setRenewalLoading(false);
    }
  };

  const handleReportBreakdown = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract || !issueDescription.trim()) return;
    try {
      setActionLoading(true);
      await amcContractApi.createBreakdownRequest(contract.id, {
        equipmentId: equipmentId || undefined,
        issueDescription: issueDescription.trim(),
        priority,
        escalationLevel,
        requestedAt: requestedAt ? new Date(requestedAt).toISOString() : undefined,
      });
      setIsBreakdownModalOpen(false);
      setIssueDescription('');
      setEquipmentId('');
      toast.success('Breakdown Request Logged', 'Emergency breakdown request logged successfully.');
      await fetchContractDetail();
    } catch (err: any) {
      toast.error('Failed to log breakdown request', err?.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEscalateSubmit = async () => {
    if (!contract || !selectedEscalateReq) return;
    try {
      setActionLoading(true);
      await amcContractApi.escalateBreakdownRequest(contract.id, selectedEscalateReq.id, {
        newLevel: targetEscalationLevel,
        notes: escalationNotes || undefined,
      });
      setIsEscalateModalOpen(false);
      setSelectedEscalateReq(null);
      setEscalationNotes('');
      toast.warning('Breakdown Request Escalated', `Request escalated to ${targetEscalationLevel}`);
      await fetchContractDetail();
    } catch (err: any) {
      toast.error('Failed to escalate breakdown request', err?.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateTaskForVisit = (visit: AmcServiceVisit) => {
    if (!contract) return;

    const scheduledDateStr = visit.scheduledDate
      ? new Date(visit.scheduledDate).toISOString().slice(0, 16)
      : '';

    const taskTitle = `[AMC Visit #${visit.visitNumber}] ${contract.contractNumber} - ${contract.customerName}`;
    const taskDescription = [
      `Preventive Maintenance Service Visit #${visit.visitNumber}`,
      `Contract: ${contract.contractNumber}`,
      `Customer: ${contract.customerName}`,
      `Plan: ${contract.amcPlan}`,
      `Frequency: ${contract.serviceFrequency}`,
      contract.customerCode ? `Customer Code: ${contract.customerCode}` : null,
      contract.branch ? `Branch: ${contract.branch}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    const statePayload = {
      autoCreateTask: true,
      amcVisitId: visit.id,
      amcContractId: contract.id,
      title: taskTitle,
      description: taskDescription,
      customerId: contract.customerId,
      destinationId: contract.destinationId || '',
      scheduledAt: scheduledDateStr,
      dueAt: scheduledDateStr,
      priority: 'MEDIUM',
    };

    try {
      sessionStorage.setItem('pending_amc_task', JSON.stringify(statePayload));
    } catch {
      // ignore
    }

    navigate('/tasks', statePayload);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const formatDuration = (startStr?: string | null, endStr?: string | null) => {
    if (!startStr) return null;
    const start = new Date(startStr).getTime();
    const end = endStr ? new Date(endStr).getTime() : Date.now();
    if (isNaN(start) || isNaN(end) || end < start) return null;
    const diffMins = Math.floor((end - start) / (1000 * 60));
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 gap-3 text-slate-500 max-w-7xl mx-auto">
        <RefreshCw size={28} className="animate-spin text-blue-600" />
        <span className="text-xs font-semibold">Loading AMC Contract details...</span>
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="flex flex-col items-center justify-center p-16 gap-3 text-rose-600 max-w-7xl mx-auto bg-white rounded-2xl border border-slate-200">
        <AlertTriangle size={32} />
        <span className="text-sm font-bold">{error || 'AMC Contract not found.'}</span>
        <button
          onClick={() => navigate('/amc-contracts')}
          className="mt-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer"
        >
          Return to Contracts List
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-16">
      {/* Top Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate('/amc-contracts')}
          className="inline-flex items-center self-start gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs transition-all cursor-pointer whitespace-nowrap"
        >
          <ArrowLeft size={14} /> Back to AMC Contracts
        </button>

        <div className="flex items-center flex-wrap gap-2">
          {contract.status !== 'TERMINATED' && contract.status !== 'CANCELLED' && (
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleOpenEditModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
            >
              <FileEdit size={14} />
              Edit Contract
            </button>
          )}

          {canManageContract && contract.status === 'PENDING_ACTIVATION' && (
            <button
              type="button"
              disabled={!activationEligibility.isEligible || actionLoading}
              title={!activationEligibility.isEligible ? activationEligibility.blockingReason : 'Activate AMC Contract & Generate Preventive Service Schedule'}
              onClick={() => setIsActivateModalOpen(true)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activationEligibility.isEligible
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm cursor-pointer'
                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-80'
              }`}
            >
              <CheckCircle2 size={14} />
              {activationEligibility.isEligible ? 'Activate Contract & Generate Schedule' : `Activation Ineligible (${activationEligibility.blockingCode})`}
            </button>
          )}

          {canManageContract && (contract.status === 'EXPIRING_SOON' || contract.status === 'EXPIRED') && (
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleInitiateRenewal}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer whitespace-nowrap"
            >
              <RotateCcw size={14} />
              Renew Contract
            </button>
          )}

          {(contract.status === 'ACTIVE' || contract.status === 'EXPIRING_SOON') && (
            <>
              <button
                type="button"
                onClick={() => setIsBreakdownModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer whitespace-nowrap"
              >
                <AlertOctagon size={14} />
                Report Breakdown Request
              </button>

              {isManagerOrAdmin && (
                <button
                  type="button"
                  onClick={() => setIsTerminateModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
                >
                  <Ban size={14} />
                  Terminate
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Ineligible Activation Notice Banner */}
      {canManageContract && contract.status === 'PENDING_ACTIVATION' && !activationEligibility.isEligible && (
        <div className="p-4 bg-amber-50/90 border border-amber-200/90 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl shrink-0">
              <AlertTriangle size={18} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-amber-900">Activation Action Ineligible</span>
              <span className="text-xs text-amber-800 mt-0.5">{activationEligibility.blockingReason}</span>
            </div>
          </div>
          {(activationEligibility.blockingCode === 'PAYMENT_PENDING' || activationEligibility.blockingCode === 'PAYMENT_OVERDUE' || activationEligibility.blockingCode === 'INVALID_PAYMENT') && canUpdatePayment && (
            <button
              type="button"
              onClick={() => setIsUpdatePaymentModalOpen(true)}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-2xs cursor-pointer shrink-0 transition-colors whitespace-nowrap"
            >
              Update Payment Status
            </button>
          )}
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200/70 rounded-full text-xs font-black tracking-tight whitespace-nowrap">
              {contract.contractNumber}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border whitespace-nowrap ${
              contract.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
              contract.status === 'EXPIRING_SOON' ? 'bg-amber-50 text-amber-700 border-amber-200' :
              contract.status === 'PENDING_ACTIVATION' ? 'bg-blue-50 text-blue-700 border-blue-200' :
              contract.status === 'EXPIRED' ? 'bg-slate-100 text-slate-600 border-slate-300' :
              (contract.status === 'TERMINATED' || contract.status === 'CANCELLED') ? 'bg-rose-50 text-rose-700 border-rose-200' :
              'bg-slate-100 text-slate-700 border-slate-300'
            }`}>
              {contract.status}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 whitespace-nowrap">
              {contract.amcPlan}
            </span>
            {contract.renewedFromContractId && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200 inline-flex items-center gap-1 whitespace-nowrap">
                <Link size={11} /> Renewal Contract
              </span>
            )}
          </div>

          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {contract.customerCompanyName || contract.customerName}
          </h1>

          <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
            <span className="flex items-center gap-1 font-medium">
              <Building2 size={13} className="text-slate-400" /> End User: {contract.endUser || '—'}
            </span>
            {contract.branch && (
              <span className="flex items-center gap-1">
                Branch: <strong>{contract.branch}</strong> ({contract.zone || 'Zone'})
              </span>
            )}
            {contract.sourceQuotationNumber && (
              <button
                type="button"
                onClick={() => navigate(`/quotations/${contract.quotationId}`)}
                className="flex items-center gap-1 text-blue-600 hover:underline font-bold cursor-pointer"
              >
                <FileSpreadsheet size={12} /> Source Quotation: {contract.sourceQuotationNumber}
              </button>
            )}
            {contract.salesOrderNumber && (
              <button
                type="button"
                onClick={() => navigate(`/sales-orders?search=${encodeURIComponent(contract.salesOrderNumber!)}`)}
                className="flex items-center gap-1 text-indigo-600 hover:underline font-bold cursor-pointer"
              >
                <ShoppingCart size={12} /> Sales Order: {contract.salesOrderNumber} ({contract.salesOrderStatus || 'CONFIRMED'})
              </button>
            )}
          </div>
        </div>

        {/* Financial Badge */}
        <div className="bg-slate-900 text-white p-4 rounded-xl flex flex-col justify-between shrink-0 min-w-[210px] shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Contract Value</span>
          <span className="text-2xl font-black text-emerald-400 mt-1">
            ₹{Number(contract.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-800">
            <span className="text-[10px] text-slate-400">
              Payment: <strong className={`${
                contract.paymentStatus === 'PAID' ? 'text-emerald-400 font-bold' :
                contract.paymentStatus === 'PARTIALLY_PAID' ? 'text-blue-400 font-bold' :
                contract.paymentStatus === 'OVERDUE' ? 'text-rose-400 font-bold' :
                'text-amber-400 font-bold'
              }`}>{contract.paymentStatus}</strong>
            </span>
            {canUpdatePayment && (
              <button
                type="button"
                onClick={() => setIsUpdatePaymentModalOpen(true)}
                className="text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-2 py-0.5 rounded cursor-pointer border border-slate-700 transition-colors shadow-2xs"
              >
                Update Payment
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid: Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col gap-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Calendar size={12} /> Contract Period
          </span>
          <span className="text-sm font-extrabold text-slate-900">
            {formatDate(contract.contractStartDate)} — {formatDate(contract.contractEndDate)}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col gap-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Clock size={12} /> Service Frequency
          </span>
          <span className="text-sm font-extrabold text-slate-900">{contract.serviceFrequency}</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col gap-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 size={12} /> Preventive Visits
          </span>
          <span className="text-sm font-extrabold text-slate-900">
            {contract.completedVisits} Completed / {contract.scheduledVisits} Total
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col gap-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Wrench size={12} /> Breakdown Entitlement
          </span>
          <span className="text-sm font-extrabold text-blue-700">{contract.breakdownVisitType}</span>
        </div>
      </div>

      {/* Covered Equipment */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col gap-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
          <Zap size={16} className="text-blue-600" /> Covered Equipment & Units
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[680px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase whitespace-nowrap">
                <th className="px-4 py-2.5">Equipment Name / Description</th>
                <th className="px-4 py-2.5">Type</th>
                <th className="px-4 py-2.5">Condition</th>
                <th className="px-4 py-2.5">Configuration</th>
                <th className="px-4 py-2.5">Rating</th>
                <th className="px-4 py-2.5">Qty</th>
                <th className="px-4 py-2.5">AMC Unit Rate (₹)</th>
                <th className="px-4 py-2.5 text-right">Total (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(contract.equipment || []).map((eqItem) => (
                <tr key={eqItem.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-bold text-slate-900">
                    <div className="flex flex-col gap-0.5">
                      {eqItem.customerEquipmentId ? (
                        <button
                          type="button"
                          onClick={() => navigate(`/customer-equipment/${eqItem.customerEquipmentId}`)}
                          className="hover:underline text-blue-600 font-bold text-left cursor-pointer flex items-center gap-1"
                          title="View Customer Equipment Details"
                        >
                          {eqItem.equipmentName}
                        </button>
                      ) : (
                        <span>{eqItem.equipmentName}</span>
                      )}
                      {contract.status === 'ACTIVE' && (
                        <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                          <ShieldCheck size={11} className="text-emerald-600" /> AMC Covered
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold">
                      {eqItem.equipmentType || 'STABILIZER'}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      eqItem.conditionStatus === 'NEEDS_REPAIR' || eqItem.conditionStatus === 'FAULTY'
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : eqItem.conditionStatus === 'REPAIRED'
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}>
                      {eqItem.conditionStatus || 'OPERATIONAL'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-700">{eqItem.configuration || '—'}</td>
                  <td className="px-4 py-3 font-medium text-slate-700">{eqItem.rating || '—'}</td>
                  <td className="px-4 py-3 font-bold text-slate-900">{eqItem.quantity}</td>
                  <td className="px-4 py-3">₹{Number(eqItem.unitPrice || 0).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 font-bold text-slate-900 text-right">
                    ₹{Number(eqItem.lineTotal || 0).toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preventive Service Schedule */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Calendar size={16} className="text-emerald-600" /> Preventive Maintenance Service Schedule
          </h3>
          <span className="text-xs text-slate-500">
            {contract.serviceVisits?.length || 0} Scheduled Preventive Visits
          </span>
        </div>

        {(!contract.serviceVisits || contract.serviceVisits.length === 0) ? (
          <div className="p-8 text-center text-slate-400 text-xs font-semibold bg-slate-50 rounded-xl border border-dashed border-slate-200">
            No service schedule generated yet. Click <strong>Activate Contract</strong> above to generate preventive maintenance visits.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[720px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase whitespace-nowrap">
                  <th className="px-4 py-2.5">Visit #</th>
                  <th className="px-4 py-2.5">Scheduled Date</th>
                  <th className="px-4 py-2.5">Service Type</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Execution & Duration</th>
                  <th className="px-4 py-2.5">Field Task</th>
                  <th className="px-4 py-2.5">Service Report</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contract.serviceVisits.map((visit) => (
                  <tr key={visit.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">Visit #{visit.visitNumber}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">{formatDate(visit.scheduledDate)}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold whitespace-nowrap">
                        {visit.serviceType}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold">
                      <span className={`px-2 py-0.5 rounded text-[10px] whitespace-nowrap ${
                        visit.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        visit.status === 'IN_PROGRESS' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        visit.status === 'ASSIGNED' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        'bg-slate-50 text-slate-700 border border-slate-200'
                      }`}>
                        {visit.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {visit.actualStartAt ? (
                        <div className="flex flex-col text-[11px]">
                          <span className="text-slate-600">
                            <strong className="text-slate-900">Start:</strong> {formatDateTime(visit.actualStartAt)}
                          </span>
                          {visit.completedAt && (
                            <span className="text-slate-500">
                              <strong className="text-slate-700">End:</strong> {formatDateTime(visit.completedAt)}
                            </span>
                          )}
                          <span className="text-emerald-700 font-bold mt-0.5">
                            Duration: {formatDuration(visit.actualStartAt, visit.completedAt) || 'In Progress'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {visit.taskId ? (
                        <button
                          type="button"
                          onClick={() => navigate('/tasks')}
                          className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-bold text-[11px] cursor-pointer"
                          title="View in Tasks module"
                        >
                          <ClipboardList size={12} /> Task Linked
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[11px]">No task created</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {visit.report ? (
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            visit.report.status === 'COMPLETED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {visit.report.status}
                          </span>
                          {visit.report.reportNumber && (
                            <span className="text-[11px] font-mono text-slate-700 font-medium">{visit.report.reportNumber}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Not Generated</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {canStartVisit && (visit.status === 'SCHEDULED' || visit.status === 'ASSIGNED') && (
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => handleStartVisit(visit.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold cursor-pointer transition-colors whitespace-nowrap"
                          >
                            <Play size={11} /> Start Visit
                          </button>
                        )}

                        {(visit.status === 'IN_PROGRESS' || visit.status === 'COMPLETED' || visit.report) && (() => {
                          // For BREAKDOWN visits: find the linked service request and open FSR if available
                          if (visit.serviceType === 'BREAKDOWN') {
                            const linkedReq = (contract.serviceRequests || []).find(
                              (r) => r.amcServiceVisitId === visit.id
                            );
                            if (linkedReq?.fsrId) {
                              return (
                                <button
                                  type="button"
                                  onClick={() => setActiveFsrId(linkedReq.fsrId!)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer transition-colors whitespace-nowrap"
                                >
                                  <FileText size={11} /> FSR Report
                                </button>
                              );
                            }
                            // No FSR linked — no report button for breakdown visits
                            return null;
                          }
                          // Standard PM visit: open AMC service report
                          return (
                            <button
                              type="button"
                              onClick={() => setActiveReportVisitId(visit.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer transition-colors whitespace-nowrap"
                            >
                              <FileText size={11} /> Service Report
                            </button>
                          );
                        })()}

                        {!visit.taskId && visit.status !== 'COMPLETED' && (
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => handleCreateTaskForVisit(visit)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[11px] font-bold cursor-pointer transition-colors whitespace-nowrap"
                          >
                            <Plus size={11} /> Add Task
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Breakdown Service Requests */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertOctagon size={16} className="text-amber-600" /> Breakdown Service Requests
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Malfunction reports &amp; operational escalation workflow
            </p>
          </div>

          {(contract.status === 'ACTIVE' || contract.status === 'EXPIRING_SOON') && (
            <button
              type="button"
              onClick={() => {
                setEquipmentId('');
                setIssueDescription('');
                setPriority('HIGH');
                setEscalationLevel('LEVEL_1');
                setRequestedAt(new Date().toISOString().slice(0, 16));
                setIsBreakdownModalOpen(true);
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs whitespace-nowrap"
            >
              <Plus size={13} /> Report Breakdown
            </button>
          )}
        </div>

        {(!contract.serviceRequests || contract.serviceRequests.length === 0) ? (
          <div className="p-8 text-center text-slate-400 text-xs font-semibold bg-slate-50 rounded-xl border border-dashed border-slate-200">
            No breakdown or defect follow-up requests logged for this contract.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[880px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase whitespace-nowrap">
                  <th className="px-4 py-2.5">SR Number / Origin</th>
                  <th className="px-4 py-2.5">Reported At</th>
                  <th className="px-4 py-2.5">Equipment &amp; Condition</th>
                  <th className="px-4 py-2.5">Defect / Malfunction</th>
                  <th className="px-4 py-2.5">Commercial Coverage</th>
                  <th className="px-4 py-2.5">Workflow Progress</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contract.serviceRequests.map((reqItem) => {
                  const isAmcCovered = reqItem.coverageType === 'AMC_COVERED';
                  const isChargeable = reqItem.coverageType === 'CHARGEABLE';
                  const isPendingReview = !reqItem.coverageType || reqItem.coverageType === 'PENDING_REVIEW';
                  const hasTask = !!reqItem.taskId;
                  const hasQuote = !!reqItem.quotationId;
                  const hasSo = !!reqItem.salesOrderId;

                  return (
                    <tr key={reqItem.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-amber-700">{reqItem.requestNumber}</span>
                          {(reqItem.originServiceVisitId || (reqItem.notes && reqItem.notes.includes('PM Visit'))) ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold w-fit">
                              <AlertTriangle size={10} /> PM Visit Defect
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-medium w-fit">
                              Direct Breakdown
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700 whitespace-nowrap">
                        {formatDate(reqItem.requestedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-slate-900">
                            {reqItem.equipmentName || 'Whole System / General'}
                          </span>
                          {reqItem.equipmentConditionStatus && (
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold w-fit ${
                              reqItem.equipmentConditionStatus === 'NEEDS_REPAIR' || reqItem.equipmentConditionStatus === 'FAULTY'
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : reqItem.equipmentConditionStatus === 'REPAIRED'
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}>
                              {reqItem.equipmentConditionStatus}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900 max-w-xs truncate" title={reqItem.issueDescription}>
                        <div className="flex flex-col gap-0.5">
                          <span className="truncate">{reqItem.issueDescription}</span>
                          {reqItem.priority && (
                            <span className={`text-[10px] font-bold w-fit ${
                              reqItem.priority === 'URGENT' ? 'text-rose-600' :
                              reqItem.priority === 'HIGH' ? 'text-amber-600' : 'text-slate-500'
                            }`}>
                              Priority: {reqItem.priority}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isPendingReview && (
                          <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-300 text-[10px] font-bold inline-flex items-center gap-1">
                            <Clock size={10} /> Pending Office Review
                          </span>
                        )}
                        {isAmcCovered && (
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px] font-bold inline-flex items-center gap-1">
                            <ShieldCheck size={10} /> AMC Covered
                          </span>
                        )}
                        {isChargeable && (
                          <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-300 text-[10px] font-bold inline-flex items-center gap-1">
                            <DollarSign size={10} /> Chargeable
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col gap-1 text-[11px]">
                          {isPendingReview && (
                            <span className="text-slate-400 italic">Awaiting commercial decision</span>
                          )}

                          {isAmcCovered && (
                            hasTask ? (
                              <button
                                type="button"
                                onClick={() => navigate('/tasks')}
                                className="inline-flex items-center gap-1 text-emerald-700 hover:underline font-bold cursor-pointer"
                              >
                                <ClipboardList size={12} /> Repair Task Active
                              </button>
                            ) : (
                              <span className="text-emerald-700 font-semibold">Authorized — Ready to Dispatch</span>
                            )
                          )}

                          {isChargeable && (
                            <>
                              {!hasQuote && (
                                <span className="text-purple-700 font-semibold">Quotation Needed</span>
                              )}
                              {hasQuote && (
                                <button
                                  type="button"
                                  onClick={() => navigate(`/quotations/${reqItem.quotationId}`)}
                                  className="inline-flex items-center gap-1 text-blue-600 hover:underline font-bold cursor-pointer"
                                >
                                  <FileSpreadsheet size={11} /> Quote: {reqItem.quotationNumber || 'View Quote'}
                                </button>
                              )}
                              {hasSo && (
                                <button
                                  type="button"
                                  onClick={() => navigate(`/sales-orders?search=${encodeURIComponent(reqItem.salesOrderNumber || '')}`)}
                                  className="inline-flex items-center gap-1 text-indigo-600 hover:underline font-bold cursor-pointer"
                                >
                                  <ShoppingCart size={11} /> SO: {reqItem.salesOrderNumber || 'Confirmed SO'}
                                </button>
                              )}
                              {hasTask && (
                                <button
                                  type="button"
                                  onClick={() => navigate('/tasks')}
                                  className="inline-flex items-center gap-1 text-emerald-700 hover:underline font-bold cursor-pointer"
                                >
                                  <ClipboardList size={11} /> Repair Task Active
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-bold whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] whitespace-nowrap ${
                          reqItem.status === 'RESOLVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          reqItem.status === 'ASSIGNED' || reqItem.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          reqItem.status === 'CANCELLED' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                          'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {reqItem.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* Office Coverage Decision Trigger */}
                          {isPendingReview && reqItem.status !== 'RESOLVED' && reqItem.status !== 'CANCELLED' && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedReqForCoverage(reqItem);
                                setCoverageType('AMC_COVERED');
                                setCoverageNotes('');
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold cursor-pointer transition-colors shadow-2xs whitespace-nowrap"
                            >
                              <ShieldAlert size={11} /> Review Coverage
                            </button>
                          )}

                          {/* Track A: AMC Covered -> Dispatch Repair Task */}
                          {isAmcCovered && !hasTask && reqItem.status !== 'RESOLVED' && reqItem.status !== 'CANCELLED' && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedReqForRepairTask(reqItem);
                                setRepairScheduledDate(new Date().toISOString().slice(0, 10));
                                setRepairPriority((reqItem.priority as any) || 'HIGH');
                                setRepairNotes(`Repair defect: ${reqItem.issueDescription}`);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer transition-colors shadow-2xs whitespace-nowrap"
                            >
                              <Wrench size={11} /> Dispatch Repair
                            </button>
                          )}

                          {/* Track B: Chargeable -> Create Repair Quotation */}
                          {isChargeable && !hasQuote && reqItem.status !== 'RESOLVED' && reqItem.status !== 'CANCELLED' && (
                            <button
                              type="button"
                              onClick={() => handleCreateRepairQuotation(reqItem)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold cursor-pointer transition-colors shadow-2xs whitespace-nowrap"
                            >
                              <FileSpreadsheet size={11} /> Create Repair Quote
                            </button>
                          )}

                          {/* Track B: Chargeable -> SO Confirmed -> Dispatch Repair Task */}
                          {isChargeable && hasSo && !hasTask && reqItem.status !== 'RESOLVED' && reqItem.status !== 'CANCELLED' && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedReqForRepairTask(reqItem);
                                setRepairScheduledDate(new Date().toISOString().slice(0, 10));
                                setRepairPriority((reqItem.priority as any) || 'HIGH');
                                setRepairNotes(`Chargeable Repair (SO Confirmed): ${reqItem.issueDescription}`);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer transition-colors shadow-2xs whitespace-nowrap"
                            >
                              <Wrench size={11} /> Dispatch Repair
                            </button>
                          )}

                          {/* FSR button: only shown when field engineer explicitly linked a job card */}
                          {reqItem.fsrId && (
                            <button
                              type="button"
                              onClick={() => setActiveFsrId(reqItem.fsrId!)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-bold cursor-pointer transition-colors whitespace-nowrap shadow-2xs"
                              title={`View Field Service Report (${reqItem.fsrNumber || 'FSR'}) submitted by Field Engineer`}
                            >
                              <Wrench size={11} /> FSR Report
                            </button>
                          )}

                          {/* PM Defect Report: original PM visit that surfaced this breakdown */}
                          {reqItem.originServiceVisitId && (
                            <button
                              type="button"
                              onClick={() => setActiveReportVisitId(reqItem.originServiceVisitId!)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-medium cursor-pointer transition-colors whitespace-nowrap"
                              title="View Original PM Defect Report"
                            >
                              <AlertTriangle size={11} className="text-amber-600" /> PM Defect Report
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setSelectedBreakdownReqDetail(reqItem)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold cursor-pointer transition-colors whitespace-nowrap"
                          >
                            Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Scope & Exclusions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col gap-3">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
            <CheckCircle2 size={15} className="text-emerald-600" /> Included Scope of Work
          </h3>
          <ul className="flex flex-col gap-2">
            {(contract.scopeItems || []).map((item, idx) => (
              <li key={item.id || idx} className="text-xs text-slate-700 flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                  {idx + 1}
                </span>
                <span>{item.description}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col gap-3">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
            <XCircle size={15} className="text-rose-600" /> Explicit Contract Exclusions
          </h3>
          <ul className="flex flex-col gap-2">
            {(contract.exclusions || []).map((item, idx) => (
              <li key={item.id || idx} className="text-xs text-slate-700 flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-rose-50 text-rose-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                  ✕
                </span>
                <span>{item.description}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Escalation Contact Matrix */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <PhoneCall size={16} className="text-blue-600" /> Malfunction Escalation Contact Matrix
          </h3>
          <span className="text-[11px] text-slate-500 font-medium">Frozen Contract Snapshot</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {['LEVEL_1', 'LEVEL_2', 'LEVEL_3'].map((levelKey) => {
            const esc = (contract.escalations || []).find((e) => e.level === levelKey);
            const hasContact = esc && (esc.contactName || esc.phone || esc.email);

            return (
              <div
                key={levelKey}
                className={`p-4 rounded-xl border flex flex-col gap-1 transition-all ${
                  hasContact ? 'bg-slate-50 border-slate-200' : 'bg-slate-50/50 border-dashed border-slate-200 opacity-75'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded uppercase tracking-wide">
                    {levelKey.replace('_', ' ')}
                  </span>
                  {!hasContact && (
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                      Not configured
                    </span>
                  )}
                </div>

                {hasContact ? (
                  <>
                    <span className="text-sm font-extrabold text-slate-900 mt-1">{esc.contactName || 'Service Desk'}</span>
                    <span className="text-xs text-slate-600 font-medium">Phone: {esc.phone || '—'}</span>
                    <span className="text-xs text-slate-600 font-medium">Email: {esc.email || '—'}</span>
                  </>
                ) : (
                  <div className="mt-2 py-2 text-center text-xs text-slate-400 italic">
                    Not configured
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Termination Info Card (for TERMINATED contracts) */}
      {contract.status === 'TERMINATED' && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 flex flex-col gap-2">
          <h3 className="text-sm font-bold text-rose-800 flex items-center gap-2">
            <Ban size={16} /> Contract Termination Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="font-bold text-rose-700 block">Termination Date</span>
              <span className="text-rose-900">{formatDate(contract.terminatedAt)}</span>
            </div>
            {contract.terminationNoticeDate && (
              <div>
                <span className="font-bold text-rose-700 block">Notice Date</span>
                <span className="text-rose-900">{formatDate(contract.terminationNoticeDate)}</span>
              </div>
            )}
            <div className="md:col-span-2">
              <span className="font-bold text-rose-700 block">Reason for Termination</span>
              <span className="text-rose-900">{contract.terminationReason || '—'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Renewal Chain Info */}
      {renewalChain && (renewalChain.ancestors.length > 0 || renewalChain.successors.length > 0) && (
        <div className="bg-teal-50 border border-teal-200 rounded-2xl p-5 flex flex-col gap-3">
          <h3 className="text-sm font-bold text-teal-800 flex items-center gap-2">
            <RotateCcw size={16} /> Renewal Chain
          </h3>
          <div className="flex flex-wrap gap-2 text-xs">
            {renewalChain.ancestors.map((a) => (
              <button
                key={a.id}
                onClick={() => navigate(`/amc-contracts/${a.id}`)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-teal-200 text-teal-700 rounded-xl font-bold hover:bg-teal-100 transition-colors cursor-pointer"
              >
                <Link size={11} /> Previous: {a.contractNumber}
              </button>
            ))}
            <span className="px-3 py-1.5 bg-teal-700 text-white rounded-xl font-bold text-[11px]">
              Current: {contract.contractNumber}
            </span>
            {renewalChain.successors.map((s) => (
              <button
                key={s.id}
                onClick={() => navigate(`/amc-contracts/${s.id}`)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-teal-200 text-teal-700 rounded-xl font-bold hover:bg-teal-100 transition-colors cursor-pointer"
              >
                <RotateCcw size={11} /> Renewed As: {s.contractNumber}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* AMC Follow-ups & Reminders Section */}
      <FollowUpEntitySection
        amcContractId={contract.id}
        amcContractNumber={contract.contractNumber}
        customerId={contract.customerId}
        customerName={contract.customerCompanyName || contract.customerName}
        defaultTitle={`AMC Follow-up: ${contract.contractNumber}`}
        defaultType="AMC_RENEWAL"
      />

      {/* Log Breakdown Drawer */}
      {isBreakdownModalOpen && contract && createPortal(
        <div className="fixed inset-0 z-[100] overflow-hidden select-none">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300 animate-fade-in"
            onClick={() => setIsBreakdownModalOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 z-[100]">
            <div
              className="w-screen max-w-xl bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-slide-in-right overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl border border-amber-200">
                    <AlertOctagon size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Report Breakdown Request</h3>
                    <p className="text-xs text-slate-500">{contract.contractNumber} &bull; {contract.customerName}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsBreakdownModalOpen(false)}
                  className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer border border-slate-200/80"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleReportBreakdown} className="flex-1 overflow-y-auto flex flex-col justify-between">
                <div className="p-6 space-y-5">
                  <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl text-xs text-amber-900 flex flex-col gap-1">
                    <span className="font-bold text-amber-800">Logging Malfunction on AMC Contract</span>
                    <span>Contract Number: <strong>{contract.contractNumber}</strong> &bull; Plan: <strong>{contract.amcPlan}</strong></span>
                  </div>

                  {/* Covered Equipment Selection */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700">Covered Equipment</label>
                    <select
                      value={equipmentId}
                      onChange={(e) => setEquipmentId(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
                    >
                      <option value="">All / General Equipment</option>
                      {(contract.equipment || []).map((eqItem) => (
                        <option key={eqItem.id} value={eqItem.id}>
                          {eqItem.equipmentName} {eqItem.configuration ? `(${eqItem.configuration})` : ''} - Qty: {eqItem.quantity}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Reported Problem */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Reported Problem / Malfunction <span className="text-rose-600">*</span>
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={issueDescription}
                      onChange={(e) => setIssueDescription(e.target.value)}
                      placeholder="Describe the malfunction, voltage fluctuations, abnormal noise, trip indicators, or symptoms reported by site engineer..."
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white leading-relaxed"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Priority */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-700">Priority Level</label>
                      <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
                      >
                        <option value="LOW">LOW</option>
                        <option value="MEDIUM">MEDIUM</option>
                        <option value="HIGH">HIGH</option>
                        <option value="URGENT">URGENT</option>
                      </select>
                    </div>

                    {/* Initial Escalation Level */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-700">Initial Escalation Level</label>
                      <select
                        value={escalationLevel}
                        onChange={(e) => setEscalationLevel(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
                      >
                        <option value="LEVEL_1">LEVEL 1 (Engineer)</option>
                        <option value="LEVEL_2">LEVEL 2 (Manager)</option>
                        <option value="LEVEL_3">LEVEL 3 (Head of Ops)</option>
                      </select>
                    </div>
                  </div>

                  {/* Selected Escalation Contact Preview */}
                  {(() => {
                    const targetEsc = (contract.escalations || []).find((e) => e.level === escalationLevel);
                    const hasTargetContact = targetEsc && (targetEsc.contactName || targetEsc.phone);
                    return (
                      <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700 flex flex-col gap-1 border border-slate-200">
                        <span className="font-bold text-slate-900">Escalation Contact ({escalationLevel.replace('_', ' ')}):</span>
                        {hasTargetContact ? (
                          <span className="text-slate-700 font-medium">
                            {targetEsc.contactName || 'Service Desk'} &bull; Phone: {targetEsc.phone || 'N/A'} {targetEsc.email ? `(${targetEsc.email})` : ''}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Not specifically configured</span>
                        )}
                      </div>
                    );
                  })()}

                  {/* Reported Date / Time */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700">Reported Date &amp; Time</label>
                    <input
                      type="datetime-local"
                      value={requestedAt}
                      onChange={(e) => setRequestedAt(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Sticky Footer */}
                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/90 backdrop-blur-md sticky bottom-0 z-10 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsBreakdownModalOpen(false)}
                    className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading || !issueDescription.trim()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50 transition-all shadow-sm"
                  >
                    {actionLoading && <RefreshCw size={14} className="animate-spin" />}
                    Submit Breakdown Request
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Escalate Breakdown Request Drawer */}
      {isEscalateModalOpen && selectedEscalateReq && contract && createPortal(
        <div className="fixed inset-0 z-[100] overflow-hidden select-none">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300 animate-fade-in"
            onClick={() => setIsEscalateModalOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 z-[100]">
            <div
              className="w-screen max-w-lg bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-slide-in-right overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl border border-purple-200">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Escalate Breakdown Request</h3>
                    <p className="text-xs text-purple-700 font-bold">{selectedEscalateReq.requestNumber}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEscalateModalOpen(false)}
                  className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer border border-slate-200/80"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 flex-1 overflow-y-auto space-y-4">
                <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-2xl text-xs text-purple-900 flex flex-col gap-1.5">
                  <div>Request: <strong>{selectedEscalateReq.requestNumber}</strong></div>
                  <div>Current Escalation: <strong>{selectedEscalateReq.escalationLevel.replace('_', ' ')}</strong></div>
                  <div>Reported Issue: <em>{selectedEscalateReq.issueDescription}</em></div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700">New Escalation Target Level</label>
                  <select
                    value={targetEscalationLevel}
                    onChange={(e) => setTargetEscalationLevel(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-purple-500 focus:bg-white"
                  >
                    <option value="LEVEL_1">LEVEL 1</option>
                    <option value="LEVEL_2">LEVEL 2</option>
                    <option value="LEVEL_3">LEVEL 3</option>
                  </select>
                </div>

                {/* Target Contact Display */}
                {(() => {
                  const esc = (contract.escalations || []).find((e) => e.level === targetEscalationLevel);
                  const hasContact = esc && (esc.contactName || esc.phone);
                  return (
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs flex flex-col gap-1">
                      <span className="font-bold text-slate-700">Target Contact ({targetEscalationLevel.replace('_', ' ')}):</span>
                      {hasContact ? (
                        <div className="text-slate-900 font-bold">
                          {esc.contactName} {esc.phone ? `(M: ${esc.phone})` : ''} {esc.email ? `(${esc.email})` : ''}
                        </div>
                      ) : (
                        <div className="text-slate-400 italic">Not configured</div>
                      )}
                    </div>
                  );
                })()}

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700">Escalation Notes / Rationale (optional)</label>
                  <textarea
                    rows={3}
                    value={escalationNotes}
                    onChange={(e) => setEscalationNotes(e.target.value)}
                    placeholder="Reason for escalation, SLA breach alert, or priority requirement..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-purple-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/90 backdrop-blur-md sticky bottom-0 z-10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEscalateModalOpen(false)}
                  className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleEscalateSubmit}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50 transition-all shadow-sm"
                >
                  {actionLoading && <RefreshCw size={14} className="animate-spin" />}
                  Confirm Escalation
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Breakdown Request Detail Drawer */}
      {selectedBreakdownReqDetail && createPortal(
        <div className="fixed inset-0 z-[100] overflow-hidden select-none">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300 animate-fade-in"
            onClick={() => setSelectedBreakdownReqDetail(null)}
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 z-[100]">
            <div
              className="w-screen max-w-xl bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-slide-in-right overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl border border-amber-200">
                    <AlertOctagon size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Breakdown Request Details</h3>
                    <p className="text-xs text-amber-700 font-bold">{selectedBreakdownReqDetail.requestNumber}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedBreakdownReqDetail(null)}
                  className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer border border-slate-200/80"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 flex-1 overflow-y-auto space-y-4">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Reported At</span>
                    <span className="font-bold text-slate-900">{formatDate(selectedBreakdownReqDetail.requestedAt)}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Priority</span>
                    <span className="font-bold text-rose-700">{selectedBreakdownReqDetail.priority}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Current Escalation</span>
                    <span className="font-bold text-purple-700">{selectedBreakdownReqDetail.escalationLevel.replace('_', ' ')}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Current Status</span>
                    <span className="font-bold text-emerald-700">{selectedBreakdownReqDetail.status}</span>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Covered Equipment</span>
                  <span className="font-bold text-slate-900">{selectedBreakdownReqDetail.equipmentName || 'Whole System / General Equipment'}</span>
                  {selectedBreakdownReqDetail.equipmentConfiguration && (
                    <span className="text-slate-500 font-medium">Config: {selectedBreakdownReqDetail.equipmentConfiguration}</span>
                  )}
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Reported Malfunction / Problem</span>
                  <span className="text-slate-900 font-medium whitespace-pre-wrap">{selectedBreakdownReqDetail.issueDescription}</span>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Escalation Contact Snapshot</span>
                  {selectedBreakdownReqDetail.escalationContactName ? (
                    <span className="font-bold text-slate-900">
                      {selectedBreakdownReqDetail.escalationContactName} — Phone: {selectedBreakdownReqDetail.escalationPhone || '—'}
                    </span>
                  ) : (
                    <span className="text-slate-400 italic">Not configured</span>
                  )}
                </div>

                {/* Linked Service Reports */}
                {(selectedBreakdownReqDetail.fsrId || selectedBreakdownReqDetail.amcServiceVisitId || selectedBreakdownReqDetail.originServiceVisitId) && (
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs flex flex-col gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Linked Service Reports</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* FSR button: only shown when field engineer explicitly linked a job card */}
                      {selectedBreakdownReqDetail.fsrId && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveFsrId(selectedBreakdownReqDetail.fsrId!);
                            setSelectedBreakdownReqDetail(null);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                        >
                          <Wrench size={13} /> View FSR ({selectedBreakdownReqDetail.fsrNumber || 'Field Report'})
                        </button>
                      )}
                      {/* PM Defect Report: original PM visit that surfaced this breakdown */}
                      {selectedBreakdownReqDetail.originServiceVisitId && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveReportVisitId(selectedBreakdownReqDetail.originServiceVisitId!);
                            setSelectedBreakdownReqDetail(null);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold cursor-pointer transition-colors"
                        >
                          <AlertTriangle size={13} className="text-amber-600" /> View PM Defect Report
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {selectedBreakdownReqDetail.notes && (
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Audit / Escalation Notes</span>
                    <span className="text-slate-700 font-medium whitespace-pre-wrap">{selectedBreakdownReqDetail.notes}</span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/90 backdrop-blur-md sticky bottom-0 z-10 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedBreakdownReqDetail(null)}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Terminate Contract Drawer */}
      {isTerminateModalOpen && contract && createPortal(
        <div className="fixed inset-0 z-[100] overflow-hidden select-none">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300 animate-fade-in"
            onClick={() => setIsTerminateModalOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 z-[100]">
            <div
              className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-slide-in-right overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl border border-rose-200">
                    <Ban size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-rose-900">Terminate AMC Contract</h3>
                    <p className="text-xs text-slate-500">{contract.contractNumber} &bull; {contract.customerName}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsTerminateModalOpen(false)}
                  className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer border border-slate-200/80"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 flex-1 overflow-y-auto space-y-4">
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 leading-relaxed">
                  Per AMC contract terms: termination requires a <strong>minimum one-month prior written notice</strong>. The notice date and effective termination date are recorded for audit compliance.
                </div>

                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-900 leading-relaxed">
                  You are about to terminate contract <strong>{contract.contractNumber}</strong>. All remaining scheduled preventive visits will be cancelled.
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700">Notice Received Date</label>
                    <input
                      type="date"
                      value={terminationNoticeDate}
                      onChange={(e) => setTerminationNoticeDate(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-rose-400 focus:bg-white"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700">Effective Termination Date</label>
                    <input
                      type="date"
                      value={terminationDate}
                      onChange={(e) => setTerminationDate(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-rose-400 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700">Termination Reason <span className="text-rose-600">*</span></label>
                  <textarea
                    required
                    rows={4}
                    value={terminationReason}
                    onChange={(e) => setTerminationReason(e.target.value)}
                    placeholder="e.g. Terminated by customer with one-month notice due to site relocation. / Significant breach not remedied within 30 days."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-rose-500 focus:bg-white leading-relaxed"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/90 backdrop-blur-md sticky bottom-0 z-10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsTerminateModalOpen(false)}
                  className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionLoading || !terminationReason.trim()}
                  onClick={handleTerminate}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50 transition-all shadow-sm"
                >
                  {actionLoading && <RefreshCw size={14} className="animate-spin" />}
                  Confirm Termination
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Renewal Drawer */}
      {isRenewalModalOpen && contract && createPortal(
        <div className="fixed inset-0 z-[100] overflow-hidden select-none">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300 animate-fade-in"
            onClick={() => setIsRenewalModalOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 z-[100]">
            <div
              className="w-screen max-w-2xl bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-slide-in-right overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-teal-50 text-teal-600 rounded-xl border border-teal-200">
                    <RotateCcw size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Renew AMC Contract</h3>
                    <p className="text-xs text-slate-500">Review terms &amp; configure renewal period for {contract.contractNumber}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRenewalModalOpen(false)}
                  className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer border border-slate-200/80"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {/* Source Contract Reference */}
                <div className="p-3.5 bg-teal-50/80 border border-teal-200 rounded-2xl text-xs text-teal-900 flex items-center gap-2">
                  <Link size={14} className="text-teal-600" />
                  <span>Creating renewal of: <strong>{contract.contractNumber}</strong> &bull; {contract.customerName}</span>
                </div>

                {/* New Contract Period */}
                <div className="flex flex-col gap-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">New Contract Period <span className="text-rose-600">*</span></h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold text-slate-600">Start Date</label>
                      <input
                        type="date"
                        required
                        value={renewalStartDate}
                        onChange={(e) => setRenewalStartDate(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-teal-500 focus:bg-white"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold text-slate-600">End Date</label>
                      <input
                        type="date"
                        required
                        value={renewalEndDate}
                        onChange={(e) => setRenewalEndDate(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-teal-500 focus:bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* AMC Configuration (editable) */}
                <div className="flex flex-col gap-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">AMC Configuration &amp; Commercials</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold text-slate-600">AMC Plan Tier</label>
                      <input
                        type="text"
                        value={renewalAmcPlan}
                        onChange={(e) => setRenewalAmcPlan(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-teal-500 focus:bg-white"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold text-slate-600">Service Frequency</label>
                      <select
                        value={renewalFrequency}
                        onChange={(e) => setRenewalFrequency(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-teal-500 focus:bg-white font-semibold text-slate-900"
                      >
                        <option value="Monthly">Monthly</option>
                        <option value="Bi-Monthly">Bi-Monthly</option>
                        <option value="Quarterly">Quarterly</option>
                        <option value="Half-Yearly">Half-Yearly</option>
                        <option value="Yearly">Yearly</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-slate-600">Scheduled Visits</label>
                        <span className="text-[9px] font-semibold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded-full border border-teal-200">
                          Calculated
                        </span>
                      </div>
                      <input
                        type="number"
                        min={0}
                        value={calculatedRenewalVisits}
                        readOnly
                        disabled
                        tabIndex={-1}
                        className="w-full p-2.5 bg-slate-100/80 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 cursor-not-allowed select-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold text-slate-600">Breakdown Entitlement</label>
                      <select
                        value={renewalBreakdownType}
                        onChange={(e) => setRenewalBreakdownType(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-teal-500 focus:bg-white font-semibold text-slate-900"
                      >
                        <option value="UNLIMITED">UNLIMITED</option>
                        <option value="LIMITED">LIMITED</option>
                        <option value="NONE">NONE</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5 col-span-2">
                      <label className="text-[11px] font-bold text-slate-600">Total Renewal Contract Amount (₹)</label>
                      <input
                        type="number"
                        value={renewalTotalAmount}
                        onChange={(e) => setRenewalTotalAmount(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-teal-500 focus:bg-white font-bold text-slate-900"
                      />
                    </div>
                  </div>
                </div>

                {/* Snapshot Review */}
                <div className="flex flex-col gap-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Covered Equipment</h4>
                  <div className="bg-slate-50 rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                    {(contract.equipment || []).map((eq, idx) => (
                      <div key={idx} className="flex items-center justify-between px-3.5 py-2.5 text-xs">
                        <span className="font-bold text-slate-900">{eq.equipmentName}</span>
                        <span className="text-slate-500 font-medium">{eq.configuration} &bull; Qty: {eq.quantity}</span>
                      </div>
                    ))}
                    {!contract.equipment?.length && <p className="p-3 text-slate-400 text-xs">No equipment listed.</p>}
                  </div>
                </div>

                <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-2xl text-xs text-blue-800 leading-relaxed">
                  <strong>Note:</strong> All scope items, exclusions, and escalation contacts are cloned from the source contract. The renewal starts in <strong>PENDING_ACTIVATION</strong> state and is activated upon commercial confirmation.
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/90 backdrop-blur-md sticky bottom-0 z-10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsRenewalModalOpen(false)}
                  className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={renewalLoading || !renewalStartDate || !renewalEndDate}
                  onClick={handleConfirmRenewal}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50 transition-all shadow-sm"
                >
                  {renewalLoading ? <RefreshCw size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                  Create Renewal Contract
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Contract Operational Details Drawer */}
      {isEditModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] overflow-hidden select-none">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300 animate-fade-in"
            onClick={() => setIsEditModalOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 z-[100]">
            <div
              className="w-screen max-w-xl bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-slide-in-right overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-200">
                    <FileEdit size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Edit Contract Details</h3>
                    <p className="text-xs text-slate-500">Update operational parameters, clauses, and schedules</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer border border-slate-200/80"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSaveEdit} className="flex-1 overflow-y-auto flex flex-col justify-between">
                <div className="p-6 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-700">End User / Site</label>
                      <input
                        type="text"
                        value={editEndUser}
                        onChange={(e) => setEditEndUser(e.target.value)}
                        placeholder="e.g. Plant 2 / Site In-charge"
                        className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-700">Branch</label>
                      <input
                        type="text"
                        value={editBranch}
                        onChange={(e) => setEditBranch(e.target.value)}
                        placeholder="e.g. NCR / Delhi"
                        className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-700">Zone</label>
                      <input
                        type="text"
                        value={editZone}
                        onChange={(e) => setEditZone(e.target.value)}
                        placeholder="e.g. North Zone"
                        className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-700">Service Frequency</label>
                      <select
                        value={editFrequency}
                        onChange={(e) => setEditFrequency(e.target.value)}
                        className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white font-semibold text-slate-900"
                      >
                        <option value="Monthly">Monthly</option>
                        <option value="Bi-Monthly">Bi-Monthly</option>
                        <option value="Quarterly">Quarterly</option>
                        <option value="Half-Yearly">Half-Yearly</option>
                        <option value="Yearly">Yearly</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700">Scheduled Visits</label>
                        <span className="text-[10px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                          Calculated
                        </span>
                      </div>
                      <input
                        type="number"
                        min={0}
                        value={calculatedEditVisits}
                        readOnly
                        disabled
                        tabIndex={-1}
                        className="w-full px-3 py-2.5 text-xs bg-slate-100/80 border border-slate-200 rounded-xl font-bold text-slate-800 cursor-not-allowed select-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-700">Contract Start Date</label>
                      <input
                        type="date"
                        value={editStartDate}
                        onChange={(e) => setEditStartDate(e.target.value)}
                        className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-700">Contract End Date</label>
                      <input
                        type="date"
                        value={editEndDate}
                        onChange={(e) => setEditEndDate(e.target.value)}
                        className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700">Breakdown Visit Entitlement</label>
                    <input
                      type="text"
                      value={editBreakdownType}
                      onChange={(e) => setEditBreakdownType(e.target.value)}
                      placeholder="e.g. UNLIMITED or 2 PER YEAR"
                      className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white font-semibold text-slate-900"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700">Special Clauses &amp; Terms</label>
                    <textarea
                      rows={3}
                      value={editSpecialClauses}
                      onChange={(e) => setEditSpecialClauses(e.target.value)}
                      placeholder="Specific client agreement conditions, response time SLAs, etc."
                      className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white leading-relaxed"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700">Payment Terms</label>
                    <textarea
                      rows={2}
                      value={editPaymentTerms}
                      onChange={(e) => setEditPaymentTerms(e.target.value)}
                      placeholder="e.g. 50% Advance, balance quarterly in arrears"
                      className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white leading-relaxed"
                    />
                  </div>
                </div>

                {/* Sticky Footer */}
                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/90 backdrop-blur-md sticky bottom-0 z-10 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editLoading}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                  >
                    {editLoading ? <RefreshCw size={14} className="animate-spin" /> : <FileEdit size={14} />}
                    <span>Save Contract Details</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Coverage Review Modal */}
      {selectedReqForCoverage && createPortal(
        <div className="fixed inset-0 z-[100] overflow-hidden select-none">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300 animate-fade-in"
            onClick={() => setSelectedReqForCoverage(null)}
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 z-[100]">
            <div
              className="w-screen max-w-lg bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-slide-in-right overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl border border-amber-200">
                    <ShieldAlert size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Commercial Coverage Review</h3>
                    <p className="text-xs text-amber-700 font-bold">{selectedReqForCoverage.requestNumber}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedReqForCoverage(null)}
                  className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer border border-slate-200/80"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleCoverageSubmit} className="flex-1 overflow-y-auto flex flex-col justify-between">
                <div className="p-6 space-y-4">
                  {/* Defect Context */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Equipment</span>
                      <span className="font-bold text-slate-900">{selectedReqForCoverage.equipmentName || 'Whole System'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Defect Finding</span>
                      <span className="text-rose-700 font-bold">{selectedReqForCoverage.equipmentConditionStatus || 'NEEDS_REPAIR'}</span>
                    </div>
                    <div className="mt-1 pt-1.5 border-t border-slate-200/80">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Engineer Observation</span>
                      <p className="text-slate-800 font-medium mt-0.5 whitespace-pre-wrap">{selectedReqForCoverage.issueDescription}</p>
                    </div>
                  </div>

                  {/* Coverage Decision Options */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-800">Commercial Classification <span className="text-rose-600">*</span></label>
                    <div className="grid grid-cols-1 gap-2.5">
                      <label className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                        coverageType === 'AMC_COVERED'
                          ? 'border-emerald-500 bg-emerald-50/50 shadow-2xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}>
                        <input
                          type="radio"
                          name="coverageType"
                          value="AMC_COVERED"
                          checked={coverageType === 'AMC_COVERED'}
                          onChange={() => setCoverageType('AMC_COVERED')}
                          className="mt-1 text-emerald-600 focus:ring-emerald-500"
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                            <ShieldCheck size={14} className="text-emerald-600" /> AMC Covered (Track A)
                          </span>
                          <span className="text-[11px] text-emerald-800 mt-0.5">
                            Covered under contract terms. Service office can immediately dispatch a Repair Task. No customer quotation required.
                          </span>
                        </div>
                      </label>

                      <label className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                        coverageType === 'CHARGEABLE'
                          ? 'border-purple-500 bg-purple-50/50 shadow-2xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}>
                        <input
                          type="radio"
                          name="coverageType"
                          value="CHARGEABLE"
                          checked={coverageType === 'CHARGEABLE'}
                          onChange={() => setCoverageType('CHARGEABLE')}
                          className="mt-1 text-purple-600 focus:ring-purple-500"
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                            <DollarSign size={14} className="text-purple-600" /> Chargeable Repair / Parts (Track B)
                          </span>
                          <span className="text-[11px] text-purple-800 mt-0.5">
                            Requires a new commercial quotation. Repair task will remain blocked until quotation is accepted and Sales Order is confirmed.
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Coverage Decision Notes */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700">Commercial Notes / Justification</label>
                    <textarea
                      rows={3}
                      value={coverageNotes}
                      onChange={(e) => setCoverageNotes(e.target.value)}
                      placeholder="e.g. Defect caused by external surge outside scope / Standard component replacement covered under Comprehensive AMC."
                      className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white leading-relaxed"
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/90 backdrop-blur-md sticky bottom-0 z-10 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedReqForCoverage(null)}
                    className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={coverageSubmitting}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                  >
                    {coverageSubmitting ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                    <span>Confirm Coverage Decision</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Repair Task Dispatch Modal */}
      {selectedReqForRepairTask && createPortal(
        <div className="fixed inset-0 z-[100] overflow-hidden select-none">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300 animate-fade-in"
            onClick={() => setSelectedReqForRepairTask(null)}
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 z-[100]">
            <div
              className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-slide-in-right overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-200">
                    <Wrench size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Dispatch Repair Task</h3>
                    <p className="text-xs text-emerald-700 font-bold">{selectedReqForRepairTask.requestNumber}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedReqForRepairTask(null)}
                  className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer border border-slate-200/80"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleRepairTaskSubmit} className="flex-1 overflow-y-auto flex flex-col justify-between">
                <div className="p-6 space-y-4">
                  {/* Context banner */}
                  <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-950">
                    <span>Authorized repair for defect in <strong>{selectedReqForRepairTask.equipmentName || 'Whole System'}</strong>. Completing this field task will mark the unit as restored/repaired.</span>
                  </div>

                  {/* Assignee Custom Dropdown */}
                  <div className="flex flex-col gap-1.5 relative" ref={assigneeDropdownRef}>
                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>Assign Field Engineer</span>
                      {selectedEngineer && (
                        <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Selected
                        </span>
                      )}
                    </label>

                    <button
                      type="button"
                      onClick={() => setIsAssigneeDropdownOpen((prev) => !prev)}
                      className={`w-full px-3.5 py-2.5 text-xs bg-slate-50 border rounded-xl flex items-center justify-between text-left transition-all cursor-pointer font-semibold ${
                        isAssigneeDropdownOpen
                          ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-white'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {selectedEngineer ? (
                          <>
                            <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0 shadow-2xs">
                              {selectedEngineer.fullName.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex items-center gap-2 truncate">
                              <span className="text-slate-900 font-bold truncate">
                                {selectedEngineer.fullName}
                              </span>
                              <span className="text-[10px] text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/80 shrink-0">
                                {selectedEngineer.designation || 'Field Engineer'}
                              </span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="w-6 h-6 rounded-lg bg-slate-200 text-slate-500 text-[11px] font-bold flex items-center justify-center shrink-0">
                              <UserX size={13} />
                            </div>
                            <span className="text-slate-500 font-semibold">Unassigned (Assign Later)</span>
                          </>
                        )}
                      </div>
                      <ChevronDown
                        size={16}
                        className={`text-slate-400 shrink-0 transition-transform duration-200 ${
                          isAssigneeDropdownOpen ? 'rotate-180 text-emerald-600' : ''
                        }`}
                      />
                    </button>

                    {/* Dropdown Menu Panel */}
                    {isAssigneeDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100 flex flex-col">
                        {/* Search Bar */}
                        <div className="p-2 border-b border-slate-100 bg-slate-50/70">
                          <div className="relative">
                            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="text"
                              autoFocus
                              value={assigneeSearchQuery}
                              onChange={(e) => setAssigneeSearchQuery(e.target.value)}
                              placeholder="Search field engineer..."
                              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-400 text-slate-900 font-medium"
                            />
                          </div>
                        </div>

                        {/* Options List */}
                        <div className="max-h-52 overflow-y-auto divide-y divide-slate-100 p-1">
                          {/* Unassigned Option */}
                          <button
                            type="button"
                            onClick={() => {
                              setRepairAssignedToId('');
                              setIsAssigneeDropdownOpen(false);
                              setAssigneeSearchQuery('');
                            }}
                            className={`w-full px-3 py-2 text-xs rounded-xl flex items-center justify-between text-left transition-colors cursor-pointer ${
                              !repairAssignedToId
                                ? 'bg-emerald-50 text-emerald-950 font-bold'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-6 h-6 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
                                <UserX size={13} />
                              </div>
                              <span className="font-semibold">Unassigned (Assign Later)</span>
                            </div>
                            {!repairAssignedToId && <Check size={14} className="text-emerald-600 shrink-0" />}
                          </button>

                          {/* Engineer List */}
                          {filteredFieldEmployees.map((emp) => {
                            const isSelected = repairAssignedToId === emp.id;
                            return (
                              <button
                                key={emp.id}
                                type="button"
                                onClick={() => {
                                  setRepairAssignedToId(emp.id);
                                  setIsAssigneeDropdownOpen(false);
                                  setAssigneeSearchQuery('');
                                }}
                                className={`w-full px-3 py-2 text-xs rounded-xl flex items-center justify-between text-left transition-colors cursor-pointer ${
                                  isSelected
                                    ? 'bg-emerald-50 text-emerald-950 font-bold'
                                    : 'text-slate-800 hover:bg-emerald-50/50 hover:text-emerald-950'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div
                                    className={`w-6 h-6 rounded-lg text-[11px] font-bold flex items-center justify-center shrink-0 ${
                                      isSelected
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-slate-100 text-slate-700'
                                    }`}
                                  >
                                    {emp.fullName.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="flex flex-col truncate">
                                    <span className="font-bold text-slate-900 truncate">{emp.fullName}</span>
                                    <span className="text-[10px] text-slate-500 font-medium">
                                      {emp.designation || 'Field Engineer'}
                                    </span>
                                  </div>
                                </div>
                                {isSelected && <Check size={14} className="text-emerald-600 shrink-0" />}
                              </button>
                            );
                          })}

                          {filteredFieldEmployees.length === 0 && (
                            <div className="py-4 text-center text-xs text-slate-400">
                              No matching field engineers found.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Scheduled Date */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700">Scheduled Date <span className="text-rose-600">*</span></label>
                    <input
                      type="date"
                      required
                      value={repairScheduledDate}
                      onChange={(e) => setRepairScheduledDate(e.target.value)}
                      className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                    />
                  </div>

                  {/* Start & End Time */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-700">Start Time</label>
                      <input
                        type="time"
                        value={repairScheduledStartTime}
                        onChange={(e) => setRepairScheduledStartTime(e.target.value)}
                        className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-700">End Time</label>
                      <input
                        type="time"
                        value={repairScheduledEndTime}
                        onChange={(e) => setRepairScheduledEndTime(e.target.value)}
                        className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                      />
                    </div>
                  </div>

                  {/* Priority Pill Selector */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700">Priority</label>
                    <div className="grid grid-cols-4 gap-2">
                      {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const).map((p) => {
                        const isSelected = repairPriority === p;
                        const colorClasses = {
                          LOW: isSelected
                            ? 'bg-slate-800 text-white border-slate-800 shadow-2xs font-bold'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 font-semibold',
                          MEDIUM: isSelected
                            ? 'bg-amber-600 text-white border-amber-600 shadow-2xs font-bold'
                            : 'bg-amber-50/60 text-amber-700 border-amber-200 hover:bg-amber-100/60 font-semibold',
                          HIGH: isSelected
                            ? 'bg-orange-600 text-white border-orange-600 shadow-2xs font-bold'
                            : 'bg-orange-50/60 text-orange-700 border-orange-200 hover:bg-orange-100/60 font-semibold',
                          URGENT: isSelected
                            ? 'bg-rose-600 text-white border-rose-600 shadow-2xs font-bold'
                            : 'bg-rose-50/60 text-rose-700 border-rose-200 hover:bg-rose-100/60 font-semibold',
                        }[p];

                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setRepairPriority(p)}
                            className={`py-2 text-xs rounded-xl border text-center transition-all cursor-pointer ${colorClasses}`}
                          >
                            {p}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Notes / Instructions */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700">Repair Task Instructions</label>
                    <textarea
                      rows={3}
                      value={repairNotes}
                      onChange={(e) => setRepairNotes(e.target.value)}
                      placeholder="Specific replacement instructions, required tools/spares to carry, safety precautions."
                      className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white leading-relaxed"
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/90 backdrop-blur-md sticky bottom-0 z-10 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedReqForRepairTask(null)}
                    className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={repairTaskSubmitting}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                  >
                    {repairTaskSubmitting ? <RefreshCw size={14} className="animate-spin" /> : <Wrench size={14} />}
                    <span>Dispatch Task</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Service Report Drawer / Modal */}
      {activeReportVisitId && (
        <AmcServiceReportModal
          visitId={activeReportVisitId}
          isOpen={!!activeReportVisitId}
          onClose={() => setActiveReportVisitId(null)}
          onSuccess={() => fetchContractDetail()}
        />
      )}

      {/* Field Service Report (FSR) Modal */}
      {activeFsrId && (
        <FsrReportModal
          fsrId={activeFsrId}
          isOpen={Boolean(activeFsrId)}
          onClose={() => setActiveFsrId(null)}
        />
      )}

      {/* Activate AMC Contract Confirmation Modal */}
      {contract && isActivateModalOpen && (
        <ActivateAmcContractModal
          isOpen={isActivateModalOpen}
          contract={contract}
          isLoading={actionLoading}
          onClose={() => setIsActivateModalOpen(false)}
          onConfirm={handleActivate}
        />
      )}

      {/* Update AMC Payment Status Modal */}
      {canUpdatePayment && isUpdatePaymentModalOpen && contract && (
        <UpdateAmcPaymentModal
          isOpen={isUpdatePaymentModalOpen}
          onClose={() => setIsUpdatePaymentModalOpen(false)}
          onSuccess={() => fetchContractDetail()}
          contract={contract}
        />
      )}
    </div>
  );
};
