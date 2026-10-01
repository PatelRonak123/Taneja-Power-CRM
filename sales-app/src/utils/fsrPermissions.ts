import { User } from '../auth/auth.types';
import { FsrStatus } from '../types/fsr.types';

export interface FsrPermissionTarget {
  serviceEngineerId?: string | null;
  status: FsrStatus | string;
}

/**
 * Check if the user has Admin or Service Manager privileges.
 */
export const isAdminOrManager = (user?: User | null): boolean => {
  if (!user) return false;
  return (
    user.role === 'ADMIN' ||
    user.role === 'MANAGER' ||
    (user.designation || '').toLowerCase().includes('manager')
  );
};

/**
 * Service designations recognized by the system for field service operations.
 */
const SERVICE_DESIGNATION_KEYWORDS = [
  'service',
  'field service engineer',
  'service engineer',
  'technician',
  'field service technician',
  'field engineer',
  'service tech',
  'fse',
  'electrician',
  'solar technician',
];

/**
 * Sales designations recognized by the system.
 */
const SALES_DESIGNATION_KEYWORDS = [
  'sales',
  'representative',
  'executive',
  'business dev',
  'account manager',
  'account exec',
  'bd',
];

/**
 * Check if user is a designated Field Service Engineer / Technician.
 * Strict rules:
 * 1. Office users (e.g. Service Office, HR Office) are NEVER FSEs.
 * 2. Field users with Service designation (or legacy engineer titles) ARE FSEs.
 */
export const isFSE = (user?: User | null): boolean => {
  if (!user) return false;
  if (isAdminOrManager(user)) return true;

  const role = (user.role || '').toLowerCase();
  if (role.includes('service')) return true;

  // Office employees are never field engineers
  if (user.workType === 'OFFICE') {
    return false;
  }

  const designation = (user.designation || '').toLowerCase().trim();
  if (!designation) return false;

  // Exclude office designations if unclassified
  if (designation.includes('office')) {
    return false;
  }

  // Check if explicitly matching service keywords
  if (SERVICE_DESIGNATION_KEYWORDS.some((kw) => designation === kw || designation.includes(kw))) {
    return true;
  }

  // If user is sales, definitely not FSE
  if (SALES_DESIGNATION_KEYWORDS.some((kw) => designation === kw || designation.includes(kw))) {
    return false;
  }

  return false;
};

/**
 * Check if the authenticated user is a Salesperson (non-service employee).
 */
export const isSalesperson = (user?: User | null): boolean => {
  if (!user) return false;
  if (isAdminOrManager(user)) return false;
  if (isFSE(user)) return false;

  const designation = (user.designation || '').toLowerCase().trim();
  if (designation.includes('office')) {
    return false;
  }

  return SALES_DESIGNATION_KEYWORDS.some((kw) => designation === kw || designation.includes(kw));
};

/**
 * Determine if user can see the Field Service tab in the mobile navigation.
 * ADMIN, MANAGER, Field Service Engineer / Technician -> YES
 * Sales USER -> NO
 * Office USER -> NO
 */
export const canAccessFSR = (user?: User | null): boolean => {
  if (!user) return false;
  if (isAdminOrManager(user)) return true;
  if (user.workType === 'OFFICE') return false;
  return isFSE(user);
};

/**
 * Determine if user can create an FSR.
 */
export const canCreateFSR = (user?: User | null): boolean => {
  if (!user) return false;
  if (isAdminOrManager(user)) return true;
  if (user.workType === 'OFFICE') return false;
  return isFSE(user);
};

/**
 * Determine if user can view an FSR.
 */
export const canViewFSR = (user?: User | null, fsr?: FsrPermissionTarget): boolean => {
  if (!user) return false;
  if (isAdminOrManager(user)) return true;
  if (user.workType === 'OFFICE') return false;
  if (!fsr) return isFSE(user);

  // FSE can view if assigned to them or if it's already active/completed
  if (isFSE(user)) {
    return fsr.serviceEngineerId === user.id || fsr.status !== 'DRAFT';
  }

  // Sales users can only view COMPLETED or CLOSED reports
  if (isSalesperson(user)) {
    return fsr.status === 'COMPLETED' || fsr.status === 'CLOSED';
  }

  return false;
};

/**
 * Determine if user can edit/modify an FSR.
 * Sales users can NEVER edit an FSR.
 */
export const canEditFSR = (user?: User | null, fsr?: FsrPermissionTarget): boolean => {
  if (!user || !fsr) return false;
  if (user.workType === 'OFFICE' && !isAdminOrManager(user)) return false;
  if (fsr.status === 'CLOSED' || fsr.status === 'CANCELLED') return false;
  if (isAdminOrManager(user)) return true;
  if (isSalesperson(user)) return false;

  return isFSE(user) && fsr.serviceEngineerId === user.id;
};

/**
 * Determine if user can start a service visit (DRAFT -> IN_PROGRESS).
 */
export const canStartFSR = (user?: User | null, fsr?: FsrPermissionTarget): boolean => {
  if (!user || !fsr) return false;
  if (user.workType === 'OFFICE' && !isAdminOrManager(user)) return false;
  if (fsr.status !== 'DRAFT') return false;
  if (isAdminOrManager(user)) return true;
  if (isSalesperson(user)) return false;

  return isFSE(user) && fsr.serviceEngineerId === user.id;
};

/**
 * Determine if user can complete an FSR (IN_PROGRESS -> COMPLETED).
 */
export const canCompleteFSR = (user?: User | null, fsr?: FsrPermissionTarget): boolean => {
  if (!user || !fsr) return false;
  if (user.workType === 'OFFICE' && !isAdminOrManager(user)) return false;
  if (fsr.status !== 'IN_PROGRESS') return false;
  if (isAdminOrManager(user)) return true;
  if (isSalesperson(user)) return false;

  return isFSE(user) && fsr.serviceEngineerId === user.id;
};

/**
 * Determine if user can capture customer or engineer signatures.
 */
export const canSignOffFSR = (user?: User | null, fsr?: FsrPermissionTarget): boolean => {
  if (!user || !fsr) return false;
  if (user.workType === 'OFFICE' && !isAdminOrManager(user)) return false;
  if (fsr.status === 'CLOSED' || fsr.status === 'CANCELLED') return false;
  if (isAdminOrManager(user)) return true;
  if (isSalesperson(user)) return false;

  return isFSE(user) && fsr.serviceEngineerId === user.id;
};

/**
 * Determine if user can download or share the official FSR PDF.
 */
export const canDownloadFSR = (user?: User | null, fsr?: FsrPermissionTarget): boolean => {
  if (!user || !fsr) return false;
  if (isAdminOrManager(user)) return true;
  if (user.workType === 'OFFICE') return false;
  if (isSalesperson(user)) {
    return fsr.status === 'COMPLETED' || fsr.status === 'CLOSED';
  }
  return fsr.serviceEngineerId === user.id || fsr.status !== 'DRAFT';
};

/**
 * Determine if user can assign or reassign service engineers.
 * Admin and Manager only.
 */
export const canAssignFSR = (user?: User | null): boolean => {
  return isAdminOrManager(user);
};

// Aliases for explicit naming conventions
export const canViewFieldService = canAccessFSR;
export const canCreateFieldService = canCreateFSR;
export const canEditFieldService = canEditFSR;
export const canStartFieldService = canStartFSR;
export const canCompleteFieldService = canCompleteFSR;
export const canAssignFieldService = canAssignFSR;
