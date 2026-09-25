import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../stores/authStore';
import { navigate } from '../../../app/router/navigation';
import { fieldService } from '../services/fieldService';
import { FsrStatusBadge } from '../components/FsrStatusBadge';
import { FsrCallTypeBadge } from '../components/FsrCallTypeBadge';
import { FsrListItem } from '../types/field-service.types';
import { canCreateFsr, canAccessMyVisits } from '../utils/fsrPermissions';
import { Button } from '../../../components/ui/Button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../../components/ui/table/Table';
import {
  Wrench,
  Clock,
  CheckCircle2,
  FileCheck2,
  Ban,
  Plus,
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  Loader2,
  Eye,
  RefreshCw,
} from 'lucide-react';

export const FsrDashboardPage: React.FC = () => {
  const { user } = useAuthStore();

  // Fetch recent FSRs
  const { data: fsrData, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['fsrs-dashboard'],
    queryFn: async () => {
      const res = await fieldService.getFsrs({ limit: 100 });
      return res.data || [];
    },
  });

  const fsrs: FsrListItem[] = fsrData || [];

  // Derived Metrics
  const totalFsrs = fsrs.length;
  const draftCount = fsrs.filter((f) => f.fsr.status === 'DRAFT').length;
  const inProgressCount = fsrs.filter((f) => f.fsr.status === 'IN_PROGRESS').length;
  const completedCount = fsrs.filter((f) => f.fsr.status === 'COMPLETED').length;
  const closedCount = fsrs.filter((f) => f.fsr.status === 'CLOSED').length;
  const cancelledCount = fsrs.filter((f) => f.fsr.status === 'CANCELLED').length;
  const myVisitsCount = fsrs.filter((f) => f.fsr.serviceEngineerId === user?.id).length;

  return (
    <div className="flex flex-col gap-5 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-1">
        <div>
          <h1 className="text-[22px] font-semibold text-slate-900 tracking-tight leading-tight">
            Field Service Management (FSR)
          </h1>
          <p className="text-[13px] text-slate-500 leading-relaxed mt-0.5">
            Manage customer UPS site visits, record live battery bank observations, track component replacements, and collect digital sign-offs.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <Button
            variant="outline"
            size="md"
            onClick={() => refetch()}
            title="Refresh list"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin text-blue-600' : ''} />
          </Button>

          {canAccessMyVisits(user) && (
            <Button
              variant="outline"
              size="md"
              onClick={() => navigate('/field-service/my-visits')}
            >
              <Calendar size={14} className="mr-1.5 text-slate-500" />
              <span>My Visits ({myVisitsCount})</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="md"
            onClick={() => navigate('/field-service/reports')}
          >
            <Layers size={14} className="mr-1.5 text-slate-500" />
            <span>All Reports</span>
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

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total */}
        <div
          onClick={() => navigate('/field-service/reports')}
          className="p-3.5 bg-card rounded-xl border border-border shadow-xs flex flex-col justify-between hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-slate-600">Total</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
              <Layers size={16} />
            </div>
          </div>
          <span className="text-[22px] font-bold text-slate-900 mt-2 tabular-nums">
            {isLoading ? '...' : totalFsrs}
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5">All visits</span>
        </div>

        {/* Draft */}
        <div
          onClick={() => navigate('/field-service/reports?status=DRAFT')}
          className="p-3.5 bg-card rounded-xl border border-border shadow-xs flex flex-col justify-between hover:border-slate-400 hover:shadow-sm transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-slate-600">Draft</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <Clock size={16} />
            </div>
          </div>
          <span className="text-[22px] font-bold text-slate-700 mt-2 tabular-nums">
            {isLoading ? '...' : draftCount}
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5">Pending start</span>
        </div>

        {/* In Progress */}
        <div
          onClick={() => navigate('/field-service/reports?status=IN_PROGRESS')}
          className="p-3.5 bg-card rounded-xl border border-border shadow-xs flex flex-col justify-between hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-blue-600">In Progress</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp size={16} />
            </div>
          </div>
          <span className="text-[22px] font-bold text-blue-600 mt-2 tabular-nums">
            {isLoading ? '...' : inProgressCount}
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5">Active on site</span>
        </div>

        {/* Completed */}
        <div
          onClick={() => navigate('/field-service/reports?status=COMPLETED')}
          className="p-3.5 bg-card rounded-xl border border-border shadow-xs flex flex-col justify-between hover:border-emerald-300 hover:shadow-sm transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-emerald-600">Completed</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <span className="text-[22px] font-bold text-emerald-600 mt-2 tabular-nums">
            {isLoading ? '...' : completedCount}
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5">Signed & finished</span>
        </div>

        {/* Closed */}
        <div
          onClick={() => navigate('/field-service/reports?status=CLOSED')}
          className="p-3.5 bg-card rounded-xl border border-border shadow-xs flex flex-col justify-between hover:border-purple-300 hover:shadow-sm transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-purple-600">Closed</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <FileCheck2 size={16} />
            </div>
          </div>
          <span className="text-[22px] font-bold text-purple-600 mt-2 tabular-nums">
            {isLoading ? '...' : closedCount}
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5">Archived / Billed</span>
        </div>

        {/* Cancelled */}
        <div
          onClick={() => navigate('/field-service/reports?status=CANCELLED')}
          className="p-3.5 bg-card rounded-xl border border-border shadow-xs flex flex-col justify-between hover:border-rose-300 hover:shadow-sm transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-rose-600">Cancelled</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <Ban size={16} />
            </div>
          </div>
          <span className="text-[22px] font-bold text-rose-600 mt-2 tabular-nums">
            {isLoading ? '...' : cancelledCount}
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5">Aborted visits</span>
        </div>
      </div>

      {/* Recent Service Reports Table Card */}
      <div className="bg-card rounded-xl border border-border shadow-xs overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-[14px] font-semibold text-slate-900 flex items-center gap-2">
              <Wrench size={16} className="text-blue-600" />
              Recent Service Reports
            </h2>
            <p className="text-[12px] text-slate-500 mt-0.5">
              Latest field inspections, breakdown visits, and preventive maintenance records
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/field-service/reports')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 group cursor-pointer"
          >
            <span>View All Reports</span>
            <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
            <Loader2 size={24} className="text-blue-600 animate-spin" />
            Loading service reports...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 text-xs">
            Failed to load service reports. Please try again.
          </div>
        ) : fsrs.length === 0 ? (
          <div className="p-12 text-center">
            <Wrench size={32} className="text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-700">No Field Service Reports Found</h3>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Get started by creating your first field service report.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/field-service/new')}
            >
              <Plus size={14} className="mr-1.5" />
              <span>Create FSR</span>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-30">FSR #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Model / Serial</TableHead>
                  <TableHead className="w-27.5">Call Type</TableHead>
                  <TableHead>Assigned FSE</TableHead>
                  <TableHead className="w-25">Visit Date</TableHead>
                  <TableHead className="w-27.5">Status</TableHead>
                  <TableHead className="w-17.5 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fsrs.slice(0, 10).map((item) => (
                  <TableRow
                    key={item.fsr.id}
                    onClick={() => navigate(`/field-service/${item.fsr.id}`)}
                    className="cursor-pointer"
                  >
                    <TableCell className="font-semibold text-slate-900">
                      {item.fsr.fsrNumber}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-900">
                        {item.customer?.name || item.fsr.customerName}
                      </div>
                      {(item.destination?.name || item.fsr.customerPhone) && (
                        <div className="text-[11px] text-slate-500">
                          {item.destination?.name || item.fsr.customerPhone}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-800">
                        {item.fsr.productModel || item.product?.name || 'UPS Unit'}
                      </div>
                      {item.fsr.productSerialNumber && (
                        <div className="text-[11px] text-slate-500 font-mono">
                          {item.fsr.productSerialNumber}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <FsrCallTypeBadge callType={item.fsr.callType} />
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {item.serviceEngineer?.fullName || (
                        <span className="italic text-slate-400">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-600 tabular-nums">
                      {new Date(item.fsr.visitDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <FsrStatusBadge status={item.fsr.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/field-service/${item.fsr.id}`);
                        }}
                        className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-xs font-medium transition-colors cursor-pointer inline-flex items-center gap-1"
                      >
                        <Eye size={13} />
                        <span>View</span>
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
};
