import React, { useState, useEffect, useCallback } from 'react';
import { amcContractApi, AmcContract } from '../api/amcContractApi';
import { quotationService } from '../../quotations/services/quotationService';
import { navigate } from '../../../app/router/navigation';
import { toast } from '../../../utils/toast';
import {
  ShieldCheck,
  Search,
  Eye,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Building2,
  FileCheck,
  Plus,
  X,
  Loader2,
} from 'lucide-react';

export const AmcContractListPage: React.FC = () => {
  const [contracts, setContracts] = useState<AmcContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create Contract from Quotation Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [approvedQuotations, setApprovedQuotations] = useState<any[]>([]);
  const [loadingQuotations, setLoadingQuotations] = useState(false);
  const [selectedQuotationId, setSelectedQuotationId] = useState('');
  const [creatingContract, setCreatingContract] = useState(false);

  const handleOpenCreateModal = async () => {
    setIsCreateModalOpen(true);
    setSelectedQuotationId('');
    try {
      setLoadingQuotations(true);
      const res = await quotationService.getQuotations({
        quotationType: 'AMC',
        status: 'APPROVED',
        limit: 50,
      });
      const items = res.data || [];
      setApprovedQuotations(items);
      if (items.length > 0) {
        setSelectedQuotationId(items[0].id);
      }
    } catch {
      setApprovedQuotations([]);
    } finally {
      setLoadingQuotations(false);
    }
  };

  const handleCreateFromQuotation = async () => {
    if (!selectedQuotationId) return;
    try {
      setCreatingContract(true);
      const res = await amcContractApi.createFromQuotation(selectedQuotationId);
      setIsCreateModalOpen(false);
      toast.success('AMC Contract created successfully');
      if (res.data?.id) {
        navigate(`/amc-contracts/${res.data.id}`);
      } else {
        fetchContracts();
      }
    } catch (err: any) {
      toast.error('Failed to create AMC Contract', err?.message);
    } finally {
      setCreatingContract(false);
    }
  };

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [amcPlanFilter, setAmcPlanFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchContracts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await amcContractApi.getContracts({
        page,
        limit: 10,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        amcPlan: amcPlanFilter || undefined,
      });

      if (res.data) {
        setContracts(res.data);
        if (res.pagination) {
          setTotalPages(res.pagination.totalPages || 1);
          setTotalCount(res.pagination.total || 0);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load AMC contracts.');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, amcPlanFilter]);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  // Derived metrics
  const activeCount = contracts.filter((c) => c.status === 'ACTIVE').length;
  const expiringCount = contracts.filter((c) => c.status === 'EXPIRING_SOON').length;
  const expiredCount = contracts.filter((c) => c.status === 'EXPIRED').length;
  const pendingCount = contracts.filter((c) => c.status === 'PENDING_ACTIVATION').length;

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={12} />
            ACTIVE
          </span>
        );
      case 'EXPIRING_SOON':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle size={12} />
            EXPIRING SOON
          </span>
        );
      case 'PENDING_ACTIVATION':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock size={12} />
            PENDING ACTIVATION
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-300">
            <Clock size={12} />
            EXPIRED
          </span>
        );
      case 'TERMINATED':
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle size={12} />
            {status}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
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

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
              <ShieldCheck size={13} />
              SERVICE CONTRACTS
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            AMC Contract Management
          </h1>
          <p className="text-xs text-slate-500">
            Active Annual Maintenance Agreements, preventive maintenance schedules, and breakdown service tracking.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <button
            type="button"
            onClick={() => fetchContracts()}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <Plus size={14} />
            Create AMC Contract
          </button>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active AMC Contracts</span>
            <span className="text-2xl font-black text-slate-900 mt-1">{activeCount}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Expiring Soon (30 Days)</span>
            <span className="text-2xl font-black text-slate-900 mt-1">{expiringCount}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
            <AlertTriangle size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Expired</span>
            <span className="text-2xl font-black text-slate-900 mt-1">{expiredCount}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center border border-slate-200">
            <XCircle size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Activation</span>
            <span className="text-2xl font-black text-slate-900 mt-1">{pendingCount}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
            <Clock size={20} />
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Contract Number (e.g. AMC/2026-27/0001) or Customer Name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="PENDING_ACTIVATION">PENDING ACTIVATION</option>
            <option value="EXPIRING_SOON">EXPIRING SOON</option>
            <option value="EXPIRED">EXPIRED</option>
            <option value="TERMINATED">TERMINATED</option>
          </select>

          {/* AMC Plan Filter */}
          <select
            value={amcPlanFilter}
            onChange={(e) => {
              setAmcPlanFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500"
          >
            <option value="">All AMC Plans</option>
            <option value="Ultra Care (UC)">Ultra Care (UC)</option>
            <option value="Comprehensive AMC">Comprehensive AMC</option>
            <option value="Non-Comprehensive AMC">Non-Comprehensive AMC</option>
            <option value="Silver Care">Silver Care</option>
            <option value="Gold Care">Gold Care</option>
            <option value="Platinum Care">Platinum Care</option>
          </select>
        </div>
      </div>

      {/* Contract Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
            <RefreshCw size={24} className="animate-spin text-blue-600" />
            <span className="text-xs font-semibold">Loading AMC Contracts...</span>
          </div>
        ) : error ? (
          <div className="p-12 text-center text-rose-600 flex flex-col items-center gap-2">
            <AlertTriangle size={24} />
            <span className="text-xs font-bold">{error}</span>
          </div>
        ) : contracts.length === 0 ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-2">
            <FileCheck size={28} className="text-slate-400" />
            <span className="text-sm font-bold text-slate-800">No AMC Contracts Found</span>
            <p className="text-xs text-slate-500 max-w-sm">
              Convert an accepted AMC quotation into a service contract from the Quotations page.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/90 text-slate-600 font-bold uppercase tracking-wider">
                  <th className="px-4 py-3.5">Contract No.</th>
                  <th className="px-4 py-3.5">Customer & Site</th>
                  <th className="px-4 py-3.5">AMC Plan</th>
                  <th className="px-4 py-3.5">Contract Period</th>
                  <th className="px-4 py-3.5">Frequency / Visits</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Grand Total</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {contracts.map((contract) => (
                  <tr key={contract.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-4 font-bold text-blue-600">
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => navigate(`/amc-contracts/${contract.id}`)}
                          className="hover:underline cursor-pointer text-left"
                        >
                          {contract.contractNumber}
                        </button>
                        {contract.renewedFromContractId && (
                          <span className="text-[10px] text-teal-600 font-bold flex items-center gap-1">
                            <RefreshCw size={9} /> Renewal Contract
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">
                          {contract.customerCompanyName || contract.customerName}
                        </span>
                        {contract.endUser && (
                          <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Building2 size={11} /> End User: {contract.endUser}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="px-2 py-0.5 rounded font-semibold bg-purple-50 text-purple-700 border border-purple-200 text-[11px]">
                        {contract.amcPlan}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex flex-col text-[11px] gap-0.5">
                        <span className="flex items-center gap-1 text-slate-700 font-medium">
                          <Calendar size={11} className="text-slate-400" />
                          {formatDate(contract.contractStartDate)}
                        </span>
                        <span className="text-slate-400 text-[10px]">to {formatDate(contract.contractEndDate)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex flex-col text-[11px]">
                        <span className="font-bold text-slate-800">{contract.serviceFrequency}</span>
                        <span className="text-slate-500 text-[10px]">
                          {contract.completedVisits} of {contract.scheduledVisits} Visits Done
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">{renderStatusBadge(contract.status)}</td>
                    <td className="px-4 py-4 whitespace-nowrap font-bold text-slate-900">
                      ₹{Number(contract.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right">
                      <button
                        type="button"
                        onClick={() => navigate(`/amc-contracts/${contract.id}`)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
                      >
                        <Eye size={13} /> View Detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
            <span>
              Showing Page <strong className="text-slate-800">{page}</strong> of{' '}
              <strong className="text-slate-800">{totalPages}</strong> ({totalCount} Contracts)
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create AMC Contract Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-scale-in">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Create AMC Contract</h3>
                  <p className="text-xs text-slate-500">Convert an approved AMC proposal into an active contract</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {loadingQuotations ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500">
                  <Loader2 size={24} className="animate-spin text-blue-600" />
                  <span className="text-xs font-semibold">Loading approved AMC quotations...</span>
                </div>
              ) : approvedQuotations.length === 0 ? (
                <div className="py-8 text-center flex flex-col items-center justify-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                    <AlertTriangle size={24} />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">No Approved AMC Quotations</h4>
                  <p className="text-xs text-slate-500 max-w-xs">
                    To create an AMC Contract, an AMC Quotation must first be created and approved in Quotations & Proposals.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-700 block">
                    Select Approved AMC Quotation
                  </label>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {approvedQuotations.map((q) => (
                      <div
                        key={q.id}
                        onClick={() => setSelectedQuotationId(q.id)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          selectedQuotationId === q.id
                            ? 'border-blue-600 bg-blue-50/60 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">{q.quotationNumber}</span>
                            <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                              APPROVED
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 font-medium truncate mt-0.5">
                            {q.customer?.name || q.customer?.companyName || 'Customer'}
                          </p>
                          {q.currentRevision?.grandTotal && (
                            <span className="text-[11px] font-bold text-slate-700 mt-1 block">
                              ₹{Number(q.currentRevision.grandTotal).toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>
                        <input
                          type="radio"
                          name="selectedQuotation"
                          checked={selectedQuotationId === q.id}
                          onChange={() => setSelectedQuotationId(q.id)}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              {approvedQuotations.length > 0 && (
                <button
                  type="button"
                  disabled={!selectedQuotationId || creatingContract}
                  onClick={handleCreateFromQuotation}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-2"
                >
                  {creatingContract ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                  <span>Generate Contract</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
