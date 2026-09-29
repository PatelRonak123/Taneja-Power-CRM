import { env } from '../../../config/env.js';

export const ATTENDANCE_STATUS = {
  CHECKED_IN: 'CHECKED_IN',
  CHECKED_OUT: 'CHECKED_OUT',
} as const;

export type AttendanceStatus = (typeof ATTENDANCE_STATUS)[keyof typeof ATTENDANCE_STATUS];

export const ATTENDANCE_CONSTANTS = {
  TIMEZONE: 'Asia/Kolkata',
  // Office Geofence configuration for Office Employees
  OFFICE_LOCATION: {
    NAME: 'Taneja Power Systems (Head Office)',
    ADDRESS: '29, 4th Floor, Earth Alfa, Vasna - Bhayli Main Rd, opp. Nilamber Bunglow, Ashwamegh Nagar, Tandalja, Vadodara, Gujarat 390020',
    LATITUDE: env.OFFICE_LATITUDE,
    LONGITUDE: env.OFFICE_LONGITUDE,
    // Maximum allowed check-in/out radius in meters for office employees
    RADIUS_METERS: env.OFFICE_RADIUS_METERS,
  },
} as const;

/**
 * Calculates straight-line distance in meters between two coordinates using the Haversine formula
 */
export function calculateGeodesicDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}
