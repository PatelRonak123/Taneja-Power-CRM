import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Modal } from '../../../components/ui/Modal';
import { employeeService } from '../../admin/services/employeeService';
import { Employee } from '../../admin/types/employee.types';
import { fieldService } from '../services/fieldService';
import { useNotificationStore } from '../../../stores/notificationStore';
import { UserCheck, Loader2, AlertCircle } from 'lucide-react';

export interface FsrAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  fsrId?: string;
  currentEngineerName?: string;
  currentEngineerId?: string;
  onAssign?: (engineerId: string, remarks?: string) => Promise<void>;
}

export const FsrAssignModal: React.FC<FsrAssignModalProps> = ({
  isOpen,
  onClose,
  fsrId,
  currentEngineerName,
  currentEngineerId,
  onAssign,
}) => {
  const queryClient = useQueryClient();
  const { addToast } = useNotificationStore();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEngineerId, setSelectedEngineerId] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchEmployees();
      setSelectedEngineerId(currentEngineerId || '');
      setRemarks('');
      setError(null);
    }
  }, [isOpen, currentEngineerId]);

  const fetchEmployees = async () => {
    setIsLoadingEmployees(true);
    try {
      const res = await employeeService.getEmployees({ limit: 100 });
      if (res.data) {
        setEmployees(
          res.data.filter((e) => {
            if (e.id === currentEngineerId) return true;
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
          })
        );
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load employee list');
    } finally {
      setIsLoadingEmployees(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEngineerId) {
      setError('Please select a service engineer');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      if (onAssign) {
        await onAssign(selectedEngineerId, remarks);
      } else if (fsrId) {
        await fieldService.assignFse(fsrId, {
          serviceEngineerId: selectedEngineerId,
          remarks: remarks || undefined,
        });
        addToast({
          type: 'success',
          title: 'Engineer Assigned',
          message: 'Service Engineer has been successfully assigned to this report.',
        });
        queryClient.invalidateQueries({ queryKey: ['fsr', fsrId] });
        queryClient.invalidateQueries({ queryKey: ['fsr-activity', fsrId] });
        queryClient.invalidateQueries({ queryKey: ['fsrs-list'] });
        queryClient.invalidateQueries({ queryKey: ['fsrs-dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['my-fsr-visits'] });
      }
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to assign engineer');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Assign / Reassign Service Engineer">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {currentEngineerName && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-500 font-medium">Currently Assigned FSE</div>
              <div className="text-sm font-bold text-slate-900">{currentEngineerName}</div>
            </div>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <UserCheck size={18} />
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Select New Service Engineer <span className="text-red-500">*</span>
          </label>
          {isLoadingEmployees ? (
            <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
              <Loader2 size={14} className="animate-spin" /> Loading active engineers...
            </div>
          ) : (
            <select
              value={selectedEngineerId}
              onChange={(e) => setSelectedEngineerId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs md:text-sm bg-white border border-slate-300 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium cursor-pointer"
              required
            >
              <option value="" className="text-slate-500 bg-white">-- Choose Field Service Engineer --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id} className="text-slate-900 bg-white py-1">
                  {emp.fullName} {emp.designation ? `(${emp.designation})` : ''} - {emp.email}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Reassignment Reason / Remarks (Optional)
          </label>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            rows={3}
            placeholder="e.g., Handed over for breakdown emergency visit..."
            className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || isLoadingEmployees}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Saving...
              </>
            ) : (
              'Confirm Assignment'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
