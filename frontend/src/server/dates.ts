import { APP_TIME_ZONE } from '@/server/config';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function parseDate(value: string): Date {
  if (!DATE_PATTERN.test(value)) {
    throw new Error('Invalid date.');
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime()) || formatDate(date) !== value) {
    throw new Error('Invalid date.');
  }

  return date;
}

export function formatDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function monthRange(year: number, month: number): {
  endExclusive: Date;
  start: Date;
} {
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    endExclusive: new Date(Date.UTC(year, month, 1)),
  };
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function todayInAppTimeZone(now = new Date()): {
  day: number;
  month: number;
  year: number;
} {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(now);

  const numberPart = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return {
    year: numberPart('year'),
    month: numberPart('month'),
    day: numberPart('day'),
  };
}

export function todayDateStringInAppTimeZone(now = new Date()): string {
  const today = todayInAppTimeZone(now);

  return `${today.year}-${String(today.month).padStart(2, '0')}-${String(
    today.day,
  ).padStart(2, '0')}`;
}

export function compareYearMonth(
  left: { month: number; year: number },
  right: { month: number; year: number },
): number {
  return left.year * 12 + left.month - (right.year * 12 + right.month);
}
