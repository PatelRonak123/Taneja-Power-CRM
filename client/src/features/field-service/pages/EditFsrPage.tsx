import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { navigate, useCurrentPath } from '../../../app/router/navigation';
import { useAuthStore } from '../../../stores/authStore';
import { fieldService } from '../services/fieldService';
import { FsrForm } from '../components/FsrForm';
import { UpdateFsrPayload } from '../types/field-service.types';
import { canEditFsr } from '../utils/fsrPermissions';
import { useNotificationStore } from '../../../stores/notificationStore';
import { ArrowLeft, Loader2, AlertCircle, ShieldAlert } from 'lucide-react';

interface EditFsrPageProps {
  id?: string;
}

export const EditFsrPage: React.FC<EditFsrPageProps> = ({ id: propId }) => {
  const currentPath = useCurrentPath();
  const { user } = useAuthStore();
  const { addToast } = useNotificationStore();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  // Extract ID from prop or URL path (e.g. /field-service/123/edit)
  const id = propId || currentPath.split('/')[2];

  const { data: fsrData, isLoading, error } = useQuery({
    queryKey: ['fsr', id],
    queryFn: async () => {
      if (!id) throw new Error('Missing FSR ID');
      const res = await fieldService.getFsrById(id);
      return res.data;
    },
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateFsrPayload) => fieldService.updateFsr(id, payload),
    onSuccess: (data) => {
      addToast({
        type: 'success',
        title: 'Report Updated',
        message: `FSR ${data.data?.fsr.fsrNumber} has been successfully updated.`,
      });
      queryClient.invalidateQueries({ queryKey: ['fsr', id] });
      queryClient.invalidateQueries({ queryKey: ['fsrs-list'] });
      queryClient.invalidateQueries({ queryKey: ['fsrs-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['my-fsr-visits'] });
      navigate(`/field-service/${id}`);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error?.message || err.message || 'Failed to update Field Service Report';
      setServerError(msg);
      addToast({
        type: 'error',
        title: 'Update Error',
        message: msg,
      });
    },
  });

  if (isLoading) {
    return (
      <div className="p-16 text-center">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500">Loading service report details...</p>
      </div>
    );
  }

  if (error || !fsrData) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center bg-white rounded-2xl border border-slate-200 shadow-sm mt-8">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900">Service Report Not Found</h2>
        <p className="text-xs text-slate-500 mt-1 mb-5">
          The requested report does not exist or you do not have permission to view it.
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

  // Permission Check
  if (!canEditFsr(user, fsrData.fsr)) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center bg-white rounded-2xl border border-slate-200 shadow-sm mt-8">
        <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900">Access Restricted</h2>
        <p className="text-xs text-slate-500 mt-1 mb-5">
          You do not have permission to edit this service visit. Only the assigned Field Service Engineer or a Service Manager can edit active reports.
        </p>
        <button
          onClick={() => navigate(`/field-service/${id}`)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-2 cursor-pointer shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" /> View Read-Only Report
        </button>
      </div>
    );
  }

  const handleSubmit = async (payload: any) => {
    setServerError(null);
    await updateMutation.mutateAsync(payload);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(`/field-service/${id}`)}
          className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Report View
        </button>

        <div className="text-xs text-neutral-400">
          Editing FSR: <span className="font-bold text-neutral-800 dark:text-neutral-200">{fsrData.fsr.fsrNumber}</span>
        </div>
      </div>

      {serverError && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      {/* Main Form Pre-populated */}
      <FsrForm
        initialData={fsrData}
        isEditing={true}
        onSubmit={handleSubmit}
        isSubmitting={updateMutation.isPending}
      />
    </div>
  );
};
