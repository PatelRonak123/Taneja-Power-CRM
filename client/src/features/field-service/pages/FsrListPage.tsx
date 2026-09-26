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
import { SearchInput } from '../../../components/ui/SearchInput';
import {
  Plus,
  Wrench,
  Play,
  CheckCircle,
  FileCheck,
  UserCheck,
Eye,
  Edit3,
  RefreshCw,
  Download,
  Loader2,
} from 'lucide-react';
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
      const list = res.data || [];
      return list.filter((e) => {
        if (e.status !== 'ACTIVE') return false;
        if (e.workType === 'FIELD') return true;
        if (e.workType === 'OFFICE') return false;
        const des = (e.designation || '').toLowerCase();
        if (
          des.includes('office') ||
          des.includes('hr') ||
          des.includes('accountant') ||
          des.includes('admin') ||
          des.includes('operations')
        ) {
          return false;
        }
        return true;
      });
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
    <div className="space-y-5 max-w-7xl mx-auto pb-10">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-5 rounded-xl border border-border shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200/60 mb-1">
            <Wrench size={12} className="text-blue-600" />
            <span>Field Service & Inspections</span>
          </div>
          <h1 className="text-[22px] font-semibold text-slate-900 tracking-tight leading-tight">
            Field Service Reports
          </h1>
          <p className="text-[13px] text-slate-500 leading-relaxed mt-0.5">
            Track, filter, and inspect all customer site visit reports and battery logs
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="md"
            onClick={() => refetch()}
            disabled={isFetching}
            title="Refresh list"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          </Button>

          {canCreateFsr(user) && (
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate('/field-service/new')}
            >
              <Plus size={15} className="mr-1.5" />
              <span>Create FSR</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-card p-3.5 rounded-xl border border-border shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <SearchInput
            placeholder="Search FSR #, customer, serial..."
            value={search}
            onChange={setSearch}
            onResetPage={() => setPage(1)}
            isLoading={isFetching}
          />

          {/* Status Filter */}
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="h-9 px-2.5 bg-white border border-border rounded-lg text-[13px] font-medium text-slate-700 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="CLOSED">Closed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          {/* Call Type Filter */}
          <select
            value={callType}
            onChange={(e) => {
              setCallType(e.target.value);
              setPage(1);
            }}
            className="h-9 px-2.5 bg-white border border-border rounded-lg text-[13px] font-medium text-slate-700 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 cursor-pointer"
          >
            <option value="ALL">All Call Types</option>
            <option value="BD">Breakdown (BD)</option>
            <option value="PM">Preventive Maintenance (PM)</option>
            <option value="INSTALLATION">Installation</option>
            <option value="COURTESY">Courtesy</option>
          </select>

          {/* Engineer Filter (Admin/Manager) */}
          {isAdminOrManager && (
            <select
              value={serviceEngineerId}
              onChange={(e) => {
                setServiceEngineerId(e.target.value);
                setPage(1);
              }}
              className="h-9 px-2.5 bg-white border border-border rounded-lg text-[13px] font-medium text-slate-700 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 cursor-pointer truncate"
            >
              <option value="ALL">All Field Engineers</option>
              {engineers?.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.fullName}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Main FSR Table */}
      <div className="bg-card rounded-xl border border-border shadow-xs overflow-hidden flex flex-col w-full">
        <div className="w-full overflow-x-auto">
          <Table density="standard" className="min-w-275">
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-35">FSR #</TableHead>
                <TableHead className="min-w-45">Customer</TableHead>
                <TableHead className="min-w-40">Product / Serial</TableHead>
                <TableHead align="center" className="min-w-32.5">Call Type</TableHead>
                <TableHead className="min-w-35">Assigned FSE</TableHead>
                <TableHead className="min-w-27.5">Visit Date</TableHead>
                <TableHead align="center" className="min-w-35">Status</TableHead>
                <TableHead align="right" className="min-w-45">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableLoadingState columns={8} rows={6} />
              ) : fsrs.length === 0 ? (
                <TableEmptyState
                  colSpan={8}
                  icon={<Wrench size={24} />}
                  title="No matching service reports found"
                  description="Try adjusting your search query, status filters, or create a new Field Service Report."
                  action={
                    canCreateFsr(user) ? (
                      <button
                        type="button"
                        onClick={() => navigate('/field-service/new')}
                        className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium cursor-pointer shadow-xs"
                      >
                        Create FSR
                      </button>
                    ) : undefined
                  }
                />
              ) : (
                fsrs.map((item) => (
                  <TableRow
                    key={item.fsr.id}
                    onClick={() => navigate(`/field-service/${item.fsr.id}`)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                  >
                    <TableCell className="align-middle font-semibold text-slate-900 text-xs">
                      {item.fsr.fsrNumber}
                    </TableCell>

                    <TableCell className="align-middle">
                      <div className="font-medium text-slate-900 text-xs truncate">
                        {item.customer?.name || item.fsr.customerName}
                      </div>
                      {(item.destination?.name || item.fsr.customerAddress) && (
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          {item.destination?.name || item.fsr.customerAddress}
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="align-middle">
                      <div className="text-slate-800 font-medium text-xs truncate">
                        {item.fsr.productModel || item.product?.name || 'UPS Unit'}
                      </div>
                      {item.fsr.productSerialNumber && (
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          S/N: {item.fsr.productSerialNumber}
                        </div>
                      )}
                    </TableCell>

                    <TableCell align="center" className="align-middle whitespace-nowrap">
                      <FsrCallTypeBadge callType={item.fsr.callType} />
                    </TableCell>

                    <TableCell className="align-middle">
                      {item.serviceEngineer?.fullName ? (
                        <div className="font-medium text-slate-700 text-xs truncate">
                          {item.serviceEngineer.fullName}
                        </div>
                      ) : (
                        <span className="text-[11px] italic text-slate-400">Unassigned</span>
                      )}
                    </TableCell>

                    <TableCell className="align-middle text-slate-600 text-xs whitespace-nowrap tabular-nums">
                      {new Date(item.fsr.visitDate).toLocaleDateString()}
                    </TableCell>

                    <TableCell align="center" className="align-middle whitespace-nowrap">
                      <FsrStatusBadge status={item.fsr.status} />
                    </TableCell>

                    <TableCell align="right" className="align-middle whitespace-nowrap min-w-45" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5 shrink-0">
                        {/* View */}
                        <button
                          type="button"
                          onClick={() => navigate(`/field-service/${item.fsr.id}`)}
                          className="p-1.5 rounded-md border border-border bg-white hover:bg-slate-50 text-slate-500 hover:text-blue-600 transition-colors cursor-pointer shadow-2xs"
                          title="View Details"
                          aria-label="View Details"
                        >
                          <Eye size={13} />
                        </button>

                        {/* Download PDF */}
                        {canDownloadFsr(user, item.fsr) && (
                          <button
                            type="button"
                            onClick={(e) =>
                              handleDownloadPdf(
                                e,
                                item.fsr.id,
                                item.fsr.fsrNumber
                              )
                            }
                            disabled={downloadingId === item.fsr.id}
                            className="p-1.5 rounded-md border border-border bg-white hover:bg-slate-50 text-slate-500 hover:text-blue-600 transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
                            title="Download Official PDF"
                            aria-label="Download PDF"
                          >
                            {downloadingId === item.fsr.id ? (
                              <Loader2 size={13} className="animate-spin text-blue-600" />
                            ) : (
                              <Download size={13} />
                            )}
                          </button>
                        )}

                        {/* Edit */}
                        {canEditFsr(user, item.fsr) && (
                          <button
                            type="button"
                            onClick={() => navigate(`/field-service/${item.fsr.id}/edit`)}
                            className="p-1.5 rounded-md border border-border bg-white hover:bg-slate-50 text-slate-500 hover:text-blue-600 transition-colors cursor-pointer shadow-2xs"
                            title="Edit Report"
                            aria-label="Edit Report"
                          >
                            <Edit3 size={13} />
                          </button>
                        )}

                        {/* Start Visit */}
                        {canStartFsr(user, item.fsr) && (
                          <button
                            type="button"
                            onClick={() => startMutation.mutate(item.fsr.id)}
                            disabled={startMutation.isPending}
                            className="p-1.5 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors cursor-pointer shadow-2xs"
                            title="Start Service Visit"
                            aria-label="Start Visit"
                          >
                            <Play size={13} />
                          </button>
                        )}

                        {/* Complete Visit */}
                        {canCompleteFsr(user, item.fsr) && (
                          <button
                            type="button"
                            onClick={() => completeMutation.mutate(item.fsr.id)}
                            disabled={completeMutation.isPending}
                            className="p-1.5 rounded-md border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors cursor-pointer shadow-2xs"
                            title="Complete Visit"
                            aria-label="Complete Visit"
                          >
                            <CheckCircle size={13} />
                          </button>
                        )}

                        {/* Close FSR (Admin) */}
                        {canCloseFsr(user, item.fsr) && (
                          <button
                            type="button"
                            onClick={() => closeMutation.mutate(item.fsr.id)}
                            disabled={closeMutation.isPending}
                            className="p-1.5 rounded-md border border-purple-200 bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors cursor-pointer shadow-2xs"
                            title="Close Report"
                            aria-label="Close Report"
                          >
                            <FileCheck size={13} />
                          </button>
                        )}

                        {/* Reassign (Admin/Manager) */}
                        {canAssignFse(user, item.fsr) && (
                          <button
                            type="button"
                            onClick={() => setAssignModalFsr(item)}
                            className="p-1.5 rounded-md border border-border bg-white hover:bg-slate-50 text-slate-500 hover:text-blue-600 transition-colors cursor-pointer shadow-2xs"
                            title="Assign / Reassign Engineer"
                            aria-label="Assign Engineer"
                          >
                            <UserCheck size={13} />
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

        {/* Pagination Bar */}
        {!isLoading && totalPages > 1 && (
          <TablePagination
            page={page}
            totalPages={totalPages}
            totalCount={meta?.total || 0}
            limit={limit}
            onPageChange={setPage}
            entityName="reports"
          />
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
