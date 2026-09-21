import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../stores/authStore';
import { navigate } from '../../../app/router/navigation';
import { fieldService } from '../services/fieldService';
import { FsrStatusBadge } from '../components/FsrStatusBadge';
import { FsrCallTypeBadge } from '../components/FsrCallTypeBadge';
import { useNotificationStore } from '../../../stores/notificationStore';
import { FsrListItem, FsrStatus } from '../types/field-service.types';
import { canAccessMyVisits, canCreateFsr } from '../utils/fsrPermissions';
import {
  Calendar,
  Clock,
  CheckCircle2,
  TrendingUp,
  FileCheck2,
  Play,
  Eye,
  Edit3,
  MapPin,
  RefreshCw,
  Plus,
  ShieldAlert,
  ArrowLeft,
} from 'lucide-react';

export const MyVisitsPage: React.FC = () => {
  const { user } = useAuthStore();
  const { addToast } = useNotificationStore();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'ALL' | 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'CLOSED'>('ALL');

  // Route Guard: Salespersons do not have access to FSE schedule
  if (!canAccessMyVisits(user)) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center bg-white rounded-2xl border border-slate-200 shadow-sm mt-8">
        <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900">Access Restricted</h2>
        <p className="text-xs text-slate-500 mt-1 mb-5">
          The service visits schedule is designed for Field Service Engineers and Service Managers. Sales personnel have access to completed reports via the Reports catalog.
        </p>
        <button
          onClick={() => navigate('/field-service/reports')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-2 cursor-pointer shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Service Reports
        </button>
      </div>
    );
  }

  const { data: fsrResponse, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['my-fsr-visits', user?.id, activeTab],
    queryFn: async () => {
      if (!user?.id) return { data: [] };
      const params: any = {
        serviceEngineerId: user.id,
        limit: 100,
      };
      if (activeTab !== 'ALL') {
        params.status = activeTab as FsrStatus;
      }
      return fieldService.getFsrs(params);
    },
    enabled: !!user?.id,
  });

  const visits: FsrListItem[] = fsrResponse?.data || [];

  // Mutations
  const startMutation = useMutation({
    mutationFn: (id: string) => fieldService.startFsr(id),
    onSuccess: (data) => {
      addToast({
        type: 'success',
        title: 'Visit Started',
        message: `FSR ${data.data?.fsr.fsrNumber} is now IN_PROGRESS.`,
      });
      queryClient.invalidateQueries({ queryKey: ['my-fsr-visits'] });
      queryClient.invalidateQueries({ queryKey: ['fsrs-dashboard'] });
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
        message: `FSR ${data.data?.fsr.fsrNumber} marked as COMPLETED.`,
      });
      queryClient.invalidateQueries({ queryKey: ['my-fsr-visits'] });
      queryClient.invalidateQueries({ queryKey: ['fsrs-dashboard'] });
    },
    onError: (err: any) => {
      addToast({
        type: 'error',
        title: 'Action Failed',
        message: err.response?.data?.error?.message || 'Could not complete service visit',
      });
    },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60 mb-2">
            <Calendar className="w-3.5 h-3.5" />
            <span>Field Service Engineer Schedule</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            My Service Visits
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Logged in as <span className="font-semibold text-slate-800">{user?.fullName || user?.email}</span> • Assigned UPS visits & reports
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
            title="Refresh visits"
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

      {/* Status Filter Tabs */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-2 overflow-x-auto">
        {[
          { id: 'ALL', label: 'All Visits', icon: Calendar },
          { id: 'DRAFT', label: 'Draft / Upcoming', icon: Clock },
          { id: 'IN_PROGRESS', label: 'In Progress (On Site)', icon: TrendingUp },
          { id: 'COMPLETED', label: 'Completed', icon: CheckCircle2 },
          { id: 'CLOSED', label: 'Closed / History', icon: FileCheck2 },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-blue-50 text-blue-700 border border-blue-200/80 shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 border border-transparent'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Visits List */}
      {isLoading ? (
        <div className="p-16 text-center bg-white rounded-2xl border border-slate-200">
          <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs text-slate-500">Loading your assigned visits...</p>
        </div>
      ) : visits.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-2xl border border-slate-200 shadow-xs">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">
            No service visits found
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            You currently have no service reports matching this filter.
          </p>
          {canCreateFsr(user) && (
            <button
              onClick={() => navigate('/field-service/new')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Create New Report
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {visits.map((item) => (
            <div
              key={item.fsr.id}
              onClick={() => navigate(`/field-service/${item.fsr.id}`)}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group space-y-4"
            >
              {/* Card Header */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <span className="font-mono font-bold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60">
                    {item.fsr.fsrNumber}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <FsrCallTypeBadge callType={item.fsr.callType} />
                    <FsrStatusBadge status={item.fsr.status} />
                  </div>
                </div>

                <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors">
                  {item.customer?.name || item.fsr.customerName}
                </h3>

                {(item.destination?.name || item.fsr.customerAddress) && (
                  <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1 truncate">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{item.destination?.name || item.fsr.customerAddress}</span>
                  </p>
                )}
              </div>

              {/* Equipment & Date Info */}
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-slate-700">
                  <span className="text-slate-400">Model:</span>
                  <span className="font-medium">{item.fsr.productModel || item.product?.name || 'UPS Unit'}</span>
                </div>
                <div className="flex items-center justify-between text-slate-700">
                  <span className="text-slate-400">Serial No:</span>
                  <span className="font-mono text-[11px]">{item.fsr.productSerialNumber || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between text-slate-700">
                  <span className="text-slate-400">Visit Date:</span>
                  <span className="font-medium">{new Date(item.fsr.visitDate).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div
                onClick={(e) => e.stopPropagation()}
                className="flex items-center justify-between pt-2 border-t border-slate-100"
              >
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/field-service/${item.fsr.id}`)}
                    className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-xs font-semibold border border-slate-200/80 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" /> Details
                  </button>

                  {item.fsr.status !== 'CLOSED' && item.fsr.status !== 'CANCELLED' && (
                    <button
                      onClick={() => navigate(`/field-service/${item.fsr.id}/edit`)}
                      className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-xs font-semibold border border-slate-200/80 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Edit
                    </button>
                  )}
                </div>

                {/* Workflow Transitions */}
                {item.fsr.status === 'DRAFT' && (
                  <button
                    onClick={() => startMutation.mutate(item.fsr.id)}
                    disabled={startMutation.isPending}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" /> Start Visit
                  </button>
                )}

                {item.fsr.status === 'IN_PROGRESS' && (
                  <button
                    onClick={() => completeMutation.mutate(item.fsr.id)}
                    disabled={completeMutation.isPending}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Complete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
