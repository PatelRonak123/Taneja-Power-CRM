import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateWarrantyDates,
  isLeapYear,
  getDaysInMonth,
  parseCalendarDate,
  addMonthsToCalendarDate,
  subtractOneDayFromCalendarDate,
  addDaysToCalendarDate,
  calculateAmcDatesFromWarrantyEnd,
} from '../utils/warranty-date.util.js';

describe('Client: Warranty Date Utility Tests', () => {
  it('1. Standard 12-month warranty: 2026-10-15 -> expiry 2027-10-14, AMC start 2027-10-15', () => {
    const result = calculateWarrantyDates({
      installationDate: '2026-10-15',
      durationValue: 12,
      durationUnit: 'MONTHS',
    });

    assert.equal(result.installationDateStr, '2026-10-15');
    assert.equal(result.warrantyEndDateStr, '2027-10-14');
    assert.equal(result.proposedAmcStartDateStr, '2027-10-15');
    assert.equal(result.warrantyCycle, 'WC-2027-10-14');
    assert.equal(result.warrantyStartDate.toISOString(), '2026-10-15T00:00:00.000Z');
    assert.equal(result.warrantyEndDate.toISOString(), '2027-10-14T23:59:59.999Z');
    assert.equal(result.proposedAmcStartDate.toISOString(), '2027-10-15T00:00:00.000Z');
  });

  it('2. Leap-year installation: 2024-02-29 + 1 YEARS -> expiry 2025-02-27, AMC start 2025-02-28', () => {
    const result = calculateWarrantyDates({
      installationDate: '2024-02-29',
      durationValue: 1,
      durationUnit: 'YEARS',
    });

    assert.equal(result.installationDateStr, '2024-02-29');
    assert.equal(result.warrantyEndDateStr, '2025-02-27');
    assert.equal(result.proposedAmcStartDateStr, '2025-02-28');
    assert.equal(result.warrantyCycle, 'WC-2025-02-27');
  });

  it('3. Month-end addition without rollover: 2026-01-31 + 1 MONTHS -> expiry 2026-02-27, AMC start 2026-02-28', () => {
    const result = calculateWarrantyDates({
      installationDate: '2026-01-31',
      durationValue: 1,
      durationUnit: 'MONTHS',
    });

    assert.equal(result.installationDateStr, '2026-01-31');
    assert.equal(result.warrantyEndDateStr, '2026-02-27');
    assert.equal(result.proposedAmcStartDateStr, '2026-02-28');
  });

  it('4. Multi-year duration: 2026-05-10 + 2 YEARS -> expiry 2028-05-09, AMC start 2028-05-10', () => {
    const result = calculateWarrantyDates({
      installationDate: '2026-05-10',
      durationValue: 2,
      durationUnit: 'YEARS',
    });

    assert.equal(result.installationDateStr, '2026-05-10');
    assert.equal(result.warrantyEndDateStr, '2028-05-09');
    assert.equal(result.proposedAmcStartDateStr, '2028-05-10');
  });

  it('5. 6-month warranty: 2026-03-31 + 6 MONTHS -> 2026-09-30, expiry 2026-09-29, AMC 2026-09-30', () => {
    const result = calculateWarrantyDates({
      installationDate: '2026-03-31',
      durationValue: 6,
      durationUnit: 'MONTHS',
    });

    assert.equal(result.installationDateStr, '2026-03-31');
    assert.equal(result.warrantyEndDateStr, '2026-09-29');
    assert.equal(result.proposedAmcStartDateStr, '2026-09-30');
  });

  it('6. Validation errors for invalid inputs', () => {
    assert.throws(
      () => calculateWarrantyDates({ installationDate: 'invalid', durationValue: 12, durationUnit: 'MONTHS' }),
      /Invalid date format/
    );
    assert.throws(
      () => calculateWarrantyDates({ installationDate: '2026-10-15', durationValue: 0, durationUnit: 'MONTHS' }),
      /positive integer/
    );
    assert.throws(
      () => calculateWarrantyDates({ installationDate: '2026-10-15', durationValue: -1, durationUnit: 'MONTHS' }),
      /positive integer/
    );
  });

  it('7. Direct helper arithmetic: leap year, days in month, calendar arithmetic', () => {
    assert.equal(isLeapYear(2024), true);
    assert.equal(isLeapYear(2025), false);
    assert.equal(getDaysInMonth(2024, 2), 29);
    assert.equal(getDaysInMonth(2025, 2), 28);

    const parsed = parseCalendarDate('2026-10-15');
    assert.deepEqual(parsed, { year: 2026, month: 10, day: 15 });

    const addedMonths = addMonthsToCalendarDate(2026, 1, 31, 1);
    assert.deepEqual(addedMonths, { year: 2026, month: 2, day: 28 });

    const subDay = subtractOneDayFromCalendarDate(2026, 3, 1);
    assert.deepEqual(subDay, { year: 2026, month: 2, day: 28 });

    const addDay = addDaysToCalendarDate(2026, 2, 28, 1);
    assert.deepEqual(addDay, { year: 2026, month: 3, day: 1 });
  });

  it('8. calculateAmcDatesFromWarrantyEnd: Standard, leap-year, and month-end transitions', () => {
    // Standard 1-year: warranty ends 2027-10-14 -> AMC 2027-10-15 to 2028-10-14
    const std = calculateAmcDatesFromWarrantyEnd('2027-10-14');
    assert.equal(std.proposedAmcStartDate, '2027-10-15');
    assert.equal(std.proposedAmcEndDate, '2028-10-14');

    // Leap-year: warranty ends 2024-02-28 -> AMC starts 2024-02-29, ends 2025-02-27
    const leap = calculateAmcDatesFromWarrantyEnd('2024-02-28');
    assert.equal(leap.proposedAmcStartDate, '2024-02-29');
    assert.equal(leap.proposedAmcEndDate, '2025-02-27');

    // Month-end: warranty ends 2026-01-31 -> AMC starts 2026-02-01, ends 2027-01-31
    const mEnd = calculateAmcDatesFromWarrantyEnd('2026-01-31');
    assert.equal(mEnd.proposedAmcStartDate, '2026-02-01');
    assert.equal(mEnd.proposedAmcEndDate, '2027-01-31');
  });
});

