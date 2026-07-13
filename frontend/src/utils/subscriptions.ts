import { getDateValue } from './formatters';
import type { Subscription } from '@/types/api';

export function getSubscriptionBillingDate(year: number, month: number, subscription: Subscription) {
  const lastDate = new Date(year, month, 0).getDate();
  const billingDay = Math.min(Number(subscription.billing_day), lastDate);

  return `${year}-${String(month).padStart(2, '0')}-${String(billingDay).padStart(2, '0')}`;
}

export function getSubscriptionOccurrenceDate(year: number, month: number, subscription: Subscription) {
  const billingDate = getSubscriptionBillingDate(year, month, subscription);
  const startedAt = getDateValue(subscription.started_at);
  const canceledAt = getDateValue(subscription.canceled_at);
  const monthValue = `${year}-${String(month).padStart(2, '0')}`;

  if (startedAt && startedAt.slice(0, 7) > monthValue) {
    return null;
  }

  const occurrenceDate = startedAt?.slice(0, 7) === monthValue && startedAt > billingDate ? startedAt : billingDate;

  if (canceledAt && canceledAt < occurrenceDate) {
    return null;
  }

  return occurrenceDate;
}

export function isSubscriptionBillableOnDate(subscription: Subscription, billingDate: string) {
  const startedAt = getDateValue(subscription.started_at);
  const canceledAt = getDateValue(subscription.canceled_at);

  if (startedAt && startedAt > billingDate) {
    return false;
  }

  return !canceledAt || canceledAt >= billingDate;
}
