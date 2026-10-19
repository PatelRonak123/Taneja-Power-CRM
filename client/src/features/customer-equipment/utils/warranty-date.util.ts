export type WarrantyDurationUnit = 'MONTHS' | 'YEARS';

export interface WarrantyDateCalculationInput {
  /** Installation / commissioning date as YYYY-MM-DD string, ISO string, or Date object */
  installationDate: string | Date;
  /** Positive integer duration value */
  durationValue: number;
  /** Duration unit: MONTHS or YEARS */
  durationUnit: WarrantyDurationUnit;
}

export interface WarrantyDateCalculationResult {
  /** Installation date string in YYYY-MM-DD format */
  installationDateStr: string;
  /** Warranty start date timestamp (start of day UTC) */
  warrantyStartDate: Date;
  /** Final covered calendar day in YYYY-MM-DD format */
  warrantyEndDateStr: string;
  /** Final covered calendar day timestamp (end of day 23:59:59.999 UTC) */
  warrantyEndDate: Date;
  /** Proposed AMC start date (the calendar day after warranty expiry) in YYYY-MM-DD format */
  proposedAmcStartDateStr: string;
  /** Proposed AMC start date timestamp (start of day UTC) */
  proposedAmcStartDate: Date;
  /** Stable warranty cycle identifier, e.g. WC-YYYY-MM-DD */
  warrantyCycle: string;
}

/**
 * Returns true if the specified year is a leap year in the Gregorian calendar.
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Returns the number of days in the specified month of a given year (1-indexed month 1..12).
 */
export function getDaysInMonth(year: number, month: number): number {
  switch (month) {
    case 1: // January
    case 3: // March
    case 5: // May
    case 7: // July
    case 8: // August
    case 10: // October
    case 12: // December
      return 31;
    case 4: // April
    case 6: // June
    case 9: // September
    case 11: // November
      return 30;
    case 2: // February
      return isLeapYear(year) ? 29 : 28;
    default:
      throw new Error(`Invalid month: ${month}`);
  }
}

/**
 * Parses an input date into calendar components { year, month, day } in a timezone-independent manner.
 * Supports:
 * - YYYY-MM-DD strings
 * - ISO 8601 strings
 * - JavaScript Date objects
 */
export function parseCalendarDate(input: string | Date): { year: number; month: number; day: number } {
  if (typeof input === 'string') {
    const trimmed = input.trim();
    const dateOnlyMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!dateOnlyMatch) {
      throw new Error(`Invalid date format "${input}". Expected YYYY-MM-DD or ISO 8601 string.`);
    }
    const year = parseInt(dateOnlyMatch[1], 10);
    const month = parseInt(dateOnlyMatch[2], 10);
    const day = parseInt(dateOnlyMatch[3], 10);

    if (month < 1 || month > 12) {
      throw new Error(`Invalid month ${month} in date "${input}".`);
    }
    const maxDays = getDaysInMonth(year, month);
    if (day < 1 || day > maxDays) {
      throw new Error(`Invalid day ${day} for month ${month} in year ${year}. Maximum is ${maxDays}.`);
    }

    return { year, month, day };
  } else if (input instanceof Date) {
    if (isNaN(input.getTime())) {
      throw new Error('Invalid Date object provided.');
    }
    return {
      year: input.getUTCFullYear(),
      month: input.getUTCMonth() + 1,
      day: input.getUTCDate(),
    };
  }

  throw new Error('Installation date must be a valid string or Date object.');
}

/**
 * Formats calendar components into a standard YYYY-MM-DD string.
 */
export function formatCalendarDate(year: number, month: number, day: number): string {
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

/**
 * Adds months to a calendar date using standard month-end clamping (preventing accidental month rollover).
 * Example: 2024-02-29 + 12 months -> 2025-02-28.
 */
export function addMonthsToCalendarDate(
  year: number,
  month: number,
  day: number,
  monthsToAdd: number
): { year: number; month: number; day: number } {
  const totalMonths = year * 12 + (month - 1) + monthsToAdd;
  const newYear = Math.floor(totalMonths / 12);
  const newMonth = (totalMonths % 12) + 1;
  const maxDay = getDaysInMonth(newYear, newMonth);
  const newDay = Math.min(day, maxDay);

  return { year: newYear, month: newMonth, day: newDay };
}

/**
 * Subtracts one calendar day from a calendar date.
 */
export function subtractOneDayFromCalendarDate(
  year: number,
  month: number,
  day: number
): { year: number; month: number; day: number } {
  if (day > 1) {
    return { year, month, day: day - 1 };
  }

  let prevYear = year;
  let prevMonth = month - 1;
  if (prevMonth < 1) {
    prevMonth = 12;
    prevYear -= 1;
  }
  const prevDay = getDaysInMonth(prevYear, prevMonth);
  return { year: prevYear, month: prevMonth, day: prevDay };
}

/**
 * Adds one calendar day to a calendar date.
 */
export function addDaysToCalendarDate(
  year: number,
  month: number,
  day: number,
  daysToAdd: number
): { year: number; month: number; day: number } {
  let curYear = year;
  let curMonth = month;
  let curDay = day;

  for (let i = 0; i < daysToAdd; i++) {
    const maxDays = getDaysInMonth(curYear, curMonth);
    if (curDay < maxDays) {
      curDay += 1;
    } else {
      curDay = 1;
      if (curMonth === 12) {
        curMonth = 1;
        curYear += 1;
      } else {
        curMonth += 1;
      }
    }
  }

  return { year: curYear, month: curMonth, day: curDay };
}

/**
 * Deterministically calculates warranty lifecycle dates based on installation date and duration.
 * Matching the exact backend algorithm:
 * 1. Start date = Installation Date
 * 2. Final covered day = Installation Date + Duration - 1 Calendar Day
 * 3. Proposed AMC start date = Final covered day + 1 Calendar Day (= Installation Date + Duration)
 */
export function calculateWarrantyDates(input: WarrantyDateCalculationInput): WarrantyDateCalculationResult {
  const { installationDate, durationValue, durationUnit } = input;

  if (!Number.isInteger(durationValue) || durationValue <= 0) {
    throw new Error('Warranty duration value must be a positive integer greater than zero.');
  }

  if (durationUnit !== 'MONTHS' && durationUnit !== 'YEARS') {
    throw new Error('Warranty duration unit must be either "MONTHS" or "YEARS".');
  }

  const { year, month, day } = parseCalendarDate(installationDate);
  const installationDateStr = formatCalendarDate(year, month, day);

  const monthsToAdd = durationUnit === 'YEARS' ? durationValue * 12 : durationValue;
  const rawTarget = addMonthsToCalendarDate(year, month, day, monthsToAdd);
  const proposedAmcStartDateStr = formatCalendarDate(rawTarget.year, rawTarget.month, rawTarget.day);

  const expiryDate = subtractOneDayFromCalendarDate(rawTarget.year, rawTarget.month, rawTarget.day);
  const warrantyEndDateStr = formatCalendarDate(expiryDate.year, expiryDate.month, expiryDate.day);

  const warrantyCycle = `WC-${warrantyEndDateStr}`;

  const warrantyStartDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const warrantyEndDate = new Date(Date.UTC(expiryDate.year, expiryDate.month - 1, expiryDate.day, 23, 59, 59, 999));
  const proposedAmcStartDate = new Date(Date.UTC(rawTarget.year, rawTarget.month - 1, rawTarget.day, 0, 0, 0, 0));

  return {
    installationDateStr,
    warrantyStartDate,
    warrantyEndDateStr,
    warrantyEndDate,
    proposedAmcStartDateStr,
    proposedAmcStartDate,
    warrantyCycle,
  };
}

/**
 * Calculates proposed AMC start and end dates based on warranty end date.
 * Proposed AMC Start Date is the next calendar day after warranty end date.
 * Proposed AMC End Date is exactly 1 calendar year (12 months) later minus 1 day.
 */
export function calculateAmcDatesFromWarrantyEnd(warrantyEndDate: string | Date): {
  proposedAmcStartDate: string;
  proposedAmcEndDate: string;
} {
  const cal = parseCalendarDate(warrantyEndDate);
  // AMC start is warrantyEndDate + 1 day
  const startCal = addDaysToCalendarDate(cal.year, cal.month, cal.day, 1);
  // AMC end is startCal + 12 months - 1 day
  const endPlus12 = addMonthsToCalendarDate(startCal.year, startCal.month, startCal.day, 12);
  const endCal = subtractOneDayFromCalendarDate(endPlus12.year, endPlus12.month, endPlus12.day);
  return {
    proposedAmcStartDate: formatCalendarDate(startCal.year, startCal.month, startCal.day),
    proposedAmcEndDate: formatCalendarDate(endCal.year, endCal.month, endCal.day),
  };
}
