import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Edit2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { AttendanceItem } from '../types/attendance.types';
import { attendanceService } from '../services/attendanceService';

interface AttendanceEditModalProps {
  record: AttendanceItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AttendanceEditModal: React.FC<AttendanceEditModalProps> = ({
  record,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [status, setStatus] = useState<'CHECKED_IN' | 'CHECKED_OUT'>('CHECKED_IN');
  const [checkInAt, setCheckInAt] = useState<string>('');
  const [checkOutAt, setCheckOutAt] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (record) {
      setStatus(record.status as 'CHECKED_IN' | 'CHECKED_OUT');
      setCheckInAt(record.checkInAt ? new Date(record.checkInAt).toISOString().slice(0, 16) : '');
      setCheckOutAt(record.checkOutAt ? new Date(record.checkOutAt).toISOString().slice(0, 16) : '');
      setNotes(record.notes || '');
      setError(null);
    }
  }, [record]);

  if (!isOpen || !record) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload: Partial<AttendanceItem> = {
        status,
        checkInAt: checkInAt ? new Date(checkInAt).toISOString() : record.checkInAt,
        checkOutAt: checkOutAt ? new Date(checkOutAt).toISOString() : (status === 'CHECKED_OUT' ? new Date().toISOString() : null),
        notes: notes.trim() || undefined,
      };

      const res = await (attendanceService as any).updateAttendance(record.id, payload);
      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.error?.message || 'Failed to update attendance record');
      }
    } catch (err: any) {
      setError(err?.message || 'An error occurred while updating attendance record');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-hidden select-none">
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300 animate-fade-in"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 z-[100]">
        <div
          className="w-screen max-w-lg bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-slide-in-right overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white/95 backdrop-blur-md sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200/60 flex items-center justify-center">
                <Edit2 size={20} />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                  Edit Attendance Log
                </h2>
                <p className="text-xs text-slate-500">
                  Update shift timestamps, status, or administrative notes
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer border border-slate-200/80"
            >
              <X size={18} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-y-auto">
            <div className="p-6 space-y-5">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
                  <AlertCircle size={16} className="shrink-0 text-rose-500" />
                  <span>{error}</span>
                </div>
              )}

              {/* Employee Summary Card */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/70 flex items-center justify-between">
                <div>
                  <span className="text-xs font-extrabold text-slate-900 block">
                    {record.employee?.fullName || 'Employee'}
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    {record.employee?.designation || 'Staff'} • {record.attendanceDate}
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  ID: {record.id.slice(0, 8)}
                </span>
              </div>

              {/* Status */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">Attendance Status *</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer"
                >
                  <option value="CHECKED_IN">CHECKED IN (Active session)</option>
                  <option value="CHECKED_OUT">CHECKED OUT (Completed session)</option>
                </select>
              </div>

              {/* Check-In Timestamp */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">Check-In Time *</label>
                <input
                  type="datetime-local"
                  value={checkInAt}
                  onChange={(e) => setCheckInAt(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                />
              </div>

              {/* Check-Out Timestamp */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">Check-Out Time</label>
                <input
                  type="datetime-local"
                  value={checkOutAt}
                  onChange={(e) => setCheckOutAt(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Notes */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">Audit Notes / Reason for Change</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Corrected check-out timestamp per HR authorization."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end gap-3 sticky bottom-0 mt-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} />
                    <span>Update Record</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
};
