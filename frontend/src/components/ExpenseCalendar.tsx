import { formatDateValue, getDateValue, formatYen } from '../utils/formatters';
import { getSubscriptionOccurrenceDate } from '../utils/subscriptions';
import type { Expense, Subscription } from '@/types/api';

const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

function buildDateValue(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

interface CalendarDay {
  day: number;
  date: string;
  weekDay: number;
}

function buildCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month - 1, 1);
  const lastDate = new Date(year, month, 0).getDate();
  const days: Array<CalendarDay | null> = [];

  for (let index = 0; index < firstDay.getDay(); index += 1) {
    days.push(null);
  }

  for (let day = 1; day <= lastDate; day += 1) {
    const date = buildDateValue(year, month, day);

    days.push({
      day,
      date,
      weekDay: new Date(year, month - 1, day).getDay(),
    });
  }

  return days;
}

interface ExpenseCalendarProps {
  year: number;
  month: number;
  expenses: Expense[];
  subscriptions: Subscription[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

interface CalendarSubscriptionItem {
  id: string;
  name: string;
  amount: number;
}

function ExpenseCalendar({ year, month, expenses, subscriptions, selectedDate, onSelectDate }: ExpenseCalendarProps) {
  const calendarDays = buildCalendarDays(year, month);
  const today = formatDateValue();
  const expenseTotalsByDate = expenses.reduce<Record<string, number>>((totals, expense) => {
    const date = getDateValue(expense.spent_at);
    totals[date] = (totals[date] ?? 0) + Number(expense.amount);
    return totals;
  }, {});
  const recurringItemsByDate = subscriptions.reduce<Record<string, CalendarSubscriptionItem[]>>((items, subscription) => {
    const occurrenceDate = getSubscriptionOccurrenceDate(year, month, subscription);

    if (occurrenceDate) {
      items[occurrenceDate] = [
        ...(items[occurrenceDate] ?? []),
        {
          id: `subscription-${subscription.id}`,
          name: subscription.name,
          amount: Number(subscription.amount),
        },
      ];
    }

    return items;
  }, {});

  return (
    <section className="panel calendar-panel">
      <div className="panel-header">
        <h2>カレンダー</h2>
      </div>
      <div className="calendar-weekdays">
        {weekDays.map((weekDay, index) => (
          <span
            key={weekDay}
            className={[
              index === 0 ? 'sunday' : '',
              index === 6 ? 'saturday' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {weekDay}
          </span>
        ))}
      </div>
      <div className="calendar-grid">
        {calendarDays.map((day, index) => {
          if (!day) {
            return <span key={`blank-${index}`} className="calendar-blank" />;
          }

          const expenseTotal = expenseTotalsByDate[day.date] ?? 0;
          const recurringItems = recurringItemsByDate[day.date] ?? [];
          const recurringTotal = recurringItems.reduce((sum, item) => sum + item.amount, 0);
          const ariaDetails = [
            expenseTotal > 0 ? `通常支出 ${formatYen(expenseTotal)}` : '',
            recurringTotal > 0 ? `固定費 ${formatYen(recurringTotal)}` : '',
          ]
            .filter(Boolean)
            .join('、');

          return (
            <button
              key={day.date}
              type="button"
              className={[
                'calendar-day',
                day.date === selectedDate ? 'selected' : '',
                day.date === today ? 'today' : '',
                day.weekDay === 0 ? 'sunday' : '',
                day.weekDay === 6 ? 'saturday' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-label={`${month}月${day.day}日${ariaDetails ? `、${ariaDetails}` : '、支出なし'}`}
              aria-pressed={day.date === selectedDate}
              aria-current={day.date === today ? 'date' : undefined}
              onClick={() => onSelectDate(day.date)}
            >
              <span className="calendar-day-number">{day.day}</span>
              <span className="calendar-mobile-indicators" aria-hidden="true">
                {expenseTotal > 0 && <span className="expense-dot" />}
                {recurringItems.length > 0 && <span className="recurring-dot" />}
              </span>
              <div className="calendar-day-amounts">
                {expenseTotal > 0 ? (
                  <small className="calendar-expense-total">
                    <strong>{formatYen(expenseTotal)}</strong>
                  </small>
                ) : null}
                {recurringItems.slice(0, 2).map((item) => (
                  <small key={item.id} className="calendar-item-line recurring">
                    <span>{item.name}</span>
                    <strong>{formatYen(item.amount)}</strong>
                  </small>
                ))}
                {recurringItems.length > 2 ? <small>他 {recurringItems.length - 2}件</small> : null}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default ExpenseCalendar;
