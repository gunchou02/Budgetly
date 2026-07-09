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

export function formatMonthLabel(year, month) {
  return `${year}年${month}月`;
}
