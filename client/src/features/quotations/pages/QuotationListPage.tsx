import React, { useState, useEffect, useCallback } from 'react';
import { quotationService } from '../services/quotationService';
import { QuotationListItem } from '../types/quotation.types';
import { QuotationStatusBadge } from '../components/QuotationStatusBadge';
import { QuotationTypeBadge } from '../components/QuotationTypeBadge';
import { navigate } from '../../../app/router/navigation';
import {
  FileSpreadsheet,
  Plus,
  Search,
  Eye,
  Edit,
  Clock,
  CheckCircle2,
  FileEdit,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export const QuotationListPage: React.FC = () => {
  const [quotations, setQuotations] = useState<QuotationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
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

  // Compute metrics from current list or defaults
  const draftCount = quotations.filter((q) => q.status === 'DRAFT').length;
  const pendingCount = quotations.filter((q) => q.status === 'PENDING_APPROVAL').length;
  const approvedCount = quotations.filter((q) => q.status === 'APPROVED').length;

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-16">
      {/* Page Title & Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
              <FileSpreadsheet size={13} />
              COMMERCIAL DEALS
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Quotation & Estimations Management
          </h1>
          <p className="text-sm text-slate-500">
            Create multi-tier product, technical, and AMC proposals with live GST calculations, formal revisions, and approval lifecycles.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => fetchQuotations()}
            className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 transition-colors cursor-pointer"
            title="Refresh List"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            type="button"
            onClick={() => navigate('/quotations/new')}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/30 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Create Quotation</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Proposals
            </span>
            <span className="text-2xl font-bold text-slate-900">{totalCount}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <FileSpreadsheet size={20} />
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Drafts in Progress
            </span>
            <span className="text-2xl font-bold text-slate-700">{draftCount}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
            <FileEdit size={20} />
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Pending Approval
            </span>
            <span className="text-2xl font-bold text-amber-600">{pendingCount}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock size={20} />
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Approved Deals
            </span>
            <span className="text-2xl font-bold text-emerald-600">{approvedCount}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 size={20} />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by quote number, customer, company, or engineer..."
            className="w-full pl-10 pr-4 py-2 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
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
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
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
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col">
        {loading ? (
          <div className="py-24 text-center text-slate-400 text-sm flex flex-col items-center justify-center gap-2">
            <RefreshCw size={24} className="animate-spin text-blue-600" />
            <span>Loading quotations directory...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-700 flex flex-col items-center justify-center gap-2">
            <AlertCircle size={24} />
            <span className="text-sm font-semibold">{error}</span>
          </div>
        ) : quotations.length === 0 ? (
          <div className="py-24 text-center text-slate-400 text-sm flex flex-col items-center justify-center gap-3">
            <FileSpreadsheet size={40} className="text-slate-300" />
            <span className="font-bold text-slate-700 text-base">No Quotations Found</span>
            <p className="text-xs text-slate-500 max-w-sm">
              No matching commercial quotations found. Try adjusting your filters or click "Create Quotation" to create one.
            </p>
            <button
              type="button"
              onClick={() => navigate('/quotations/new')}
              className="mt-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
            >
              Create First Quotation
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/80 text-slate-600 font-bold border-b border-slate-200">
                  <th className="py-3 px-4">Quote #</th>
                  <th className="py-3 px-4">Client / Company</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Valid Until</th>
                  <th className="py-3 px-4">Rev</th>
                  <th className="py-3 px-4 text-right">Grand Total</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quotations.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-blue-600">
                      <button
                        type="button"
                        onClick={() => navigate(`/quotations/${q.id}`)}
                        className="hover:underline cursor-pointer text-left"
                      >
                        {q.quotationNumber}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-900">
                      <div className="font-bold">{q.customer?.companyName || q.customer?.name}</div>
                      {q.customer?.companyName && (
                        <div className="text-[11px] text-slate-500">Contact: {q.customer?.name}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <QuotationTypeBadge type={q.quotationType} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {q.currentRevision?.quotationDate
                        ? new Date(q.currentRevision.quotationDate).toLocaleDateString('en-IN')
                        : new Date(q.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {q.currentRevision?.validUntil
                        ? new Date(q.currentRevision.validUntil).toLocaleDateString('en-IN')
                        : '-'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-[11px] px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                        Rev {q.currentRevisionNumber}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900 text-sm">
                      {q.currentRevision?.grandTotal
                        ? `₹${parseFloat(q.currentRevision.grandTotal).toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                          })}`
                        : '-'}
                    </td>
                    <td className="py-3.5 px-4">
                      <QuotationStatusBadge status={q.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => navigate(`/quotations/${q.id}`)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        {(q.status === 'DRAFT' || q.status === 'PENDING_APPROVAL') && (
                          <button
                            type="button"
                            onClick={() => navigate(`/quotations/${q.id}/edit`)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                            title="Edit Quotation"
                          >
                            <Edit size={16} />
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

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
            <span>
              Showing Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalCount} items)
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
