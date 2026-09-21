import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../stores/authStore';
import { navigate } from '../../../app/router/navigation';
import { fieldService } from '../services/fieldService';
import { FsrStatusBadge } from '../components/FsrStatusBadge';
import { FsrCallTypeBadge } from '../components/FsrCallTypeBadge';
import { FsrListItem } from '../types/field-service.types';
import { canCreateFsr, canAccessMyVisits } from '../utils/fsrPermissions';
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
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-16">
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
              <Wrench size={13} />
              FIELD SERVICE OPERATIONS
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Field Service Management (FSR)
          </h1>
          <p className="text-sm text-slate-500">
            Manage customer UPS site visits, record live battery bank observations, track component replacements, and collect digital sign-offs.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={() => refetch()}
            className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 transition-colors cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw size={16} className={isFetching ? 'animate-spin text-blue-600' : ''} />
          </button>

          {canAccessMyVisits(user) && (
            <button
              type="button"
              onClick={() => navigate('/field-service/my-visits')}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Calendar size={15} className="text-slate-500" />
              <span>My Visits ({myVisitsCount})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate('/field-service/reports')}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Layers size={15} className="text-slate-500" />
            <span>All Reports</span>
          </button>

          {canCreateFsr(user) && (
            <button
              type="button"
              onClick={() => navigate('/field-service/new')}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/30 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Plus size={16} />
              <span>Create FSR</span>
            </button>
          )}
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total */}
        <div
          onClick={() => navigate('/field-service/reports')}
          className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-blue-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
              <Layers size={16} />
            </div>
          </div>
          <span className="text-2xl font-bold text-slate-900 mt-2">
            {isLoading ? '...' : totalFsrs}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5">All visits</span>
        </div>

        {/* Draft */}
        <div
          onClick={() => navigate('/field-service/reports?status=DRAFT')}
          className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-slate-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Draft</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <Clock size={16} />
            </div>
          </div>
          <span className="text-2xl font-bold text-slate-700 mt-2">
            {isLoading ? '...' : draftCount}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5">Pending start</span>
        </div>

        {/* In Progress */}
        <div
          onClick={() => navigate('/field-service/reports?status=IN_PROGRESS')}
          className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-blue-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">In Progress</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp size={16} />
            </div>
          </div>
          <span className="text-2xl font-bold text-blue-600 mt-2">
            {isLoading ? '...' : inProgressCount}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5">Active on site</span>
        </div>

        {/* Completed */}
        <div
          onClick={() => navigate('/field-service/reports?status=COMPLETED')}
          className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Completed</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <span className="text-2xl font-bold text-emerald-600 mt-2">
            {isLoading ? '...' : completedCount}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5">Signed & finished</span>
        </div>

        {/* Closed */}
        <div
          onClick={() => navigate('/field-service/reports?status=CLOSED')}
          className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-purple-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wider">Closed</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <FileCheck2 size={16} />
            </div>
          </div>
          <span className="text-2xl font-bold text-purple-600 mt-2">
            {isLoading ? '...' : closedCount}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5">Archived / Billed</span>
        </div>

        {/* Cancelled */}
        <div
          onClick={() => navigate('/field-service/reports?status=CANCELLED')}
          className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-rose-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Cancelled</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <Ban size={16} />
            </div>
          </div>
          <span className="text-2xl font-bold text-rose-600 mt-2">
            {isLoading ? '...' : cancelledCount}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5">Aborted visits</span>
        </div>
      </div>

      {/* Recent Service Reports Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Wrench size={16} className="text-blue-600" />
              Recent Service Reports
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Latest field inspections, breakdown visits, and preventive maintenance records
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/field-service/reports')}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 group cursor-pointer"
          >
            View All Reports <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
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
            <h3 className="text-sm font-bold text-slate-700">No Field Service Reports Found</h3>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Get started by creating your first field service report.
            </p>
            <button
              type="button"
              onClick={() => navigate('/field-service/new')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus size={14} /> Create FSR
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">FSR #</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Model / Serial</th>
                  <th className="px-4 py-3">Call Type</th>
                  <th className="px-4 py-3">Assigned FSE</th>
                  <th className="px-4 py-3">Visit Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {fsrs.slice(0, 10).map((item) => (
                  <tr
                    key={item.fsr.id}
                    onClick={() => navigate(`/field-service/${item.fsr.id}`)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-3.5 font-bold text-slate-900">
                      {item.fsr.fsrNumber}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-900">
                        {item.customer?.name || item.fsr.customerName}
                      </div>
                      {(item.destination?.name || item.fsr.customerPhone) && (
                        <div className="text-[11px] text-slate-400">
                          {item.destination?.name || item.fsr.customerPhone}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-slate-800">
                        {item.fsr.productModel || item.product?.name || 'UPS Unit'}
                      </div>
                      {item.fsr.productSerialNumber && (
                        <div className="text-[11px] text-slate-400 font-mono">
                          {item.fsr.productSerialNumber}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <FsrCallTypeBadge callType={item.fsr.callType} />
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">
                      {item.serviceEngineer?.fullName || (
                        <span className="italic text-slate-400">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">
                      {new Date(item.fsr.visitDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3.5">
                      <FsrStatusBadge status={item.fsr.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/field-service/${item.fsr.id}`);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-bold transition-colors cursor-pointer inline-flex items-center gap-1"
                      >
                        <Eye size={13} />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
