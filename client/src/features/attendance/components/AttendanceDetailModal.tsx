import React from 'react';
import {
  X,
  Clock,
  MapPin,
  Calendar,
  Copy,
  Check,
  Radio,
  FileText,
  Shield,
} from 'lucide-react';
import { AttendanceItem } from '../types/attendance.types';

interface AttendanceDetailModalProps {
  record: AttendanceItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AttendanceDetailModal: React.FC<AttendanceDetailModalProps> = ({
  record,
  isOpen,
  onClose,
}) => {
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

  if (!isOpen || !record) return null;

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return 'Not recorded';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'medium',
      });
    } catch {
      return dateStr;
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      const [year, month, day] = dateStr.split('-');
      const d = new Date(Number(year), Number(month) - 1, Number(day));
      return d.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatDuration = (totalMinutes?: number | null) => {
    if (totalMinutes === undefined || totalMinutes === null) {
      if (record.status === 'CHECKED_IN') {
        return 'In Session (Duty in progress)';
      }
      return 'Not recorded';
    }
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hours} hours, ${mins} minutes (${totalMinutes} total minutes)`;
  };

  const isCheckedIn = record.status === 'CHECKED_IN';
  const checkInCoords =
    record.checkInLatitude && record.checkInLongitude
      ? `${record.checkInLatitude}, ${record.checkInLongitude}`
      : null;
  const checkOutCoords =
    record.checkOutLatitude && record.checkOutLongitude
      ? `${record.checkOutLatitude}, ${record.checkOutLongitude}`
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl border border-(--border-color) shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200/60 flex items-center justify-center">
              <Clock size={20} />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                Attendance Record Details
              </h2>
              <p className="text-xs text-slate-500">
                Verified operational duty log for field personnel
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Employee Card */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-extrabold flex items-center justify-center text-base shadow-sm">
                {record.employee?.fullName?.substring(0, 2).toUpperCase() || 'EM'}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-extrabold text-slate-900">
                  {record.employee?.fullName}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {record.employee?.designation || 'Field Workforce Personnel'}
                </span>
                <span className="text-[11px] text-slate-400">
                  {record.employee?.email} {record.employee?.phone ? `• ${record.employee.phone}` : ''}
                </span>
              </div>
            </div>

            <div>
              {isCheckedIn ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">
                  <Radio size={10} className="animate-pulse" /> CHECKED IN
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 shadow-xs">
                  CHECKED OUT
                </span>
              )}
            </div>
          </div>

          {/* Attendance Date Summary */}
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-blue-50/60 px-4 py-3 rounded-xl border border-blue-100">
            <Calendar size={15} className="text-blue-600 shrink-0" />
            <span>Attendance Date: </span>
            <span className="font-bold text-blue-900">{formatDate(record.attendanceDate)}</span>
          </div>

          {/* Time & Location Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Check In Block */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Check-In Event
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Server Timestamp:</span>
                <span className="text-xs font-bold text-slate-900">
                  {formatDateTime(record.checkInAt)}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block font-medium">GPS Location:</span>
                {checkInCoords ? (
                  <div className="flex items-center justify-between mt-1 p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono text-slate-800">
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin size={13} className="text-emerald-600 shrink-0" />
                      <span className="truncate">{checkInCoords}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy('checkin', checkInCoords)}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded-md transition-colors shrink-0 ml-2"
                      title="Copy coordinates"
                    >
                      {copiedKey === 'checkin' ? (
                        <Check size={13} className="text-emerald-600" />
                      ) : (
                        <Copy size={13} />
                      )}
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 italic">Not available</span>
                )}
              </div>
            </div>

            {/* Check Out Block */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Check-Out Event
                </span>
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    record.checkOutAt ? 'bg-purple-500' : 'bg-amber-400 animate-pulse'
                  }`}
                ></span>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Server Timestamp:</span>
                <span className="text-xs font-bold text-slate-900">
                  {record.checkOutAt ? formatDateTime(record.checkOutAt) : 'Active / In Session'}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block font-medium">GPS Location:</span>
                {checkOutCoords ? (
                  <div className="flex items-center justify-between mt-1 p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono text-slate-800">
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin size={13} className="text-purple-600 shrink-0" />
                      <span className="truncate">{checkOutCoords}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy('checkout', checkOutCoords)}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded-md transition-colors shrink-0 ml-2"
                      title="Copy coordinates"
                    >
                      {copiedKey === 'checkout' ? (
                        <Check size={13} className="text-purple-600" />
                      ) : (
                        <Copy size={13} />
                      )}
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 italic">
                    {record.checkOutAt ? 'Not available' : 'Pending check-out'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Working Duration Card */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                <Clock size={18} />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Computed Duty Duration
                </span>
                <span className="text-sm font-extrabold text-slate-900">
                  {formatDuration(record.totalMinutes)}
                </span>
              </div>
            </div>
          </div>

          {/* Notes Section */}
          {record.notes && (
            <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <FileText size={14} className="text-slate-400" />
                <span>Attendance Log Notes</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100 font-mono">
                {record.notes}
              </p>
            </div>
          )}

          {/* Record Metadata & Security Audit */}
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
            <div className="flex items-center gap-1">
              <Shield size={12} />
              <span>Record ID: {record.id}</span>
            </div>
            <div>
              <span>Created: {formatDateTime(record.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-900 transition-colors cursor-pointer"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};
