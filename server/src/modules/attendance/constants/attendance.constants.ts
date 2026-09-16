export const ATTENDANCE_STATUS = {
  CHECKED_IN: 'CHECKED_IN',
  CHECKED_OUT: 'CHECKED_OUT',
} as const;

export type AttendanceStatus = (typeof ATTENDANCE_STATUS)[keyof typeof ATTENDANCE_STATUS];

export const ATTENDANCE_CONSTANTS = {
  TIMEZONE: 'Asia/Kolkata',
} as const;
