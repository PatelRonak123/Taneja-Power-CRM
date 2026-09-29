import React, { useState } from 'react';
import {
  CalendarClock,
  Plus,
  Search,
  RefreshCw,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Building2,
  FileSpreadsheet,
  Target,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  User,
  Ban,
  Trash2,
} from 'lucide-react';
import {
  FollowUpItem,
} from '../types/follow-up.types';
import { useFollowUps, useFollowUpMetrics, useDeleteFollowUp, useCancelFollowUp } from '../hooks/useFollowUps';
import { FollowUpStatusBadge } from '../components/FollowUpStatusBadge';
import { FollowUpPriorityBadge } from '../components/FollowUpPriorityBadge';
import { FollowUpTypeBadge } from '../components/FollowUpTypeBadge';
import { FollowUpModal } from '../components/FollowUpModal';
import { FollowUpDetailModal } from '../components/FollowUpDetailModal';
import { CompleteFollowUpModal } from '../components/CompleteFollowUpModal';
import { RescheduleFollowUpModal } from '../components/RescheduleFollowUpModal';
import { Button } from '../../../components/ui/Button';
import { useAuthStore } from '../../../stores/authStore';
import { confirmModal } from '../../../utils/confirmModal';

export const FollowUpManagementPage: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  const isAccountantOffice =
    user?.role === 'USER' && user?.designation === 'Accountant Office';

  // Filters & State
  const [activeTab, setActiveTab] = useState<'all' | 'today' | 'upcoming' | 'overdue' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUpItem | null>(null);
  const [followUpToEdit, setFollowUpToEdit] = useState<FollowUpItem | null>(null);
  const [followUpToComplete, setFollowUpToComplete] = useState<FollowUpItem | null>(null);
  const [followUpToReschedule, setFollowUpToReschedule] = useState<FollowUpItem | null>(null);

  const deleteMutation = useDeleteFollowUp();
  const cancelMutation = useCancelFollowUp();

  // Metrics query
  const { data: metricsRes, isLoading: loadingMetrics, refetch: refetchMetrics } = useFollowUpMetrics();
  const metrics = metricsRes?.data;

  // List query
  const { data: listRes, isLoading: loadingList, isFetching, refetch: refetchList } = useFollowUps({
    page,
    limit,
    tab: activeTab,
    search: searchQuery.trim() || undefined,
    type: typeFilter !== 'ALL' ? typeFilter : undefined,
    priority: priorityFilter !== 'ALL' ? priorityFilter : undefined,
  });

  const followUps = listRes?.data || [];
  const pagination = listRes?.meta || { total: 0, page: 1, limit: 20, totalPages: 1 };
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

  const handleRefresh = () => {
    refetchMetrics();
    refetchList();
  };

  const handleCancel = async (item: FollowUpItem) => {
    const confirmed = await confirmModal.danger(
      'Cancel Follow-up?',
      `Are you sure you want to cancel ${item.followUpNumber} (${item.title})?`,
      'Cancel Follow-up'
    );
    if (confirmed) {
      await cancelMutation.mutateAsync({
        id: item.id,
        payload: { reason: 'Cancelled by employee' },
      });
    }
  };

  const handleDelete = async (item: FollowUpItem) => {
    const confirmed = await confirmModal.danger(
      'Delete Follow-up Permanently?',
      `Are you sure you want to permanently delete follow-up ${item.followUpNumber}? This cannot be undone.`,
      'Delete Permanently'
    );
    if (confirmed) {
      await deleteMutation.mutateAsync(item.id);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-16 animate-fade-in w-full">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <CalendarClock className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Follow-ups & Reminders
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Manage client communications, quotations, renewals, and pending CRM touchpoints
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="md"
            onClick={handleRefresh}
            isLoading={isFetching}
            className="shadow-2xs"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          {!isAccountantOffice && (
            <Button
              variant="primary"
              size="md"
              onClick={() => setIsCreateModalOpen(true)}
              className="shadow-sm shadow-blue-600/20"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Schedule Follow-up
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Total */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Total Logged</span>
            <CalendarClock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {loadingMetrics ? '—' : metrics?.total ?? 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Across all lifecycle states</div>
        </div>

        {/* Today */}
        <div
          onClick={() => {
            setActiveTab('today');
            setPage(1);
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs ${
            activeTab === 'today'
              ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-500/20'
              : 'bg-white border-slate-200/80 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between text-blue-600 text-xs font-semibold uppercase tracking-wider">
            <span>Today's Follow-ups</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-900 mt-2">
            {loadingMetrics ? '—' : metrics?.today ?? 0}
          </div>
          <div className="text-[11px] text-blue-600/80 mt-0.5">Due today</div>
        </div>

        {/* Overdue */}
        <div
          onClick={() => {
            setActiveTab('overdue');
            setPage(1);
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs ${
            activeTab === 'overdue'
              ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-500/20'
              : 'bg-white border-slate-200/80 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between text-rose-600 text-xs font-semibold uppercase tracking-wider">
            <span>Overdue</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-600 mt-2">
            {loadingMetrics ? '—' : metrics?.overdue ?? 0}
          </div>
          <div className="text-[11px] text-rose-600/80 mt-0.5">Require urgent attention</div>
        </div>

        {/* Upcoming */}
        <div
          onClick={() => {
            setActiveTab('upcoming');
            setPage(1);
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs ${
            activeTab === 'upcoming'
              ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-500/20'
              : 'bg-white border-slate-200/80 hover:border-indigo-300'
          }`}
        >
          <div className="flex items-center justify-between text-indigo-600 text-xs font-semibold uppercase tracking-wider">
            <span>Upcoming</span>
            <Calendar className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-indigo-900 mt-2">
            {loadingMetrics ? '—' : metrics?.upcoming ?? 0}
          </div>
          <div className="text-[11px] text-indigo-600/80 mt-0.5">Scheduled future actions</div>
        </div>

        {/* Completed */}
        <div
          onClick={() => {
            setActiveTab('completed');
            setPage(1);
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs col-span-2 lg:col-span-1 ${
            activeTab === 'completed'
              ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-200/80 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-700 text-xs font-semibold uppercase tracking-wider">
            <span>Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-2">
            {loadingMetrics ? '—' : metrics?.totalCompleted ?? 0}
          </div>
          <div className="text-[11px] text-emerald-700/80 mt-0.5">
            {metrics?.completedToday ?? 0} completed today
          </div>
        </div>
      </div>

      {/* Tabs & Search Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex items-center px-4 border-b border-slate-200 overflow-x-auto gap-2 bg-slate-50/50">
          {(
            [
              { key: 'all', label: 'All Follow-ups' },
              { key: 'today', label: `Today (${metrics?.today ?? 0})` },
              { key: 'upcoming', label: `Upcoming (${metrics?.upcoming ?? 0})` },
              { key: 'overdue', label: `Overdue (${metrics?.overdue ?? 0})` },
              { key: 'completed', label: 'Completed History' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setActiveTab(tab.key);
                setPage(1);
              }}
              className={`py-3.5 px-3 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filter Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-white">
          <div className="flex items-center gap-3 flex-1 min-w-[280px]">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by title, number, client, quotation..."
                className="w-full pl-9 pr-3.5 py-1.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50/50 focus:bg-white"
              />
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white text-slate-700 font-medium"
            >
              <option value="ALL">All Interaction Types</option>
              <option value="CALL">Phone Call</option>
              <option value="MEETING">Meeting</option>
              <option value="EMAIL">Email</option>
              <option value="SITE_VISIT">Site Visit</option>
              <option value="QUOTATION_FOLLOW_UP">Quotation Follow-up</option>
              <option value="PAYMENT_FOLLOW_UP">Payment Follow-up</option>
              <option value="AMC_RENEWAL">AMC Renewal</option>
              <option value="AMC_EXPIRY">AMC Expiry</option>
              <option value="CUSTOMER_VISIT">Customer Visit</option>
              <option value="OTHER">Other</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white text-slate-700 font-medium"
            >
              <option value="ALL">All Priorities</option>
              <option value="HIGH">High Priority</option>
              <option value="MEDIUM">Medium Priority</option>
              <option value="LOW">Low Priority</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          {loadingList ? (
            <div className="p-16 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
              <Clock className="w-5 h-5 animate-spin text-blue-600" />
              Loading follow-ups...
            </div>
          ) : followUps.length === 0 ? (
            <div className="p-16 text-center text-slate-500">
              <CalendarClock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">No follow-ups found</h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                No items match your active filters. Try adjusting search or schedule a new follow-up.
              </p>
              {!isAccountantOffice && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="mt-4"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Schedule Follow-up
                </Button>
              )}
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-500 uppercase tracking-wider font-bold text-[11px]">
                  <th className="py-3 px-4">Ref Number</th>
                  <th className="py-3 px-4">Follow-up Title</th>
                  <th className="py-3 px-4">Related Entity</th>
                  <th className="py-3 px-4">Scheduled For</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Assigned To</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {followUps.map((item) => {
                  const isItemOverdue =
                    item.status === 'PENDING' && item.scheduledDate < today;
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isItemOverdue ? 'bg-rose-50/20' : ''
                      }`}
                    >
                      {/* Number & Type */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800 whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            onClick={() => setSelectedFollowUp(item)}
                            className="hover:text-blue-600 cursor-pointer"
                          >
                            {item.followUpNumber}
                          </span>
                          <FollowUpTypeBadge type={item.type} />
                        </div>
                      </td>

                      {/* Title & Notes */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div
                          onClick={() => setSelectedFollowUp(item)}
                          className="font-bold text-slate-900 text-sm hover:text-blue-600 cursor-pointer line-clamp-1"
                        >
                          {item.title}
                        </div>
                        {item.description && (
                          <div className="text-slate-500 text-xs mt-0.5 line-clamp-1">
                            {item.description}
                          </div>
                        )}
                        {item.status === 'COMPLETED' && item.outcome && (
                          <div className="text-[11px] text-emerald-800 font-medium mt-1 line-clamp-1 bg-emerald-50 px-1.5 py-0.5 rounded">
                            Outcome: {item.outcome}
                          </div>
                        )}
                      </td>

                      {/* Related Entity */}
                      <td className="py-3.5 px-4">
                        {item.customer && (
                          <div className="flex items-center gap-1 font-semibold text-slate-900 line-clamp-1">
                            <Building2 className="w-3 h-3 text-blue-500 shrink-0" />
                            {item.customer.name}
                          </div>
                        )}
                        {item.quotation && (
                          <div className="flex items-center gap-1 text-emerald-700 font-medium text-[11px] mt-0.5">
                            <FileSpreadsheet className="w-3 h-3 shrink-0" />
                            {item.quotation.quotationNumber}
                          </div>
                        )}
                        {item.lead && (
                          <div className="flex items-center gap-1 text-amber-700 font-medium text-[11px] mt-0.5">
                            <Target className="w-3 h-3 shrink-0" />
                            {item.lead.customerName}
                          </div>
                        )}
                        {item.amcContract && (
                          <div className="flex items-center gap-1 text-purple-700 font-medium text-[11px] mt-0.5">
                            <ShieldCheck className="w-3 h-3 shrink-0" />
                            {item.amcContract.contractNumber}
                          </div>
                        )}
                      </td>

                      {/* Scheduled Date & Time */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">
                          {new Date(item.scheduledDate).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="text-slate-400 text-[11px] font-mono">
                          {item.scheduledTime || 'All Day'}
                        </div>
                      </td>

                      {/* Priority */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <FollowUpPriorityBadge priority={item.priority} />
                      </td>

                      {/* Assigned Employee */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{item.assignedEmployee?.fullName || 'Unassigned'}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <FollowUpStatusBadge status={item.status} scheduledDate={item.scheduledDate} />
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedFollowUp(item)}
                            className="px-2 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          >
                            View
                          </button>

                          {!isAccountantOffice && item.status === 'PENDING' && (
                            <>
                              <button
                                type="button"
                                onClick={() => setFollowUpToReschedule(item)}
                                className="px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              >
                                Reschedule
                              </button>
                              <button
                                type="button"
                                onClick={() => setFollowUpToComplete(item)}
                                className="px-2 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer border border-emerald-200"
                              >
                                Complete
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCancel(item)}
                                title="Cancel Follow-up"
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleDelete(item)}
                              title="Delete permanently"
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Footer */}
        {(pagination.totalPages ?? 0) > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div>
              Showing {followUps.length} of {pagination.total} follow-ups (Page {pagination.page} of {pagination.totalPages})
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-4 h-4 mr-0.5" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= (pagination.totalPages ?? 1)}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-0.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Modals */}
      <FollowUpModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      <FollowUpModal
        isOpen={!!followUpToEdit}
        followUpToEdit={followUpToEdit}
        onClose={() => setFollowUpToEdit(null)}
      />

      <FollowUpDetailModal
        isOpen={!!selectedFollowUp}
        followUp={selectedFollowUp}
        onClose={() => setSelectedFollowUp(null)}
        onOpenComplete={(item) => setFollowUpToComplete(item)}
        onOpenReschedule={(item) => setFollowUpToReschedule(item)}
        onOpenEdit={(item) => setFollowUpToEdit(item)}
      />

      <CompleteFollowUpModal
        isOpen={!!followUpToComplete}
        followUp={followUpToComplete}
        onClose={() => setFollowUpToComplete(null)}
      />

      <RescheduleFollowUpModal
        isOpen={!!followUpToReschedule}
        followUp={followUpToReschedule}
        onClose={() => setFollowUpToReschedule(null)}
      />
    </div>
  );
};

export default FollowUpManagementPage;
