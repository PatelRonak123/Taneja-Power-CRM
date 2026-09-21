import { User } from '../../../stores/authStore';
import { FsrStatus } from '../types/field-service.types';

/**
 * Check if the user has Admin or Service Manager privileges.
 */
export const isAdminOrManager = (user?: User | null): boolean => {
  if (!user) return false;
  return user.role === 'ADMIN' || user.role === 'MANAGER';
};

/**
 * Check if the user is a Salesperson (Read-Only access to FSRs).
 * In this CRM, employees with USER role and sales-oriented designations are strictly read-only for field service reports.
 */
export const isSalesperson = (user?: User | null): boolean => {
  if (!user) return false;
  if (user.role === 'ADMIN' || user.role === 'MANAGER') return false;

  const designation = (user.designation || '').toLowerCase();
  // Exclude HR, Accounting, Admin, Operations
  if (
    designation.includes('accountant') ||
    designation.includes('accounting') ||
    designation.includes('finance') ||
    designation.includes('hr') ||
    designation.includes('admin')
  ) {
    return false;
  }

  const salesKeywords = ['sales', 'representative', 'executive', 'business dev', 'account manager', 'account exec', 'bd'];
  const engineeringKeywords = ['engineer', 'tech', 'service', 'fse', 'electrician', 'technician'];

  // If explicitly designated as engineer/technician/service, they are FSE
  if (engineeringKeywords.some((k) => designation.includes(k))) {
    return false;
  }

  // If explicitly designated as sales
  if (salesKeywords.some((k) => designation.includes(k))) {
    return true;
  }

  return false;
};

/**
 * Check if the user functions as a Field Service Engineer / Technician.
 * Admins/Managers also have operational oversight access.
 */
export const isFse = (user?: User | null): boolean => {
  if (!user) return false;
  if (isAdminOrManager(user)) return true;
  return !isSalesperson(user);
};

/**
 * Determine if the authenticated user can create a new FSR.
 * Salespersons cannot create FSRs.
 */
export const canCreateFsr = (user?: User | null): boolean => {
  if (!user) return false;
  if (isAdminOrManager(user)) return true;
  return isFse(user);
};

/**
 * Determine if the user has access to the "My Visits" FSE schedule view.
 * Salespersons are not shown the FSE field schedule.
 */
export const canAccessMyVisits = (user?: User | null): boolean => {
  if (!user) return false;
  if (isAdminOrManager(user)) return true;
  return isFse(user);
};

/**
 * Check if the user can edit/modify an existing FSR.
 * Admin/Manager or the assigned FSE (if not CLOSED or CANCELLED).
 */
export const canEditFsr = (
  user: User | null | undefined,
  fsr: { serviceEngineerId: string; status: FsrStatus | string }
): boolean => {
  if (!user) return false;
  if (fsr.status === 'CLOSED' || fsr.status === 'CANCELLED') return false;
  if (isAdminOrManager(user)) return true;
  if (isSalesperson(user)) return false;
  return fsr.serviceEngineerId === user.id;
};

/**
 * Check if the user can start a service visit (DRAFT -> IN_PROGRESS).
 */
export const canStartFsr = (
  user: User | null | undefined,
  fsr: { serviceEngineerId: string; status: FsrStatus | string }
): boolean => {
  if (!user) return false;
  if (fsr.status !== 'DRAFT') return false;
  if (isAdminOrManager(user)) return true;
  if (isSalesperson(user)) return false;
  return fsr.serviceEngineerId === user.id;
};

/**
 * Check if the user can mark an FSR as COMPLETED (IN_PROGRESS -> COMPLETED).
 */
export const canCompleteFsr = (
  user: User | null | undefined,
  fsr: { serviceEngineerId: string; status: FsrStatus | string }
): boolean => {
  if (!user) return false;
  if (fsr.status !== 'IN_PROGRESS') return false;
  if (isAdminOrManager(user)) return true;
  if (isSalesperson(user)) return false;
  return fsr.serviceEngineerId === user.id;
};

/**
 * Check if the user can formally close an FSR (COMPLETED -> CLOSED).
 * Admin / Manager only.
 */
export const canCloseFsr = (
  user: User | null | undefined,
  fsr: { status: FsrStatus | string }
): boolean => {
  if (!user) return false;
  if (fsr.status !== 'COMPLETED') return false;
  return isAdminOrManager(user);
};

/**
 * Check if the user can cancel an FSR.
 * Admin / Manager only (cannot cancel already CLOSED or CANCELLED).
 */
export const canCancelFsr = (
  user: User | null | undefined,
  fsr: { status: FsrStatus | string }
): boolean => {
  if (!user) return false;
  if (fsr.status === 'CLOSED' || fsr.status === 'CANCELLED') return false;
  return isAdminOrManager(user);
};

/**
 * Check if the user can reassign the FSE on an FSR.
 * Admin / Manager only.
 */
export const canAssignFse = (
  user: User | null | undefined,
  fsr: { status: FsrStatus | string }
): boolean => {
  if (!user) return false;
  if (fsr.status === 'CLOSED' || fsr.status === 'CANCELLED') return false;
  return isAdminOrManager(user);
};

/**
 * Check if the user can record signatures / sign-off.
 */
export const canSignFsr = (
  user: User | null | undefined,
  fsr: { serviceEngineerId: string; status: FsrStatus | string }
): boolean => {
  if (!user) return false;
  if (fsr.status === 'CLOSED' || fsr.status === 'CANCELLED') return false;
  if (isAdminOrManager(user)) return true;
  if (isSalesperson(user)) return false;
  return fsr.serviceEngineerId === user.id;
};

/**
 * Check if the user can upload attachments.
 */
export const canMutateAttachments = (
  user: User | null | undefined,
  fsr: { serviceEngineerId: string; status: FsrStatus | string }
): boolean => {
  if (!user) return false;
  if (fsr.status === 'CLOSED' || fsr.status === 'CANCELLED') return false;
  if (isAdminOrManager(user)) return true;
  if (isSalesperson(user)) return false;
  return fsr.serviceEngineerId === user.id;
};

/**
 * Check if the user can delete an attachment.
 */
export const canDeleteAttachment = (
  user: User | null | undefined,
  fsr: { serviceEngineerId: string; status: FsrStatus | string },
  attachment: { uploadedById?: string | null }
): boolean => {
  if (!user) return false;
  if (fsr.status === 'CLOSED' || fsr.status === 'CANCELLED') return false;
  if (isAdminOrManager(user)) return true;
  if (isSalesperson(user)) return false;
  return attachment.uploadedById === user.id || fsr.serviceEngineerId === user.id;
};

/**
 * Check if the user can delete an entire FSR.
 * Admin only, or Manager for DRAFT status.
 */
export const canDeleteFsr = (
  user: User | null | undefined,
  fsr: { status: FsrStatus | string }
): boolean => {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  if (user.role === 'MANAGER' && fsr.status === 'DRAFT') return true;
  return false;
};

/**
 * Check if the user can download / view the official FSR PDF.
 * - ADMIN / MANAGER: always allowed
 * - FSE: allowed for assigned FSRs or any non-draft FSR
 * - SALESPERSON: allowed for COMPLETED or CLOSED FSRs
 */
export const canDownloadFsr = (
  user: User | null | undefined,
  fsr: { serviceEngineerId?: string | null; status: FsrStatus | string }
): boolean => {
  if (!user) return false;
  if (isAdminOrManager(user)) return true;
  if (isSalesperson(user)) {
    return fsr.status === 'COMPLETED' || fsr.status === 'CLOSED';
  }
  // For FSE / Operational User
  return fsr.serviceEngineerId === user.id || fsr.status !== 'DRAFT';
};

