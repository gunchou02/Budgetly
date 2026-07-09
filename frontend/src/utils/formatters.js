export function formatYen(value) {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

export function getCurrentYearMonth() {
  const now = new Date();

  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  };
}

export function formatDateValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function getDateValue(value) {
  if (!value) {
    return '';
  }

  if (typeof value === 'string' && !value.includes('T')) {
    return value.slice(0, 10);
  }

  return formatDateValue(new Date(value));
}

export function formatMonthLabel(year, month) {
  return `${year}年${month}月`;
}
