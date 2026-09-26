import React, { useState, useEffect, useCallback } from 'react';
import {
  CalendarCheck,
  Clock,
  MapPin,
  LogIn,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Calendar,
  FileText,
  Loader2,
  RefreshCw,
  TrendingUp,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Info,
} from 'lucide-react';
import { useAuthStore } from '../../../stores/authStore';
import { attendanceService } from '../../attendance/services/attendanceService';
import { AttendanceItem, MyAttendanceResponse } from '../../attendance/types/attendance.types';
import { toast } from '../../../utils/toast';

export const EmployeeAttendancePage: React.FC = () => {
  const { user } = useAuthStore();

  // Real-time Clock State
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Today's Status State
  const [todayData, setTodayData] = useState<MyAttendanceResponse | null>(null);
  const [loadingToday, setLoadingToday] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form Inputs
  const [notes, setNotes] = useState<string>('');

  // GPS Geolocation State
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [gpsLoading, setGpsLoading] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // History State
  const [historyRecords, setHistoryRecords] = useState<AttendanceItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(true);
  const [historyPage, setHistoryPage] = useState<number>(1);
  const [totalHistoryCount, setTotalHistoryCount] = useState<number>(0);
  const [totalHistoryPages, setTotalHistoryPages] = useState<number>(1);

  // Live Timer for Active Session
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Update Clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Request GPS Location
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    setGpsLoading(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setGpsLoading(false);
      },
      (err) => {
        setGpsLoading(false);
        setGpsError(err.message || 'Unable to retrieve location. You can still check in/out.');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, []);

  // Fetch Today's Attendance Status
  const fetchTodayStatus = useCallback(async () => {
    setLoadingToday(true);
    setErrorMsg(null);
    try {
      const res = await attendanceService.getMyAttendance();
      if (res.success && res.data) {
        setTodayData(res.data);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to fetch current attendance status.');
    } finally {
      setLoadingToday(false);
    }
  }, []);

  // Fetch Attendance History
  const fetchHistory = useCallback(async (pageNum: number = 1) => {
    setLoadingHistory(true);
    try {
      const res = await attendanceService.getMyHistory({ page: pageNum, limit: 10 });
      if (res.success) {
        setHistoryRecords(res.data || []);
        if (res.meta) {
          setTotalHistoryCount(res.meta.total || 0);
          setTotalHistoryPages(res.meta.totalPages || 1);
        }
      }
    } catch (err: any) {
      console.error('Failed to load history:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  // Initial Load & Request Location
  useEffect(() => {
    fetchTodayStatus();
    fetchHistory(historyPage);
    requestLocation();
  }, [fetchTodayStatus, fetchHistory, historyPage, requestLocation]);

  // Active Check-In Session Timer
  useEffect(() => {
    if (todayData?.status === 'CHECKED_IN' && todayData?.todayRecord?.checkInAt) {
      const checkInTime = new Date(todayData.todayRecord.checkInAt).getTime();
      const updateElapsed = () => {
        const now = new Date().getTime();
        const diff = Math.max(0, Math.floor((now - checkInTime) / 1000));
        setElapsedSeconds(diff);
      };
      updateElapsed();
      const interval = setInterval(updateElapsed, 1000);
      return () => clearInterval(interval);
    } else {
      setElapsedSeconds(0);
    }
  }, [todayData]);

  // Helper distance calculation (Haversine formula in meters)
  const calculateDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371000;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  const officeConfig = todayData?.officeLocation || {
    NAME: 'Taneja Power Systems (Head Office)',
    ADDRESS: '29, 4th Floor, Earth Alfa, Vasna - Bhayli Main Rd, opp. Nilamber Bunglow, Ashwamegh Nagar, Tandalja, Vadodara, Gujarat 390020',
    LATITUDE: 22.2965,
    LONGITUDE: 73.1495,
    RADIUS_METERS: 500,
  };

  const workType = user?.workType || todayData?.workType || 'OFFICE';
  const isOfficeEmployee = workType === 'OFFICE';

  const distanceToOffice =
    latitude !== null && longitude !== null
      ? calculateDistanceMeters(latitude, longitude, officeConfig.LATITUDE, officeConfig.LONGITUDE)
      : null;

  const isWithinGeofence =
    distanceToOffice !== null ? distanceToOffice <= officeConfig.RADIUS_METERS : false;

  // Handle Check In
  const handleCheckIn = async () => {
    // Geofence enforcement strictly for Office Employees
    if (isOfficeEmployee) {
      if (gpsLoading) {
        toast.error('Acquiring Location', 'Please wait while your GPS coordinates are being acquired.');
        return;
      }
      if (latitude === null || longitude === null) {
        const msg =
          gpsError ||
          'Location access is strictly required for office employees to check in. Please allow GPS location permissions in your browser.';
        setErrorMsg(msg);
        toast.error('Location Access Required', msg);
        requestLocation();
        return;
      }
      if (!isWithinGeofence) {
        const msg = `You are outside the office premises (${distanceToOffice}m away). Check-in is only permitted within ${officeConfig.RADIUS_METERS}m of ${officeConfig.NAME}.`;
        setErrorMsg(msg);
        toast.error('Outside Office Boundary', msg);
        return;
      }
    }

    setActionLoading(true);
    setErrorMsg(null);

    try {
      const res = await attendanceService.checkIn({
        latitude: latitude ?? undefined,
        longitude: longitude ?? undefined,
        notes: notes.trim() || undefined,
      });

      if (res.success) {
        toast.success('Check-in Successful', 'Checked in successfully! Have a productive shift.');
        setNotes('');
        await fetchTodayStatus();
        await fetchHistory(1);
      } else {
        const msg = res.error?.message || 'Failed to check in.';
        setErrorMsg(msg);
        toast.error('Check-in Failed', msg);
      }
    } catch (err: any) {
      const msg = err?.message || 'An error occurred during check in.';
      setErrorMsg(msg);
      toast.error('Check-in Failed', msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Check Out
  const handleCheckOut = async () => {
    // Geofence enforcement strictly for Office Employees
    if (isOfficeEmployee) {
      if (gpsLoading) {
        toast.error('Acquiring Location', 'Please wait while your GPS coordinates are being acquired.');
        return;
      }
      if (latitude === null || longitude === null) {
        const msg =
          gpsError ||
          'Location access is strictly required for office employees to check out. Please allow GPS location permissions in your browser.';
        setErrorMsg(msg);
        toast.error('Location Access Required', msg);
        requestLocation();
        return;
      }
      if (!isWithinGeofence) {
        const msg = `You are outside the office premises (${distanceToOffice}m away). Check-out is only permitted within ${officeConfig.RADIUS_METERS}m of ${officeConfig.NAME}.`;
        setErrorMsg(msg);
        toast.error('Outside Office Boundary', msg);
        return;
      }
    }

    setActionLoading(true);
    setErrorMsg(null);

    try {
      const res = await attendanceService.checkOut({
        latitude: latitude ?? undefined,
        longitude: longitude ?? undefined,
        notes: notes.trim() || undefined,
      });

      if (res.success) {
        toast.success('Check-out Successful', 'Checked out successfully! Shift logged.');
        setNotes('');
        await fetchTodayStatus();
        await fetchHistory(1);
      } else {
        const msg = res.error?.message || 'Failed to check out.';
        setErrorMsg(msg);
        toast.error('Check-out Failed', msg);
      }
    } catch (err: any) {
      const msg = err?.message || 'An error occurred during check out.';
      setErrorMsg(msg);
      toast.error('Check-out Failed', msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Helper Formatters
  const formatTimeString = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  const formatDateString = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      const [y, m, d] = dateStr.split('-');
      return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatElapsed = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const formatMinutesToHours = (mins?: number | null) => {
    if (mins === undefined || mins === null) return '—';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  const currentStatus = todayData?.status || 'NOT_CHECKED_IN';
  const todayRecord = todayData?.todayRecord;

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-10">
      {/* Top Banner & Live Clock */}
      <div className="bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 md:p-6 rounded-xl text-white shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-400/30">
              <CalendarCheck size={12} className="text-blue-400" />
              <span>EMPLOYEE ATTENDANCE PORTAL</span>
            </div>
            <h1 className="text-[22px] font-semibold tracking-tight">
              Welcome, {user?.fullName || 'Valued Team Member'}
            </h1>
            <p className="text-[13px] text-slate-300 max-w-xl">
              Log your daily shift check-in and check-out timestamps, record location coordinates, and review your personal attendance records.
            </p>
          </div>

          {/* Real-time Digital Clock & Status Badge */}
          <div className="flex flex-col items-start md:items-end gap-1 bg-slate-900/60 p-3.5 rounded-lg border border-slate-800 backdrop-blur-xs">
            <div className="text-xl font-mono font-bold tracking-wider text-emerald-400 tabular-nums">
              {currentTime.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true,
              })}
            </div>
            <div className="text-[11px] text-slate-400 font-medium">
              {currentTime.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Notifications Alert Messages */}
      {errorMsg && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-between text-xs font-medium shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle size={16} className="shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-xs font-semibold text-rose-500 hover:text-rose-800"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Grid: Control Panel (Left) & Metrics/Quick Status (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Attendance Action Control Panel */}
        <div className="lg:col-span-7 bg-card p-5 md:p-6 rounded-xl border border-border shadow-xs flex flex-col justify-between gap-5">
          <div>
            {/* Header / Status Title */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
                  <Clock size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Today's Duty Status</h2>
                  <p className="text-xs text-slate-500">Record check-in or check-out for today</p>
                </div>
              </div>

              {/* Status Badge */}
              {loadingToday ? (
                <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-slate-500 text-xs font-semibold">
                  <Loader2 size={14} className="animate-spin" /> Checking status...
                </div>
              ) : currentStatus === 'CHECKED_IN' ? (
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  SHIFT IN PROGRESS
                </span>
              ) : currentStatus === 'CHECKED_OUT' ? (
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
                  <CheckCircle2 size={14} className="text-blue-600" />
                  SHIFT COMPLETED
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
                  <AlertCircle size={14} className="text-amber-600" />
                  NOT CHECKED IN
                </span>
              )}
            </div>

            {/* GPS Coordinates & Detection Indicator */}
            <div className={`mt-5 p-4 rounded-2xl border text-xs transition-all ${
              isOfficeEmployee
                ? isWithinGeofence
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  : latitude && longitude
                  ? 'bg-rose-50/80 border-rose-200 text-rose-900'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
                : 'bg-slate-50 border-slate-200/80 text-slate-700'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <MapPin
                    size={18}
                    className={`shrink-0 mt-0.5 ${
                      isOfficeEmployee
                        ? isWithinGeofence
                          ? 'text-emerald-600'
                          : latitude && longitude
                          ? 'text-rose-600'
                          : 'text-amber-500'
                        : latitude && longitude
                        ? 'text-emerald-600'
                        : 'text-slate-400'
                    }`}
                  />
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900">
                        {isOfficeEmployee ? 'Office Geofence Location' : 'GPS Location'}
                      </span>
                      {isOfficeEmployee && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          isWithinGeofence
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : latitude && longitude
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}>
                          {isWithinGeofence
                            ? 'Inside Office Radius'
                            : latitude && longitude
                            ? 'Outside Radius'
                            : 'Location Required'}
                        </span>
                      )}
                    </div>

                    {gpsLoading ? (
                      <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                        <Loader2 size={13} className="animate-spin" /> Acquiring GPS location for attendance verification...
                      </span>
                    ) : latitude && longitude ? (
                      <div className="space-y-0.5">
                        <div className="font-mono text-slate-800 font-semibold text-[11px]">
                          Coordinates: {latitude.toFixed(4)}, {longitude.toFixed(4)}
                        </div>
                        {isOfficeEmployee && (
                          <div className={`text-[11px] font-medium ${isWithinGeofence ? 'text-emerald-700' : 'text-rose-700 font-semibold'}`}>
                            {isWithinGeofence ? (
                              <span>✓ Within permitted boundary (~{distanceToOffice}m from office, max allowed: {officeConfig.RADIUS_METERS}m)</span>
                            ) : (
                              <span>⚠ Outside office boundary (~{distanceToOffice}m away • Check-in/out only allowed within {officeConfig.RADIUS_METERS}m of {officeConfig.NAME})</span>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className={`font-medium ${isOfficeEmployee ? 'text-rose-700 font-semibold' : 'text-slate-500'}`}>
                        {gpsError || (isOfficeEmployee ? 'Location access is required for office attendance. Please allow browser location access.' : 'GPS location not available (Optional check-in for field employees)')}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={requestLocation}
                  disabled={gpsLoading}
                  className="self-start sm:self-center px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-blue-700 border border-slate-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs shrink-0 disabled:opacity-50"
                >
                  <RefreshCw size={12} className={gpsLoading ? 'animate-spin' : ''} />
                  Refresh GPS
                </button>
              </div>
            </div>

            {/* Shift Session Information */}
            {currentStatus === 'CHECKED_IN' && todayRecord && (
              <div className="mt-5 p-5 bg-linear-to-br from-emerald-50 to-teal-50/60 rounded-2xl border border-emerald-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                    Checked In At
                  </span>
                  <div className="text-lg font-extrabold text-emerald-950">
                    {formatTimeString(todayRecord.checkInAt)}
                  </div>
                  <div className="text-xs text-emerald-700 font-medium">
                    Date: {formatDateString(todayRecord.attendanceDate)}
                  </div>
                </div>

                <div className="bg-white/90 backdrop-blur-xs p-4 rounded-xl border border-emerald-200 shadow-2xs text-center min-w-36">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                    Elapsed Duration
                  </span>
                  <span className="text-xl font-mono font-extrabold text-emerald-700">
                    {formatElapsed(elapsedSeconds)}
                  </span>
                </div>
              </div>
            )}

            {currentStatus === 'CHECKED_OUT' && todayRecord && (
              <div className="mt-5 p-5 bg-blue-50/70 rounded-2xl border border-blue-200/80 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                <div className="bg-white p-3.5 rounded-xl border border-blue-100 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Check In Time
                  </span>
                  <span className="text-base font-bold text-slate-800">
                    {formatTimeString(todayRecord.checkInAt)}
                  </span>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-blue-100 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Check Out Time
                  </span>
                  <span className="text-base font-bold text-slate-800">
                    {formatTimeString(todayRecord.checkOutAt)}
                  </span>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-blue-100 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Total Duty Shift
                  </span>
                  <span className="text-base font-extrabold text-blue-700">
                    {formatMinutesToHours(todayRecord.totalMinutes)}
                  </span>
                </div>
              </div>
            )}

            {/* Optional Notes Input */}
            {currentStatus !== 'CHECKED_OUT' && (
              <div className="mt-5 space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <FileText size={14} className="text-slate-400" />
                  Shift Notes / Work Log (Optional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={
                    currentStatus === 'CHECKED_IN'
                      ? 'Add checkout summary notes or field task completion details...'
                      : 'Add site location remarks or planned task objectives for today...'
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                />
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-100">
            {currentStatus === 'NOT_CHECKED_IN' && (
              <button
                type="button"
                disabled={actionLoading || loadingToday}
                onClick={handleCheckIn}
                className="w-full py-4 px-6 rounded-2xl bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/25 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2.5 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Recording Check In...
                  </>
                ) : (
                  <>
                    <LogIn size={18} /> CHECK IN NOW
                  </>
                )}
              </button>
            )}

            {currentStatus === 'CHECKED_IN' && (
              <button
                type="button"
                disabled={actionLoading || loadingToday}
                onClick={handleCheckOut}
                className="w-full py-4 px-6 rounded-2xl bg-linear-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-extrabold text-sm shadow-lg shadow-rose-600/25 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2.5 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Recording Check Out...
                  </>
                ) : (
                  <>
                    <LogOut size={18} /> CHECK OUT NOW
                  </>
                )}
              </button>
            )}

            {currentStatus === 'CHECKED_OUT' && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center text-xs font-semibold text-slate-600 flex items-center justify-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                Attendance check-in and check-out completed for today.
              </div>
            )}
          </div>
        </div>

        {/* Right Overview Metric Cards */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <TrendingUp size={18} />
              </div>
              <h3 className="text-base font-bold text-slate-900">Attendance Telemetry</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Logged Records
                </span>
                <span className="text-2xl font-extrabold text-slate-900">
                  {totalHistoryCount}
                </span>
                <span className="text-[10px] text-slate-500 block">Total Shift Logs</span>
              </div>

              <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block">
                  System Status
                </span>
                <span className="text-2xl font-extrabold text-blue-900">Active</span>
                <span className="text-[10px] text-blue-600 block">Verified Account</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100/80 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <ShieldCheck size={20} />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-emerald-950">Verified Location Tracking</h4>
                <p className="text-[11px] text-emerald-700 leading-tight">
                  Check-in timestamps and GPS coordinates are synced to the enterprise admin panel.
                </p>
              </div>
            </div>
          </div>

          {/* Guidelines / Help Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-slate-800 text-xs font-bold">
              <Info size={16} className="text-blue-500 shrink-0" />
              <span>Shift Attendance Policy</span>
            </div>
            <ul className="text-xs text-slate-500 space-y-2 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-blue-500 font-bold">•</span>
                <span>Check-in once upon arriving at the office or primary field service location.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 font-bold">•</span>
                <span>Always ensure check-out is submitted at the end of your daily work duties.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Personal Attendance History Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-100 text-slate-700 rounded-xl">
              <Calendar size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">My Attendance Log</h3>
              <p className="text-xs text-slate-500">Your recent check-in and check-out history</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => fetchHistory(historyPage)}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Refresh logs"
          >
            <RefreshCw size={16} className={loadingHistory ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-180">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Check In</th>
                <th className="py-3 px-4">Check Out</th>
                <th className="py-3 px-4">Duty Duration</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">GPS Location</th>
                <th className="py-3 px-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loadingHistory ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={`skel-${idx}`} className="animate-pulse">
                    <td className="py-3.5 px-4"><div className="w-24 h-3.5 bg-slate-200 rounded" /></td>
                    <td className="py-3.5 px-4"><div className="w-16 h-3.5 bg-slate-200 rounded" /></td>
                    <td className="py-3.5 px-4"><div className="w-16 h-3.5 bg-slate-200 rounded" /></td>
                    <td className="py-3.5 px-4"><div className="w-14 h-3.5 bg-slate-200 rounded" /></td>
                    <td className="py-3.5 px-4"><div className="w-20 h-5 bg-slate-200 rounded-full" /></td>
                    <td className="py-3.5 px-4"><div className="w-28 h-3.5 bg-slate-200 rounded" /></td>
                    <td className="py-3.5 px-4"><div className="w-32 h-3.5 bg-slate-200 rounded" /></td>
                  </tr>
                ))
              ) : historyRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No past attendance logs found.
                  </td>
                </tr>
              ) : (
                historyRecords.map((rec) => {
                  const isCheckedIn = rec.status === 'CHECKED_IN';
                  const hasGps = rec.checkInLatitude && rec.checkInLongitude;

                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-800 whitespace-nowrap">
                        {formatDateString(rec.attendanceDate)}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700 whitespace-nowrap">
                        {formatTimeString(rec.checkInAt)}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700 whitespace-nowrap">
                        {formatTimeString(rec.checkOutAt)}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                        {formatMinutesToHours(rec.totalMinutes)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isCheckedIn ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Checked In
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            Checked Out
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-slate-500">
                        {hasGps ? (
                          <span className="inline-flex items-center gap-1 text-slate-700">
                            <MapPin size={12} className="text-blue-500 shrink-0" />
                            {Number(rec.checkInLatitude).toFixed(4)}, {Number(rec.checkInLongitude).toFixed(4)}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                        {rec.notes || '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {!loadingHistory && totalHistoryPages > 1 && (
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Page {historyPage} of {totalHistoryPages} ({totalHistoryCount} logs)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={historyPage <= 1}
                onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                disabled={historyPage >= totalHistoryPages}
                onClick={() => setHistoryPage((p) => p + 1)}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeAttendancePage;
