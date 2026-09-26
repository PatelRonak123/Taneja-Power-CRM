import React, { useState, useEffect, useCallback } from 'react';
import { quotationService } from '../services/quotationService';
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
} from 'lucide-react';
import { useAuthStore } from '../../../stores/authStore';
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

export const QuotationListPage: React.FC = () => {
  const { user } = useAuthStore();
  const designationLower = (user?.designation || '').toLowerCase();
  const isServiceOffice = user?.role === 'USER' && user?.workType === 'OFFICE' && designationLower.includes('service');
  const isAccountantOffice = user?.role === 'USER' && user?.workType === 'OFFICE' && designationLower.includes('accountant');

  const [quotations, setQuotations] = useState<QuotationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState(isServiceOffice ? 'SERVICE' : '');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

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
  }, [page, search, statusFilter, typeFilter]);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  // Compute metrics from current list
  const draftCount = quotations.filter((q) => q.status === 'DRAFT').length;
  const pendingCount = quotations.filter((q) => q.status === 'PENDING_APPROVAL').length;
  const approvedCount = quotations.filter((q) => q.status === 'APPROVED').length;

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
              ? 'View commercial service proposals, technical estimations, and AMC contract quotations.'
              : 'Create multi-tier product, technical, and AMC proposals with live GST calculations, formal revisions, and approval lifecycles.'}
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
          {!isServiceOffice && !isAccountantOffice && (
            <Button
              variant="primary"
              size="md"
              leftIcon={<Plus size={16} />}
              onClick={() => navigate('/quotations/new')}
            >
              Create Quotation
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

      {/* Filter & Search Bar */}
      <div className="bg-card border border-border rounded-xl p-3 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <SearchInput
          placeholder="Search by quote number, customer, company, or engineer..."
          value={search}
          onChange={setSearch}
          onResetPage={() => setPage(1)}
          wrapperClassName="flex-1 w-full min-w-70"
          inputClassName="bg-slate-50 border-slate-200"
          isLoading={loading}
        />

        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 px-3 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 cursor-pointer"
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

          {/* Quotation Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 px-3 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 cursor-pointer"
          >
            <option value="">All Types</option>
            <option value="PRODUCT">Product</option>
            <option value="TECHNICAL">Technical</option>
            <option value="SERVICE">Service</option>
            <option value="AMC">AMC Contract</option>
          </select>
        </div>
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
                      description="No matching commercial quotations found. Try adjusting your filters or create a new quotation."
                      action={
                        !isServiceOffice && !isAccountantOffice ? (
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
                              <button
                                type="button"
                                onClick={() => navigate(`/quotations/${q.id}/edit`)}
                                className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-amber-50 text-slate-500 hover:text-amber-600 hover:border-amber-200 transition-colors cursor-pointer shadow-2xs focus-visible:outline-2 focus-visible:outline-amber-600"
                                title="Edit Quotation"
                                aria-label={`Edit quotation ${q.quotationNumber}`}
                              >
                                <Edit size={13} />
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
