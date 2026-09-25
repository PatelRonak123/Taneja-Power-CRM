import React from 'react';
import {
  Clock,
  MapPin,
  Calendar,
  Eye,
  Edit2,
  Copy,
  Check,
  Radio,
} from 'lucide-react';
import { AttendanceItem } from '../types/attendance.types';
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
import { StatusPill } from '../../../components/ui/StatusPill';

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
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden transition-all">
      <div className="overflow-x-auto">
        <Table density="standard" className="min-w-225">
          <TableHeader>
            <TableRow>
              <TableHead className="w-55">Employee</TableHead>
              <TableHead className="w-30">Date</TableHead>
              <TableHead className="w-27.5">Check In</TableHead>
              <TableHead className="w-30">Check Out</TableHead>
              <TableHead className="w-25">Duration</TableHead>
              <TableHead className="w-30">Status</TableHead>
              <TableHead>Location (GPS)</TableHead>
              <TableHead align="right" className="w-27.5">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableLoadingState columns={8} rows={5} />
            ) : records.length === 0 ? (
              <TableEmptyState
                colSpan={8}
                icon={<Clock size={24} />}
                title="No Attendance Records Found"
                description="No check-in activity matches the selected employee, date timeframe, or status filter."
              />
            ) : (
              records.map((item) => {
                const isCheckedIn = item.status === 'CHECKED_IN';
                const checkInCoords =
                  item.checkInLatitude && item.checkInLongitude
                    ? `${Number(item.checkInLatitude).toFixed(4)}, ${Number(item.checkInLongitude).toFixed(4)}`
                    : null;

                return (
                  <TableRow
                    key={item.id}
                    clickable
                    onClick={() => onViewDetails(item)}
                  >
                    {/* Employee info */}
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-linear-to-br from-indigo-500 to-purple-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                          {item.employee?.fullName?.substring(0, 2).toUpperCase() || 'EM'}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors truncate max-w-40">
                            {item.employee?.fullName || 'Unknown Employee'}
                          </span>
                          <span className="text-[11px] text-slate-500 truncate max-w-40">
                            {item.employee?.designation || item.employee?.email || 'Field Staff'}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Attendance Date */}
                    <TableCell className="whitespace-nowrap tabular-nums text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={13} className="text-slate-400" />
                        <span>{formatDate(item.attendanceDate)}</span>
                      </div>
                    </TableCell>

                    {/* Check In */}
                    <TableCell className="whitespace-nowrap tabular-nums font-medium text-slate-800">
                      <div className="flex flex-col">
                        <span>{formatTime(item.checkInAt)}</span>
                        {checkInCoords && (
                          <span className="text-[10px] text-slate-400 font-mono">GPS logged</span>
                        )}
                      </div>
                    </TableCell>

                    {/* Check Out */}
                    <TableCell className="whitespace-nowrap tabular-nums font-medium text-slate-800">
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
                    </TableCell>

                    {/* Working Duration */}
                    <TableCell className="font-semibold text-slate-800 whitespace-nowrap tabular-nums">
                      {formatDuration(item.totalMinutes, isCheckedIn)}
                    </TableCell>

                    {/* Status Badge */}
                    <TableCell className="whitespace-nowrap">
                      <StatusPill
                        variant={isCheckedIn ? 'success' : 'neutral'}
                        dot
                        dotPulse={isCheckedIn}
                        size="xs"
                      >
                        {isCheckedIn ? 'Checked In' : 'Checked Out'}
                      </StatusPill>
                    </TableCell>

                    {/* Location Coordinates */}
                    <TableCell className="whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      {checkInCoords ? (
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200">
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
                    </TableCell>

                    {/* Actions */}
                    <TableCell align="right" className="whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onViewDetails(item)}
                          className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-md text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 transition-all cursor-pointer"
                        >
                          <Eye size={13} />
                          <span>View</span>
                        </button>
                        {onEditRecord && (
                          <button
                            type="button"
                            onClick={() => onEditRecord(item)}
                            className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-md text-xs font-semibold text-amber-600 hover:text-amber-700 hover:bg-amber-50 border border-amber-200 transition-all cursor-pointer"
                            title="Edit Attendance Record"
                          >
                            <Edit2 size={13} />
                            <span>Edit</span>
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Footer */}
      {!loading && totalPages > 1 && (
        <TablePagination
          page={page}
          totalPages={totalPages}
          totalCount={totalCount}
          limit={15}
          onPageChange={onPageChange}
          entityName="records"
        />
      )}
    </div>
  );
};
