import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { quotationService } from '../services/quotationService';
import { customerService } from '../../customers/services/customerService';
import { Customer } from '../../customers/types/customer.types';
import { QuotationListItem } from '../types/quotation.types';
import { QuotationStatusBadge } from '../components/QuotationStatusBadge';
import { QuotationTypeBadge } from '../components/QuotationTypeBadge';
import { navigate } from '../../../app/router/navigation';
import { SearchInput } from '../../../components/ui/SearchInput';
import {
  FileSpreadsheet,
  Plus,
  Eye,
  Edit,
  Mail,
  Clock,
  CheckCircle2,
  FileEdit,
  AlertCircle,
  RefreshCw,
  Calendar,
  Filter,
  X,
  RotateCcw,
  Building2,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Send,
} from 'lucide-react';
import { useAuthStore } from '../../../stores/authStore';
import { toast } from '../../../utils/toast';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TablePagination,
  TableLoadingState,
  TableEmptyState,
} from '../../../components/ui/table';
import { Button } from '../../../components/ui/Button';

type DatePreset =
  | 'ALL_TIME'
  | 'TODAY'
  | 'YESTERDAY'
  | 'THIS_WEEK'
  | 'THIS_MONTH'
  | 'LAST_30_DAYS'
  | 'THIS_QUARTER'
  | 'CUSTOM';

export const QuotationListPage: React.FC = () => {
  const { user } = useAuthStore();
  const designationLower = (user?.designation || '').toLowerCase();
  const isSalesOffice = (user?.role === 'USER' || (user as any)?.role === 'SALES') && designationLower.includes('sales');
  const isServiceOffice = (user?.role === 'USER' || (user as any)?.role === 'SERVICE') && designationLower.includes('service');
  const isAccountantOffice = user?.role === 'USER' && designationLower.includes('accountant');

  const [quotations, setQuotations] = useState<QuotationListItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  // Filter States
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState(isServiceOffice ? 'SERVICE' : '');
  const [customerFilter, setCustomerFilter] = useState('');
  const [datePreset, setDatePreset] = useState<DatePreset>('ALL_TIME');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Load customer master list for dropdown filter
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await customerService.getCustomers({ limit: 100 });
        if (res.data) {
          setCustomers(res.data);
        }
      } catch (err) {
        console.error('Failed to load customers for filter', err);
      }
    };
    fetchCustomers();
  }, []);

  // Handle Date Preset Selection
  const handleDatePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    setPage(1);

    if (preset === 'ALL_TIME') {
      setStartDate('');
      setEndDate('');
      return;
    }

    if (preset === 'CUSTOM') {
      setShowAdvancedFilters(true);
      return;
    }

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (preset === 'TODAY') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'YESTERDAY') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().split('T')[0];
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (preset === 'THIS_WEEK') {
      const d = new Date();
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      setStartDate(monday.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'THIS_MONTH') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'LAST_30_DAYS') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      setStartDate(d.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'THIS_QUARTER') {
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
      const firstDay = new Date(now.getFullYear(), quarterStartMonth, 1);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(todayStr);
    }
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('');
    setTypeFilter(isServiceOffice ? 'SERVICE' : '');
    setCustomerFilter('');
    setDatePreset('ALL_TIME');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  // Check if any filter is actively applied
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (search.trim()) count++;
    if (statusFilter) count++;
    if (typeFilter && !(isServiceOffice && typeFilter === 'SERVICE')) count++;
    if (customerFilter) count++;
    if (datePreset !== 'ALL_TIME' || startDate || endDate) count++;
    return count;
  }, [search, statusFilter, typeFilter, customerFilter, datePreset, startDate, endDate, isServiceOffice]);

  // Fetch quotations list
  const fetchQuotations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await quotationService.getQuotations({
        page,
        limit: 10,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        quotationType: typeFilter || undefined,
        customerId: customerFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });

      if (res.data) {
        setQuotations(res.data);
        if (res.meta) {
          setTotalPages(res.meta.totalPages || 1);
          setTotalCount(res.meta.total || 0);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load quotations.');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, typeFilter, customerFilter, startDate, endDate]);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  const handleQuickSubmit = async (q: QuotationListItem) => {
    try {
      setSubmittingId(q.id);
      await quotationService.submitQuotation(q.id);
      toast.success(`Quotation ${q.quotationNumber} submitted for approval`);
      fetchQuotations();
    } catch (err: any) {
      toast.error('Failed to submit for approval', err?.response?.data?.message || err?.message);
    } finally {
      setSubmittingId(null);
    }
  };

  // Compute metrics from current list
  const draftCount = quotations.filter((q) => q.status === 'DRAFT').length;
  const pendingCount = quotations.filter((q) => q.status === 'PENDING_APPROVAL').length;
  const approvedCount = quotations.filter((q) => q.status === 'APPROVED').length;

  const selectedCustomerObj = customers.find((c) => c.id === customerFilter);

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-10">
      {/* Page Title & Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-5 rounded-xl border border-border shadow-xs">
        <div className="flex flex-col gap-1 max-w-3xl">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200/60 text-blue-700 text-[11px] font-semibold uppercase tracking-wider">
              <FileSpreadsheet size={12} className="text-blue-600" />
              {isServiceOffice ? 'SERVICE PROPOSALS' : 'COMMERCIAL DEALS'}
            </span>
          </div>
          <h1 className="text-[22px] font-semibold text-slate-900 tracking-tight leading-tight">
            {isServiceOffice ? 'Service Quotations Directory' : 'Quotation & Estimations Management'}
          </h1>
          <p className="text-[13px] text-slate-500 font-normal mt-0.5 leading-normal">
            {isServiceOffice
              ? 'View and create commercial service proposals, technical estimations, and AMC contract quotations.'
              : 'Create multi-tier product and technical proposals with live GST calculations, formal revisions, and approval lifecycles.'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="md"
            onClick={() => fetchQuotations()}
            disabled={loading}
            title="Refresh List"
            className="px-3"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </Button>
          {!isAccountantOffice && (
            <Button
              variant="primary"
              size="md"
              leftIcon={<Plus size={16} />}
              onClick={() => navigate('/quotations/new')}
            >
              {isServiceOffice ? 'Create Service / AMC Quotation' : 'Create Quotation'}
            </Button>
          )}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 shadow-xs flex items-center justify-between transition-colors hover:border-slate-300">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium text-slate-500">Total Proposals</span>
            <span className="text-[22px] font-semibold text-slate-900 tabular-nums leading-tight">{totalCount}</span>
            <span className="text-xs text-slate-400">All registered quotes</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <FileSpreadsheet size={18} />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-xs flex items-center justify-between transition-colors hover:border-slate-300">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium text-slate-500">Drafts in Progress</span>
            <span className="text-[22px] font-semibold text-slate-900 tabular-nums leading-tight">{draftCount}</span>
            <span className="text-xs text-slate-400">Unsubmitted quotes</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center shrink-0">
            <FileEdit size={18} />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-xs flex items-center justify-between transition-colors hover:border-slate-300">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium text-slate-500">Pending Approval</span>
            <span className="text-[22px] font-semibold text-amber-600 tabular-nums leading-tight">{pendingCount}</span>
            <span className="text-xs text-amber-600/80 font-medium">Awaiting manager review</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <Clock size={18} />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-xs flex items-center justify-between transition-colors hover:border-slate-300">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium text-slate-500">Approved Deals</span>
            <span className="text-[22px] font-semibold text-emerald-600 tabular-nums leading-tight">{approvedCount}</span>
            <span className="text-xs text-emerald-600 font-medium">Authorized commercial proposals</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 size={18} />
          </div>
        </div>
      </div>

      {/* Filter & Search Suite */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-xs flex flex-col gap-3">
        {/* Primary Filter Row */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          {/* Search Input */}
          <SearchInput
            placeholder="Search quote #, client, company, salesperson..."
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            onResetPage={() => setPage(1)}
            wrapperClassName="flex-1 w-full min-w-64"
            inputClassName="bg-slate-50 border-slate-200"
            isLoading={loading}
          />

          <div className="flex flex-wrap items-center gap-2">
            {/* Date Preset Filter */}
            <div className="flex items-center gap-1.5 h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700">
              <Calendar size={13} className="text-slate-400 shrink-0" />
              <select
                value={datePreset}
                onChange={(e) => handleDatePresetChange(e.target.value as DatePreset)}
                className="bg-transparent text-xs font-medium text-slate-800 focus:outline-none cursor-pointer pr-1"
                title="Filter by creation date period"
              >
                <option value="ALL_TIME">All Dates</option>
                <option value="TODAY">Today</option>
                <option value="YESTERDAY">Yesterday</option>
                <option value="THIS_WEEK">This Week</option>
                <option value="THIS_MONTH">This Month</option>
                <option value="LAST_30_DAYS">Last 30 Days</option>
                <option value="THIS_QUARTER">This Quarter</option>
                <option value="CUSTOM">Custom Date Range...</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700">
              <span className="text-[11px] uppercase tracking-wider text-slate-400">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent text-xs font-medium text-slate-800 focus:outline-none cursor-pointer pr-1"
              >
                <option value="">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="PENDING_APPROVAL">Pending Approval</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="SENT">Sent</option>
                <option value="FOLLOW_UP">Follow-up</option>
                <option value="ACCEPTED">Accepted</option>
                <option value="EXPIRED">Expired</option>
              </select>
            </div>

            {/* Quotation Type Filter */}
            <div className="flex items-center gap-1.5 h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700">
              <span className="text-[11px] uppercase tracking-wider text-slate-400">Type:</span>
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent text-xs font-medium text-slate-800 focus:outline-none cursor-pointer pr-1"
              >
                <option value="">
                  {isSalesOffice ? 'All Allowed (Product & Technical)' : isServiceOffice ? 'All Allowed (Service & AMC)' : 'All Types'}
                </option>
                {!isServiceOffice && <option value="PRODUCT">Product</option>}
                {!isServiceOffice && <option value="TECHNICAL">Technical</option>}
                {!isSalesOffice && <option value="SERVICE">Service</option>}
                {!isSalesOffice && <option value="AMC">AMC Contract</option>}
              </select>
            </div>

            {/* Toggle Advanced Filters Button */}
            <button
              type="button"
              onClick={() => setShowAdvancedFilters((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                showAdvancedFilters || customerFilter || datePreset === 'CUSTOM' || startDate || endDate
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
              title="Toggle client & custom date filters"
            >
              <SlidersHorizontal size={13} />
              <span>More Filters</span>
              {activeFiltersCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">
                  {activeFiltersCount}
                </span>
              )}
              {showAdvancedFilters ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>

            {/* Reset Filters Button */}
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 h-9 px-2.5 rounded-lg border border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 text-xs font-medium transition-colors cursor-pointer"
                title="Reset all filters"
              >
                <RotateCcw size={12} />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Expandable Advanced Filter Panel (Custom Date Range & Customer Selector) */}
        {showAdvancedFilters && (
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in duration-150">
            {/* Client / Customer Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                <Building2 size={12} className="text-slate-400" />
                Filter by Customer / Account:
              </label>
              <select
                value={customerFilter}
                onChange={(e) => {
                  setCustomerFilter(e.target.value);
                  setPage(1);
                }}
                className="h-9 px-3 text-xs text-slate-800 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 cursor-pointer"
              >
                <option value="">-- All Registered Customers --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName ? `${c.companyName} (${c.name})` : c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Date */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                <Calendar size={12} className="text-slate-400" />
                Created From Date:
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDatePreset('CUSTOM');
                  setPage(1);
                }}
                className="h-9 px-3 text-xs text-slate-800 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* End Date */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                <Calendar size={12} className="text-slate-400" />
                Created To Date:
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDatePreset('CUSTOM');
                  setPage(1);
                }}
                className="h-9 px-3 text-xs text-slate-800 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
        )}

        {/* Active Filter Badges */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] font-medium text-slate-400 mr-1 flex items-center gap-1">
              <Filter size={11} /> Active Filters:
            </span>

            {search.trim() && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                Keyword: <strong className="text-slate-900">{search.trim()}</strong>
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="hover:text-rose-600 cursor-pointer ml-0.5"
                >
                  <X size={11} />
                </button>
              </span>
            )}

            {datePreset !== 'ALL_TIME' && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-200">
                Date: <strong className="text-blue-900">
                  {datePreset === 'CUSTOM'
                    ? `${startDate || 'Start'} to ${endDate || 'Now'}`
                    : datePreset.replace('_', ' ')}
                </strong>
                <button
                  type="button"
                  onClick={() => handleDatePresetChange('ALL_TIME')}
                  className="hover:text-rose-600 cursor-pointer ml-0.5"
                >
                  <X size={11} />
                </button>
              </span>
            )}

            {statusFilter && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-amber-50 text-amber-800 px-2 py-0.5 rounded-md border border-amber-200">
                Status: <strong className="text-amber-900">{statusFilter}</strong>
                <button
                  type="button"
                  onClick={() => setStatusFilter('')}
                  className="hover:text-rose-600 cursor-pointer ml-0.5"
                >
                  <X size={11} />
                </button>
              </span>
            )}

            {typeFilter && !(isServiceOffice && typeFilter === 'SERVICE') && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md border border-purple-200">
                Type: <strong className="text-purple-900">{typeFilter}</strong>
                <button
                  type="button"
                  onClick={() => setTypeFilter('')}
                  className="hover:text-rose-600 cursor-pointer ml-0.5"
                >
                  <X size={11} />
                </button>
              </span>
            )}

            {customerFilter && selectedCustomerObj && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-200">
                Client: <strong className="text-emerald-900">
                  {selectedCustomerObj.companyName || selectedCustomerObj.name}
                </strong>
                <button
                  type="button"
                  onClick={() => setCustomerFilter('')}
                  className="hover:text-rose-600 cursor-pointer ml-0.5"
                >
                  <X size={11} />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={handleResetFilters}
              className="text-[11px] text-slate-500 hover:text-rose-600 font-semibold underline underline-offset-2 ml-1 cursor-pointer"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Main Quotations Data Table */}
      <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden flex flex-col">
        {error ? (
          <div className="p-8 text-center text-rose-700 flex flex-col items-center justify-center gap-2">
            <AlertCircle size={24} />
            <span className="text-sm font-semibold">{error}</span>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table density="standard">
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-28">Quote #</TableHead>
                    <TableHead className="min-w-48">Client / Company</TableHead>
                    <TableHead className="min-w-24">Type</TableHead>
                    <TableHead className="min-w-28">Date</TableHead>
                    <TableHead className="min-w-28">Valid Until</TableHead>
                    <TableHead className="min-w-20">Rev</TableHead>
                    <TableHead align="right" className="min-w-32">Grand Total</TableHead>
                    <TableHead className="min-w-28">Status</TableHead>
                    <TableHead align="right" className="min-w-28">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableLoadingState columns={9} rows={6} />
                  ) : quotations.length === 0 ? (
                    <TableEmptyState
                      colSpan={9}
                      icon={<FileSpreadsheet size={24} />}
                      title="No Quotations Found"
                      description={
                        activeFiltersCount > 0
                          ? 'No quotations match the active filter criteria. Try broadening your date range or clearing filters.'
                          : 'No matching commercial quotations found. Create a new quotation to get started.'
                      }
                      action={
                        !isAccountantOffice ? (
                          <Button
                            variant="primary"
                            size="sm"
                            leftIcon={<Plus size={14} />}
                            onClick={() => navigate('/quotations/new')}
                          >
                            Create First Quotation
                          </Button>
                        ) : undefined
                      }
                    />
                  ) : (
                    quotations.map((q) => (
                      <TableRow key={q.id}>
                        <TableCell className="font-semibold text-blue-600">
                          <button
                            type="button"
                            onClick={() => navigate(`/quotations/${q.id}`)}
                            className="hover:underline cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-blue-600 rounded text-xs font-semibold"
                          >
                            {q.quotationNumber}
                          </button>
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-slate-900 text-[13px]">{q.customer?.companyName || q.customer?.name}</div>
                          {q.customer?.companyName && (
                            <div className="text-[11px] text-slate-500 font-normal">Contact: {q.customer?.name}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <QuotationTypeBadge type={q.quotationType} size="sm" />
                        </TableCell>
                        <TableCell className="text-slate-600 tabular-nums whitespace-nowrap text-xs">
                          {q.currentRevision?.quotationDate
                            ? new Date(q.currentRevision.quotationDate).toLocaleDateString('en-IN')
                            : new Date(q.createdAt).toLocaleDateString('en-IN')}
                        </TableCell>
                        <TableCell className="text-slate-600 tabular-nums whitespace-nowrap text-xs">
                          {q.currentRevision?.validUntil
                            ? new Date(q.currentRevision.validUntil).toLocaleDateString('en-IN')
                            : '—'}
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-[11px] px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                            Rev {q.currentRevisionNumber}
                          </span>
                        </TableCell>
                        <TableCell align="right" numeric className="font-semibold text-slate-900 text-xs tabular-nums whitespace-nowrap">
                          {q.currentRevision?.grandTotal
                            ? `₹${parseFloat(q.currentRevision.grandTotal).toLocaleString('en-IN', {
                                minimumFractionDigits: 2,
                              })}`
                            : '—'}
                        </TableCell>
                        <TableCell>
                          <QuotationStatusBadge status={q.status} size="sm" />
                        </TableCell>
                        <TableCell align="right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => navigate(`/quotations/${q.id}`)}
                              className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-colors cursor-pointer shadow-2xs focus-visible:outline-2 focus-visible:outline-blue-600"
                              title="View Details"
                              aria-label={`View quotation ${q.quotationNumber}`}
                            >
                              <Eye size={13} />
                            </button>
                            {['APPROVED', 'SENT', 'ACCEPTED', 'FOLLOW_UP'].includes(q.status) && !isAccountantOffice && (
                              <button
                                type="button"
                                onClick={() => navigate(`/quotations/${q.id}`)}
                                className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-colors cursor-pointer shadow-2xs focus-visible:outline-2 focus-visible:outline-indigo-600"
                                title="Send Quotation PDF Email to Customer"
                                aria-label={`Send quotation ${q.quotationNumber} via email`}
                              >
                                <Mail size={13} />
                              </button>
                            )}
                            {q.status === 'DRAFT' && !isAccountantOffice && (
                              <>
                                <button
                                  type="button"
                                  disabled={submittingId === q.id}
                                  onClick={() => handleQuickSubmit(q)}
                                  className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-emerald-50 text-slate-500 hover:text-emerald-600 hover:border-emerald-200 transition-colors cursor-pointer shadow-2xs focus-visible:outline-2 focus-visible:outline-emerald-600 disabled:opacity-50"
                                  title="Submit for Approval"
                                  aria-label={`Submit quotation ${q.quotationNumber} for approval`}
                                >
                                  <Send size={13} className={submittingId === q.id ? 'animate-spin' : ''} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => navigate(`/quotations/${q.id}/edit`)}
                                  className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-amber-50 text-slate-500 hover:text-amber-600 hover:border-amber-200 transition-colors cursor-pointer shadow-2xs focus-visible:outline-2 focus-visible:outline-amber-600"
                                  title="Edit Quotation"
                                  aria-label={`Edit quotation ${q.quotationNumber}`}
                                >
                                  <Edit size={13} />
                                </button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {!loading && quotations.length > 0 && (
              <TablePagination
                page={page}
                totalPages={totalPages}
                totalCount={totalCount}
                limit={10}
                onPageChange={(p) => setPage(p)}
                entityName="quotations"
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};
