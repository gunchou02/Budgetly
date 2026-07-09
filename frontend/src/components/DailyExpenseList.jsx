import { formatYen, getDateValue } from '../utils/formatters';
import { getSubscriptionOccurrenceDate } from '../utils/subscriptions';

function DailyExpenseList({ expenses, subscriptions, selectedDate, onEdit, onDelete }) {
  const [year, month] = selectedDate.split('-').map(Number);
  const selectedExpenses = expenses.filter((expense) => getDateValue(expense.spent_at) === selectedDate);
  const selectedSubscriptions = subscriptions.filter((subscription) => {
    return getSubscriptionOccurrenceDate(year, month, subscription) === selectedDate;
  });
  const total = [...selectedExpenses, ...selectedSubscriptions].reduce(
    (sum, item) => sum + Number(item.amount),
    0,
  );

  return (
    <section className="panel daily-list-panel">
      <div className="panel-header split">
        <div>
          <h2>この日の支出</h2>
          <p className="muted-text">{selectedDate}</p>
        </div>
        <strong>{formatYen(total)}</strong>
      </div>

      <div className="daily-expense-list expanded">
        {selectedSubscriptions.map((subscription) => (
          <div key={`subscription-${subscription.id}`} className="daily-expense-item subscription-item">
            <div>
              <strong>{subscription.name}</strong>
              <span>固定費・サブスク</span>
            </div>
            <strong>{formatYen(subscription.amount)}</strong>
          </div>
        ))}
        {selectedExpenses.map((expense) => (
          <div key={expense.id} className="daily-expense-item">
            <div>
              <strong>{expense.title}</strong>
              <span>{expense.category?.name}</span>
            </div>
            <strong>{formatYen(expense.amount)}</strong>
            <div className="row-actions">
              <button type="button" className="secondary-button" onClick={() => onEdit(expense)}>
                編集
              </button>
              <button type="button" className="danger-button" onClick={() => onDelete(expense.id)}>
                削除
              </button>
            </div>
          </div>
        ))}
        {selectedExpenses.length === 0 && selectedSubscriptions.length === 0 && (
          <p className="muted-text">この日の支出はまだありません。</p>
        )}
      </div>
    </section>
  );
}

export default DailyExpenseList;
