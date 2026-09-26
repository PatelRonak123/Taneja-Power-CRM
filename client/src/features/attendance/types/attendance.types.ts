export type AttendanceStatus = 'CHECKED_IN' | 'CHECKED_OUT';

export interface AttendanceEmployee {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  designation?: string | null;
  avatarUrl?: string | null;
  status: string;
  role: string;
}

export interface AttendanceItem {
  id: string;
  employeeId: string;
  attendanceDate: string;
  checkInAt: string;
  checkInLatitude?: string | null;
  checkInLongitude?: string | null;
  checkOutAt?: string | null;
  checkOutLatitude?: string | null;
  checkOutLongitude?: string | null;
  totalMinutes?: number | null;
  status: AttendanceStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  employee: AttendanceEmployee;
}

export interface AttendanceMetrics {
  totalEmployees: number;
  checkedIn: number;
  checkedOut: number;
  notCheckedIn: number;
}

export interface AttendanceQueryParams {
  employeeId?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  status?: AttendanceStatus | 'ALL';
  search?: string;
  page?: number;
  limit?: number;
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

export interface OfficeLocationConfig {
  NAME: string;
  ADDRESS: string;
  LATITUDE: number;
  LONGITUDE: number;
  RADIUS_METERS: number;
}

export interface MyAttendanceResponse {
  todayRecord: AttendanceItem | null;
  status: 'NOT_CHECKED_IN' | 'CHECKED_IN' | 'CHECKED_OUT';
  date: string;
  workType?: string;
  officeLocation?: {
    NAME: string;
    ADDRESS: string;
    LATITUDE: number;
    LONGITUDE: number;
    RADIUS_METERS: number;
  };
}
