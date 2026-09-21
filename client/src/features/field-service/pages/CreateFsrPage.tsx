import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { navigate } from '../../../app/router/navigation';
import { useAuthStore } from '../../../stores/authStore';
import { fieldService } from '../services/fieldService';
import { FsrForm } from '../components/FsrForm';
import { CreateFsrPayload } from '../types/field-service.types';
import { canCreateFsr } from '../utils/fsrPermissions';
import { useNotificationStore } from '../../../stores/notificationStore';
import { ArrowLeft, AlertCircle, ShieldAlert } from 'lucide-react';

export const CreateFsrPage: React.FC = () => {
  const { user } = useAuthStore();
  const { addToast } = useNotificationStore();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  // Permission Guard: Salespersons have read-only access to FSRs
  if (!canCreateFsr(user)) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center bg-white rounded-2xl border border-slate-200 shadow-sm mt-8">
        <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900">Access Restricted</h2>
        <p className="text-xs text-slate-500 mt-1 mb-5">
          You do not have permission to create Field Service Reports. Sales personnel have read-only access to completed reports.
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

  const createMutation = useMutation({
    mutationFn: (payload: CreateFsrPayload) => fieldService.createFsr(payload),
    onSuccess: (data) => {
      addToast({
        type: 'success',
        title: 'Field Service Report Created',
        message: `FSR ${data.data?.fsr.fsrNumber} has been successfully created.`,
      });
      queryClient.invalidateQueries({ queryKey: ['fsrs-list'] });
      queryClient.invalidateQueries({ queryKey: ['fsrs-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['my-fsr-visits'] });
      if (data.data?.fsr.id) {
        navigate(`/field-service/${data.data.fsr.id}`);
      } else {
        navigate('/field-service/reports');
      }
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error?.message || err.message || 'Failed to create Field Service Report';
      setServerError(msg);
      addToast({
        type: 'error',
        title: 'Submission Error',
        message: msg,
      });
    },
  });

  const handleSubmit = async (payload: CreateFsrPayload) => {
    setServerError(null);
    await createMutation.mutateAsync(payload);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Top Navigation / Breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/field-service/reports')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Service Reports
        </button>

        <div className="text-xs text-slate-400">
          Draft Field Service Site Visit Report – UPS
        </div>
      </div>

      {serverError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      {/* Main Form */}
      <FsrForm
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending}
      />
    </div>
  );
};
