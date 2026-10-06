/**
 * AMC Contract Duration and Preventive Visit Calculation Utilities
 *
 * Implements authoritative calendar-month duration calculation and
 * preventive maintenance visit calculations based on standard industry intervals:
 *   - Monthly: 1 month interval (12 visits per 12 months)
 *   - Bi-Monthly: 2 months interval (6 visits per 12 months)
 *   - Quarterly: 3 months interval (4 visits per 12 months)
 *   - Half-Yearly: 6 months interval (2 visits per 12 months)
 *   - Yearly: 12 months interval (1 visit per 12 months)
 */

/**
 * Calculates the calendar-month duration of an AMC contract.
 *
 * Examples:
 *   - 2026-10-02 to 2027-10-02 -> 12 months
 *   - 2026-10-02 to 2027-10-01 (anniversary minus 1 day) -> 12 months
 *   - 2026-01-01 to 2026-12-31 -> 12 months
 *   - 2026-10-02 to 2027-04-02 -> 6 months
 *   - 2026-10-02 to 2027-01-02 -> 3 months
 *   - 2026-10-02 to 2026-11-02 -> 1 month
 *   - Invalid or inverted date range -> 0 months
 */
export function calculateContractDurationMonths(
  startDateInput: string | Date | null | undefined,
  endDateInput: string | Date | null | undefined
): number {
  if (!startDateInput || !endDateInput) return 0;

  let start: Date;
  let end: Date;

  if (typeof startDateInput === 'string') {
    const parts = startDateInput.split('T')[0].split('-');
    if (parts.length === 3) {
      start = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    } else {
      start = new Date(startDateInput);
    }
  } else {
    start = new Date(startDateInput.getFullYear(), startDateInput.getMonth(), startDateInput.getDate());
  }

  if (typeof endDateInput === 'string') {
    const parts = endDateInput.split('T')[0].split('-');
    if (parts.length === 3) {
      end = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    } else {
      end = new Date(endDateInput);
    }
  } else {
    end = new Date(endDateInput.getFullYear(), endDateInput.getMonth(), endDateInput.getDate());
  }

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  if (end < start) return 0;

  const startYear = start.getFullYear();
  const startMonth = start.getMonth();
  const startDay = start.getDate();

  // If next day reaches anniversary day boundary (e.g. 02-10-2026 to 01-10-2027 or 01-01-2026 to 31-12-2026)
  const nextDay = new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1);
  if (nextDay.getDate() === startDay) {
    const totalMonths = (nextDay.getFullYear() - startYear) * 12 + (nextDay.getMonth() - startMonth);
    return Math.max(0, totalMonths);
  }

  // Exact anniversary day match (e.g. 02-10-2026 to 02-10-2027)
  if (end.getDate() === startDay) {
    const totalMonths = (end.getFullYear() - startYear) * 12 + (end.getMonth() - startMonth);
    return Math.max(0, totalMonths);
  }

  // Calendar month difference adjusted for partial days
  let months = (end.getFullYear() - startYear) * 12 + (end.getMonth() - startMonth);
  if (end.getDate() < startDay) {
    months = Math.max(0, months - 1);
  }

  return Math.max(0, months);
}

/**
 * Maps a preventive maintenance frequency label or code to its interval in months.
 */
export function getFrequencyIntervalMonths(frequency: string | null | undefined): number | null {
  if (!frequency) return null;
  const f = frequency.trim().toUpperCase().replace(/[\s_]+/g, '-');

  if (f === 'MONTHLY') return 1;
  if (f === 'BI-MONTHLY') return 2;
  if (f === 'QUARTERLY') return 3;
  if (f === 'HALF-YEARLY') return 6;
  if (f === 'YEARLY') return 12;

  // Normalized substring matches
  if (f.includes('BI-MONTHLY')) return 2;
  if (f.includes('HALF')) return 6;
  if (f.includes('MONTHLY')) return 1;
  if (f.includes('QUARTER')) return 3;
  if (f.includes('YEAR')) return 12;

  return null;
}

/**
 * Calculates the number of scheduled preventive visits that fit into the contract period.
 *
 * Expected rules:
 *   12 months + Monthly -> 12 visits
 *   12 months + Bi-Monthly -> 6 visits
 *   12 months + Quarterly -> 4 visits
 *   12 months + Half-Yearly -> 2 visits
 *   12 months + Yearly -> 1 visit
 *
 *   6 months + Monthly -> 6 visits
 *   6 months + Bi-Monthly -> 3 visits
 *   6 months + Quarterly -> 2 visits
 *   6 months + Half-Yearly -> 1 visit
 *
 *   3 months + Monthly -> 3 visits
 *   3 months + Bi-Monthly -> 1 visit
 *   3 months + Quarterly -> 1 visit
 *
 *   Invalid date range -> 0 visits
 */
export function calculatePreventiveVisits(
  startDate: string | Date | null | undefined,
  endDate: string | Date | null | undefined,
  frequency: string | null | undefined
): number {
  const durationMonths = calculateContractDurationMonths(startDate, endDate);
  if (durationMonths <= 0) return 0;

  const intervalMonths = getFrequencyIntervalMonths(frequency);
  if (!intervalMonths || intervalMonths <= 0) {
    return 0;
  }

  return Math.floor(durationMonths / intervalMonths);
}
