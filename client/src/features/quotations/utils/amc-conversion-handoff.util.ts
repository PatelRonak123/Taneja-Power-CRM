export interface AmcConversionHandoff {
  conversionId: string;
  followUpId: string;
  equipmentId: string | null;
  customerId: string;
  customerName?: string;
  companyName?: string | null;
  assetNumber?: string;
  productName?: string;
  make?: string | null;
  model?: string | null;
  capacityRating?: string | null;
  warrantyEndDate?: string | null;
  amcStartDate?: string;
  amcEndDate?: string;
  createdAt?: number;
}

export const AMC_CONVERSION_STORAGE_KEY = 'pending_amc_conversion';

/**
 * Validates and retrieves the pending AMC conversion handoff payload.
 *
 * Requirements:
 * 1. An active conversion flow MUST provide a matching `conversionId` in the URL query string.
 * 2. If `conversionId` is missing from the query string, any stored conversion is considered
 *    abandoned/unrelated and is NOT consumed.
 * 3. If `conversionId` is provided, the session storage data must match the ID and customer ID.
 * 4. Stale payloads older than 24 hours are treated as expired.
 */
export function getValidatedAmcConversionHandoff(
  searchQuery?: string,
  storageOverride?: Storage
): {
  data: AmcConversionHandoff | null;
  isConversionFlow: boolean;
  error?: string;
} {
  const search =
    searchQuery !== undefined
      ? searchQuery
      : typeof window !== 'undefined'
        ? window.location.search
        : '';
  const storage =
    storageOverride !== undefined
      ? storageOverride
      : typeof sessionStorage !== 'undefined'
        ? sessionStorage
        : null;

  const params = new URLSearchParams(search);
  const conversionId = params.get('conversionId');

  if (!conversionId) {
    return { data: null, isConversionFlow: false };
  }

  if (!storage) {
    return {
      data: null,
      isConversionFlow: true,
      error: 'Storage is not available in the current environment.',
    };
  }

  const raw = storage.getItem(AMC_CONVERSION_STORAGE_KEY);
  if (!raw) {
    return {
      data: null,
      isConversionFlow: true,
      error: 'Conversion session reference was not found or has expired.',
    };
  }

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return {
        data: null,
        isConversionFlow: true,
        error: 'Malformed conversion data in session storage.',
      };
    }

    if (parsed.conversionId !== conversionId) {
      return {
        data: null,
        isConversionFlow: true,
        error: 'Conversion identifier does not match the active session.',
      };
    }

    if (!parsed.followUpId || !parsed.customerId) {
      return {
        data: null,
        isConversionFlow: true,
        error: 'Incomplete conversion data (missing follow-up or customer ID).',
      };
    }

    const urlCustomerId = params.get('customerId');
    if (urlCustomerId && parsed.customerId !== urlCustomerId) {
      return {
        data: null,
        isConversionFlow: true,
        error: 'Customer specified in navigation does not match conversion session customer.',
      };
    }

    // TTL check: 24 hours
    if (parsed.createdAt && typeof parsed.createdAt === 'number') {
      const MAX_AGE_MS = 24 * 60 * 60 * 1000;
      if (Date.now() - parsed.createdAt > MAX_AGE_MS) {
        return {
          data: null,
          isConversionFlow: true,
          error: 'Conversion session has expired (older than 24 hours).',
        };
      }
    }

    return {
      data: parsed as AmcConversionHandoff,
      isConversionFlow: true,
    };
  } catch {
    return {
      data: null,
      isConversionFlow: true,
      error: 'Failed to parse conversion session data.',
    };
  }
}

/**
 * Clears orphaned conversion handoffs from session storage if the current URL does not have an active conversion ID.
 */
export function pruneOrphanedAmcConversion(
  searchQuery?: string,
  storageOverride?: Storage
): void {
  const search =
    searchQuery !== undefined
      ? searchQuery
      : typeof window !== 'undefined'
        ? window.location.search
        : '';
  const storage =
    storageOverride !== undefined
      ? storageOverride
      : typeof sessionStorage !== 'undefined'
        ? sessionStorage
        : null;

  if (!storage) return;

  const params = new URLSearchParams(search);
  const conversionId = params.get('conversionId');

  if (!conversionId) {
    storage.removeItem(AMC_CONVERSION_STORAGE_KEY);
  }
}
