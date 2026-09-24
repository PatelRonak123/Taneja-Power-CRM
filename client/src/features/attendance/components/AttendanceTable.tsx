import React from 'react';
import {
  Clock,
  MapPin,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit2,
  Copy,
  Check,
  Radio,
} from 'lucide-react';
import { AttendanceItem } from '../types/attendance.types';

interface AttendanceTableProps {
  records: AttendanceItem[];
  loading: boolean;
  page: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (newPage: number) => void;
  onViewDetails: (record: AttendanceItem) => void;
  onEditRecord?: (record: AttendanceItem) => void;
}

export const AttendanceTable: React.FC<AttendanceTableProps> = ({
  records,
  loading,
  page,
  totalPages,
  totalCount,
  onPageChange,
  onViewDetails,
  onEditRecord,
}) => {
  const [copiedCoord, setCopiedCoord] = React.useState<string | null>(null);

  const handleCopy = (coord: string) => {
    navigator.clipboard.writeText(coord);
    setCopiedCoord(coord);
    setTimeout(() => setCopiedCoord(null), 2000);
  };

  const formatTime = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
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
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatDuration = (totalMinutes?: number | null, isOngoing?: boolean) => {
    if (totalMinutes === undefined || totalMinutes === null) {
      if (isOngoing) {
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
            <Radio size={12} className="animate-pulse" /> In Session
          </span>
        );
      }
      return '—';
    }

    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hours}h ${String(mins).padStart(2, '0')}m`;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden transition-all">
      {/* Table container with horizontal scroll capability for responsive screens */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-230">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <th className="py-4 px-6">Employee</th>
              <th className="py-4 px-4">Date</th>
              <th className="py-4 px-4">Check In</th>
              <th className="py-4 px-4">Check Out</th>
              <th className="py-4 px-4">Duration</th>
              <th className="py-4 px-4">Status</th>
              <th className="py-4 px-4">Location (GPS)</th>
              <th className="py-4 px-6 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <tr key={`skeleton-${index}`} className="animate-pulse">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-200"></div>
                      <div className="space-y-1.5">
                        <div className="w-28 h-3.5 bg-slate-200 rounded-sm"></div>
                        <div className="w-16 h-2.5 bg-slate-100 rounded-sm"></div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="w-20 h-3.5 bg-slate-200 rounded-sm"></div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="w-16 h-3.5 bg-slate-200 rounded-sm"></div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="w-16 h-3.5 bg-slate-200 rounded-sm"></div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="w-14 h-3.5 bg-slate-200 rounded-sm"></div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="w-20 h-5 bg-slate-200 rounded-full"></div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="w-24 h-3.5 bg-slate-200 rounded-sm"></div>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="w-12 h-6 bg-slate-200 rounded-lg ml-auto"></div>
                  </td>
                </tr>
              ))
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center">
                  <div className="flex flex-col items-center justify-center text-center max-w-sm mx-auto">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                      <Clock size={24} />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800">No Attendance Records Found</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      No check-in activity matches the selected employee, date timeframe, or status filter.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              records.map((item) => {
                const isCheckedIn = item.status === 'CHECKED_IN';
                const checkInCoords =
                  item.checkInLatitude && item.checkInLongitude
                    ? `${Number(item.checkInLatitude).toFixed(4)}, ${Number(item.checkInLongitude).toFixed(4)}`
                    : null;

                return (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                    onClick={() => onViewDetails(item)}
                  >
                    {/* Employee info */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-linear-to-br from-indigo-500 to-purple-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                          {item.employee?.fullName?.substring(0, 2).toUpperCase() || 'EM'}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate max-w-45">
                            {item.employee?.fullName || 'Unknown Employee'}
                          </span>
                          <span className="text-[11px] text-slate-400 truncate max-w-45">
                            {item.employee?.designation || item.employee?.email || 'Field Staff'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Attendance Date */}
                    <td className="py-4 px-4 font-medium text-slate-700 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Calendar size={13} className="text-slate-400" />
                        <span>{formatDate(item.attendanceDate)}</span>
                      </div>
                    </td>

                    {/* Check In */}
                    <td className="py-4 px-4 font-semibold text-slate-800 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span>{formatTime(item.checkInAt)}</span>
                        {checkInCoords && (
                          <span className="text-[10px] text-slate-400 font-mono">GPS logged</span>
                        )}
                      </div>
                    </td>

                    {/* Check Out */}
                    <td className="py-4 px-4 font-semibold text-slate-800 whitespace-nowrap">
                      {item.checkOutAt ? (
                        <div className="flex flex-col">
                          <span>{formatTime(item.checkOutAt)}</span>
                          {item.checkOutLatitude && item.checkOutLongitude && (
                            <span className="text-[10px] text-slate-400 font-mono">GPS logged</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-emerald-600 font-semibold text-[11px] inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          In Progress
                        </span>
                      )}
                    </td>

                    {/* Working Duration */}
                    <td className="py-4 px-4 font-bold text-slate-800 whitespace-nowrap">
                      {formatDuration(item.totalMinutes, isCheckedIn)}
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      {isCheckedIn ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          Checked In
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/80">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                          Checked Out
                        </span>
                      )}
                    </td>

                    {/* Location Coordinates */}
                    <td className="py-4 px-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      {checkInCoords ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/80">
                          <MapPin size={12} className="text-blue-500 shrink-0" />
                          <span className="font-mono text-slate-600 text-[11px]">
                            {checkInCoords}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(checkInCoords)}
                            title="Copy coordinates"
                            className="p-0.5 text-slate-400 hover:text-slate-700 rounded transition-colors"
                          >
                            {copiedCoord === checkInCoords ? (
                              <Check size={12} className="text-emerald-600" />
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs italic">Not available</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onViewDetails(item)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:text-blue-600 hover:bg-blue-50/80 border border-slate-200/80 hover:border-blue-200 transition-all shadow-2xs cursor-pointer"
                        >
                          <Eye size={13} />
                          <span>View</span>
                        </button>
                        {onEditRecord && (
                          <button
                            type="button"
                            onClick={() => onEditRecord(item)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-amber-600 hover:text-amber-700 hover:bg-amber-50 border border-amber-200/80 transition-all shadow-2xs cursor-pointer"
                            title="Edit Attendance Record"
                          >
                            <Edit2 size={13} />
                            <span>Edit</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {!loading && totalPages > 1 && (
        <div className="p-4 bg-slate-50/80 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div>
            Showing <span className="font-bold text-slate-800">{records.length}</span> of{' '}
            <span className="font-bold text-slate-800">{totalCount}</span> records (Page {page} of{' '}
            {totalPages})
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors flex items-center gap-1 shadow-2xs"
            >
              <ChevronLeft size={14} /> Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors flex items-center gap-1 shadow-2xs"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
