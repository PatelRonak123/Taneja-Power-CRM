export type TodayAttendanceStatus =
  | 'NOT_CHECKED_IN'
  | 'CHECKED_IN'
  | 'CHECKED_OUT';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  attendanceDate: string;
  checkInAt: string;
  checkOutAt: string | null;
  checkInLatitude: string | null;
  checkInLongitude: string | null;
  checkOutLatitude: string | null;
  checkOutLongitude: string | null;
  totalMinutes: number | null;
  status: 'CHECKED_IN' | 'CHECKED_OUT';
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TodayAttendanceResponse {
  todayRecord: AttendanceRecord | null;
  status: TodayAttendanceStatus;
  date: string;
}

export interface CheckInPayload {
  latitude?: number | null;
  longitude?: number | null;
  notes?: string | null;
}

export interface CheckOutPayload {
  latitude?: number | null;
  longitude?: number | null;
  notes?: string | null;
}

