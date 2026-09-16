import React, { useState, useEffect, useCallback } from 'react';
import { CalendarCheck, AlertCircle } from 'lucide-react';
import { attendanceService } from '../services/attendanceService';
import { employeeService } from '../../admin/services/employeeService';
import {
  AttendanceItem,
  AttendanceMetrics,
  AttendanceQueryParams,
} from '../types/attendance.types';
import { Employee } from '../../admin/types/employee.types';
import { AttendanceMetricsCards } from '../components/AttendanceMetricsCards';
import { AttendanceToolbar, DatePreset } from '../components/AttendanceToolbar';
import { AttendanceTable } from '../components/AttendanceTable';
import { AttendanceDetailModal } from '../components/AttendanceDetailModal';
import { CurrentlyCheckedInDrawer } from '../components/CurrentlyCheckedInDrawer';

export const AttendanceManagementPage: React.FC = () => {
  // Helpers to get today's and preset dates in YYYY-MM-DD
  const getTodayStr = () => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  };

  const getYesterdayStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  };

  const getStartOfWeekStr = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split('T')[0];
  };

  const getStartOfMonthStr = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  };

  // State
  const [records, setRecords] = useState<AttendanceItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination & Filtering State
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  const [datePreset, setDatePreset] = useState<DatePreset>('TODAY');
  const [singleDate, setSingleDate] = useState<string>(getTodayStr());
  const [startDate, setStartDate] = useState<string>(getTodayStr());
  const [endDate, setEndDate] = useState<string>(getTodayStr());

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [employeeFilter, setEmployeeFilter] = useState<string>('ALL');

  // Metrics
  const [metrics, setMetrics] = useState<AttendanceMetrics>({
    totalEmployees: 0,
    checkedIn: 0,
    checkedOut: 0,
    notCheckedIn: 0,
  });

  // Reference list of active employees for filter dropdown
  const [employeesList, setEmployeesList] = useState<Employee[]>([]);

  // Modals & Drawers
  const [selectedRecordForDetail, setSelectedRecordForDetail] = useState<AttendanceItem | null>(null);
  const [isOnDutyDrawerOpen, setIsOnDutyDrawerOpen] = useState<boolean>(false);
  const [currentlyCheckedInList, setCurrentlyCheckedInList] = useState<AttendanceItem[]>([]);
  const [loadingCheckedIn, setLoadingCheckedIn] = useState<boolean>(false);

  // Load Reference Employees
  useEffect(() => {
    employeeService
      .getEmployees({ status: 'ACTIVE', limit: 100 })
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setEmployeesList(res.data);
        }
      })
      .catch((err) => {
        console.error('Failed to load employees for filter:', err);
      });
  }, []);

  // Fetch Attendance Records & Metrics
  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: AttendanceQueryParams = {
        page,
        limit,
      };

      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      if (statusFilter !== 'ALL') {
        params.status = statusFilter as any;
      }

      if (employeeFilter !== 'ALL') {
        params.employeeId = employeeFilter;
      }

      if (datePreset === 'TODAY' || datePreset === 'YESTERDAY') {
        params.date = singleDate;
      } else {
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
      }

      const res = await attendanceService.getAttendance(params);

      if (res.success) {
        setRecords(res.data || []);
        if (res.meta) {
          setTotalCount(res.meta.total || 0);
          setTotalPages(res.meta.totalPages || 1);
          if (res.meta.metrics) {
            setMetrics(res.meta.metrics as AttendanceMetrics);
          }
        }
      } else {
        setError(res.error?.message || 'Failed to retrieve attendance records');
      }
    } catch (err: any) {
      setError(err?.message || 'An error occurred while loading attendance');
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchQuery, statusFilter, employeeFilter, datePreset, singleDate, startDate, endDate]);

  // Load Attendance on state change
  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  // Load currently checked in list when drawer is opened
  const loadCurrentlyCheckedIn = async () => {
    setLoadingCheckedIn(true);
    try {
      const res = await attendanceService.getCurrentlyCheckedIn(singleDate);
      if (res.success && Array.isArray(res.data)) {
        setCurrentlyCheckedInList(res.data);
      }
    } catch (err) {
      console.error('Failed to load currently checked in list:', err);
    } finally {
      setLoadingCheckedIn(false);
    }
  };

  const handleOpenCheckedInDrawer = () => {
    setIsOnDutyDrawerOpen(true);
    loadCurrentlyCheckedIn();
  };

  // Handle Preset Changes
  const handleDatePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    setPage(1);

    const today = getTodayStr();
    if (preset === 'TODAY') {
      setSingleDate(today);
      setStartDate(today);
      setEndDate(today);
    } else if (preset === 'YESTERDAY') {
      const yesterday = getYesterdayStr();
      setSingleDate(yesterday);
      setStartDate(yesterday);
      setEndDate(yesterday);
    } else if (preset === 'THIS_WEEK') {
      setStartDate(getStartOfWeekStr());
      setEndDate(today);
    } else if (preset === 'THIS_MONTH') {
      setStartDate(getStartOfMonthStr());
      setEndDate(today);
    } else if (preset === 'CUSTOM') {
      setStartDate(getStartOfWeekStr());
      setEndDate(today);
    }
  };

  return (
    <div className="w-full max-w-350 mx-auto px-8 py-6 animate-fade-in space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 md:p-7 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/60 tracking-wide uppercase">
              <CalendarCheck size={13} className="text-blue-600" /> Workforce Attendance
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Employee Attendance Management
            </h1>
            <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
              Monitor verified employee daily attendance sessions, check-in/out timestamps, duty durations, and GPS coordinates in real time.
            </p>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-rose-500 hover:text-rose-700 text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Metrics Summary Cards */}
      <AttendanceMetricsCards
        metrics={metrics}
        onFilterStatus={(st) => {
          setStatusFilter(st);
          setPage(1);
        }}
        activeStatusFilter={statusFilter}
      />

      {/* Filter Toolbar */}
      <AttendanceToolbar
        searchQuery={searchQuery}
        onSearchChange={(val) => {
          setSearchQuery(val);
          setPage(1);
        }}
        statusFilter={statusFilter}
        onStatusFilterChange={(val) => {
          setStatusFilter(val);
          setPage(1);
        }}
        employeeFilter={employeeFilter}
        onEmployeeFilterChange={(val) => {
          setEmployeeFilter(val);
          setPage(1);
        }}
        datePreset={datePreset}
        onDatePresetChange={handleDatePresetChange}
        singleDate={singleDate}
        onSingleDateChange={(d) => {
          setSingleDate(d);
          setPage(1);
        }}
        startDate={startDate}
        onStartDateChange={(d) => {
          setStartDate(d);
          setPage(1);
        }}
        endDate={endDate}
        onEndDateChange={(d) => {
          setEndDate(d);
          setPage(1);
        }}
        employeesList={employeesList}
        onRefresh={fetchAttendance}
        loading={loading}
        onOpenCheckedInDrawer={handleOpenCheckedInDrawer}
        checkedInCount={metrics.checkedIn}
      />

      {/* Main Attendance Table */}
      <AttendanceTable
        records={records}
        loading={loading}
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
        onPageChange={(newPage) => setPage(newPage)}
        onViewDetails={(item) => setSelectedRecordForDetail(item)}
      />

      {/* Attendance Details Modal */}
      <AttendanceDetailModal
        record={selectedRecordForDetail}
        isOpen={Boolean(selectedRecordForDetail)}
        onClose={() => setSelectedRecordForDetail(null)}
      />

      {/* Currently Checked In On-Duty Drawer */}
      <CurrentlyCheckedInDrawer
        isOpen={isOnDutyDrawerOpen}
        onClose={() => setIsOnDutyDrawerOpen(false)}
        items={currentlyCheckedInList}
        loading={loadingCheckedIn}
        onSelectRecord={(rec) => setSelectedRecordForDetail(rec)}
      />
    </div>
  );
};

export default AttendanceManagementPage;
