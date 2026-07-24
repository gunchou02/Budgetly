import { describe, expect, it } from 'vitest';
import {
  daysInMonth,
  formatDate,
  monthRange,
  parseDate,
  todayDateStringInAppTimeZone,
} from '@/server/dates';

describe('date helpers', () => {
  it('validates and round-trips calendar dates', () => {
    expect(formatDate(parseDate('2026-07-24'))).toBe('2026-07-24');
    expect(() => parseDate('2026-02-30')).toThrow('Invalid date.');
    expect(() => parseDate('24-07-2026')).toThrow('Invalid date.');
  });

  it('builds an exclusive month range', () => {
    expect(monthRange(2026, 12)).toEqual({
      start: new Date('2026-12-01T00:00:00.000Z'),
      endExclusive: new Date('2027-01-01T00:00:00.000Z'),
    });
  });

  it('handles leap years and Tokyo calendar dates', () => {
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(
      todayDateStringInAppTimeZone(
        new Date('2026-07-23T16:00:00.000Z'),
      ),
    ).toBe('2026-07-24');
  });
});
