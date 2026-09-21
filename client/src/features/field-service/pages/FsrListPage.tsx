import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../stores/authStore';
import { navigate } from '../../../app/router/navigation';
import { fieldService } from '../services/fieldService';
import { employeeService } from '../../admin/services/employeeService';
import { FsrStatusBadge } from '../components/FsrStatusBadge';
import { FsrCallTypeBadge } from '../components/FsrCallTypeBadge';
import { FsrAssignModal } from '../components/FsrAssignModal';
import { useNotificationStore } from '../../../stores/notificationStore';
import {
  canCreateFsr,
  canEditFsr,
  canStartFsr,
  canCompleteFsr,
  canCloseFsr,
  canAssignFse,
  canDownloadFsr,
  isAdminOrManager as checkIsAdminOrManager,
} from '../utils/fsrPermissions';
import {
  FsrListItem,
  FsrStatus,
  FsrCallType,
} from '../types/field-service.types';
import {
  Search,
  Plus,
  Wrench,
  Play,
  CheckCircle,
  FileCheck,
  UserCheck,
  Eye,
  Edit3,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Download,
  Loader2,
  X,
} from 'lucide-react';

export const FsrListPage: React.FC = () => {
  const { user } = useAuthStore();
  const { addToast } = useNotificationStore();
  const queryClient = useQueryClient();

  const isAdminOrManager = checkIsAdminOrManager(user);

  // Filters State
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('ALL');
  const [callType, setCallType] = useState<string>('ALL');
  const [serviceEngineerId, setServiceEngineerId] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const limit = 15;

  // Selected FSR for Assignment Modal
  const [assignModalFsr, setAssignModalFsr] = useState<FsrListItem | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownloadPdf = async (e: React.MouseEvent, id: string, fsrNumber: string) => {
    e.stopPropagation();
    try {
      setDownloadingId(id);
      await fieldService.downloadFsrPdf(id, fsrNumber);
      addToast({
        type: 'success',
        title: 'PDF Downloaded',
        message: `FSR ${fsrNumber} downloaded successfully.`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Download Failed',
        message: err.response?.data?.error?.message || 'Could not download PDF report',
      });
    } finally {
      setDownloadingId(null);
    }
  };

  // Parse initial query params from URL if any
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlStatus = urlParams.get('status');
      if (urlStatus) {
        setStatus(urlStatus);
      }
    }
  }, []);

  // Fetch Engineers for filter dropdowns
  const { data: engineers } = useQuery({
    queryKey: ['engineers-list-filter'],
    queryFn: async () => {
      const res = await employeeService.getEmployees({ limit: 100 });
      return res.data || [];
    },
    enabled: isAdminOrManager,
  });

  // Query FSR list with active filters
  const { data: fsrResponse, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['fsrs-list', search, status, callType, serviceEngineerId, page, limit],
    queryFn: async () => {
      const params: any = {
        page,
        limit,
      };
      if (search.trim()) params.search = search.trim();
      if (status !== 'ALL') params.status = status as FsrStatus;
      if (callType !== 'ALL') params.callType = callType as FsrCallType;
      if (serviceEngineerId !== 'ALL') params.serviceEngineerId = serviceEngineerId;

      const res = await fieldService.getFsrs(params);
      return res;
    },
  });

  const fsrs: FsrListItem[] = fsrResponse?.data || [];
  const meta = fsrResponse?.meta;
  const totalPages = meta?.totalPages || 1;

  // Lifecycle Mutations
  const startMutation = useMutation({
    mutationFn: (id: string) => fieldService.startFsr(id),
    onSuccess: (data) => {
      addToast({
        type: 'success',
        title: 'Visit Started',
        message: `FSR ${data.data?.fsr.fsrNumber} is now IN_PROGRESS.`,
      });
      queryClient.invalidateQueries({ queryKey: ['fsrs-list'] });
      queryClient.invalidateQueries({ queryKey: ['fsrs-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['my-fsr-visits'] });
    },
    onError: (err: any) => {
      addToast({
        type: 'error',
        title: 'Action Failed',
        message: err.response?.data?.error?.message || 'Could not start service visit',
      });
    },
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => fieldService.completeFsr(id),
    onSuccess: (data) => {
      addToast({
        type: 'success',
        title: 'Visit Completed',
        message: `FSR ${data.data?.fsr.fsrNumber} has been marked as COMPLETED.`,
      });
      queryClient.invalidateQueries({ queryKey: ['fsrs-list'] });
      queryClient.invalidateQueries({ queryKey: ['fsrs-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['my-fsr-visits'] });
    },
    onError: (err: any) => {
      addToast({
        type: 'error',
        title: 'Action Failed',
        message: err.response?.data?.error?.message || 'Could not complete service visit',
      });
    },
  });

  const closeMutation = useMutation({
    mutationFn: (id: string) => fieldService.closeFsr(id),
    onSuccess: (data) => {
      addToast({
        type: 'success',
        title: 'FSR Closed',
        message: `FSR ${data.data?.fsr.fsrNumber} has been officially CLOSED.`,
      });
      queryClient.invalidateQueries({ queryKey: ['fsrs-list'] });
      queryClient.invalidateQueries({ queryKey: ['fsrs-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['my-fsr-visits'] });
    },
    onError: (err: any) => {
      addToast({
        type: 'error',
        title: 'Action Failed',
        message: err.response?.data?.error?.message || 'Could not close FSR',
      });
    },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60 mb-2">
            <Wrench className="w-3.5 h-3.5" />
            <span>Field Service & Inspections</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Field Service Reports
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track, filter, and inspect all customer site visit reports and battery logs
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          {canCreateFsr(user) && (
            <button
              onClick={() => navigate('/field-service/new')}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/30 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Create FSR
            </button>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search FSR #, customer, serial..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all"
            >
              <option value="ALL">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CLOSED">Closed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Call Type Filter */}
          <div>
            <select
              value={callType}
              onChange={(e) => {
                setCallType(e.target.value);
                setPage(1);
              }}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all"
            >
              <option value="ALL">All Call Types</option>
              <option value="BD">Breakdown (BD)</option>
              <option value="PM">Preventive Maintenance (PM)</option>
              <option value="INSTALLATION">Installation</option>
              <option value="COURTESY">Courtesy</option>
            </select>
          </div>

          {/* Engineer Filter (Admin/Manager) */}
          {isAdminOrManager && (
            <div>
              <select
                value={serviceEngineerId}
                onChange={(e) => {
                  setServiceEngineerId(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all"
              >
                <option value="ALL">All Field Engineers</option>
                {engineers?.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Main FSR Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-16 text-center">
            <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs text-slate-500">Loading service reports...</p>
          </div>
        ) : fsrs.length === 0 ? (
          <div className="p-16 text-center">
            <Wrench className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">
              No matching service reports found
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5">
              Try adjusting your search query, status filters, or create a new Field Service Report.
            </p>
            <button
              onClick={() => navigate('/field-service/new')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Create FSR
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5 font-bold uppercase tracking-wider text-[11px]">FSR #</th>
                  <th className="px-4 py-3.5 font-bold uppercase tracking-wider text-[11px]">Customer</th>
                  <th className="px-4 py-3.5 font-bold uppercase tracking-wider text-[11px]">Product / Serial</th>
                  <th className="px-4 py-3.5 font-bold uppercase tracking-wider text-[11px]">Call Type</th>
                  <th className="px-4 py-3.5 font-bold uppercase tracking-wider text-[11px]">Assigned FSE</th>
                  <th className="px-4 py-3.5 font-bold uppercase tracking-wider text-[11px]">Visit Date</th>
                  <th className="px-4 py-3.5 font-bold uppercase tracking-wider text-[11px]">Status</th>
                  <th className="px-5 py-3.5 text-right font-bold uppercase tracking-wider text-[11px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fsrs.map((item) => (
                  <tr
                    key={item.fsr.id}
                    onClick={() => navigate(`/field-service/${item.fsr.id}`)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                  >
                    <td className="px-5 py-4 font-bold text-slate-900">
                      {item.fsr.fsrNumber}
                    </td>

                    <td className="px-4 py-4">
                      <div className="font-semibold text-slate-900">
                        {item.customer?.name || item.fsr.customerName}
                      </div>
                      {(item.destination?.name || item.fsr.customerAddress) && (
                        <div className="text-[11px] text-slate-500 truncate max-w-xs">
                          {item.destination?.name || item.fsr.customerAddress}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      <div className="text-slate-800 font-medium">
                        {item.fsr.productModel || item.product?.name || 'UPS Unit'}
                      </div>
                      {item.fsr.productSerialNumber && (
                        <div className="text-[11px] text-slate-400 font-mono">
                          S/N: {item.fsr.productSerialNumber}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      <FsrCallTypeBadge callType={item.fsr.callType} />
                    </td>

                    <td className="px-4 py-4">
                      {item.serviceEngineer?.fullName ? (
                        <div className="font-medium text-slate-700">
                          {item.serviceEngineer.fullName}
                        </div>
                      ) : (
                        <span className="text-[11px] italic text-slate-400">Unassigned</span>
                      )}
                    </td>

                    <td className="px-4 py-4 text-slate-600">
                      {new Date(item.fsr.visitDate).toLocaleDateString()}
                    </td>

                    <td className="px-4 py-4">
                      <FsrStatusBadge status={item.fsr.status} />
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center justify-end gap-1.5"
                      >
                        {/* View */}
                        <button
                          onClick={() => navigate(`/field-service/${item.fsr.id}`)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Download PDF */}
                        {canDownloadFsr(user, item.fsr) && (
                          <button
                            onClick={(e) =>
                              handleDownloadPdf(
                                e,
                                item.fsr.id,
                                item.fsr.fsrNumber
                              )
                            }
                            disabled={downloadingId === item.fsr.id}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
                            title="Download Official PDF"
                          >
                            {downloadingId === item.fsr.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                          </button>
                        )}

                        {/* Edit */}
                        {canEditFsr(user, item.fsr) && (
                          <button
                            onClick={() => navigate(`/field-service/${item.fsr.id}/edit`)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Edit Report"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}

                        {/* Start Visit */}
                        {canStartFsr(user, item.fsr) && (
                          <button
                            onClick={() => startMutation.mutate(item.fsr.id)}
                            disabled={startMutation.isPending}
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                            title="Start Service Visit"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}

                        {/* Complete Visit */}
                        {canCompleteFsr(user, item.fsr) && (
                          <button
                            onClick={() => completeMutation.mutate(item.fsr.id)}
                            disabled={completeMutation.isPending}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Complete Visit"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}

                        {/* Close FSR (Admin) */}
                        {canCloseFsr(user, item.fsr) && (
                          <button
                            onClick={() => closeMutation.mutate(item.fsr.id)}
                            disabled={closeMutation.isPending}
                            className="p-1.5 rounded-lg text-purple-600 hover:bg-purple-50 transition-colors cursor-pointer"
                            title="Close Report"
                          >
                            <FileCheck className="w-4 h-4" />
                          </button>
                        )}

                        {/* Reassign (Admin/Manager) */}
                        {canAssignFse(user, item.fsr) && (
                          <button
                            onClick={() => setAssignModalFsr(item)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Assign / Reassign Engineer"
                          >
                            <UserCheck className="w-4 h-4" />
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

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing Page {page} of {totalPages} ({meta?.total || 0} total reports)
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-bold text-slate-800">
                {page}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Assignment Modal */}
      {assignModalFsr && (
        <FsrAssignModal
          isOpen={!!assignModalFsr}
          onClose={() => setAssignModalFsr(null)}
          fsrId={assignModalFsr.fsr.id}
          currentEngineerId={assignModalFsr.fsr.serviceEngineerId || undefined}
          currentEngineerName={assignModalFsr.serviceEngineer?.fullName || undefined}
        />
      )}
    </div>
  );
};
