const dateTimeFormatter = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'short',
  timeStyle: 'medium',
  timeZone: 'America/Argentina/Cordoba',
});

const moneyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatDateTime(date: string | number | Date | null | undefined) {
  if (!date) return '-';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '-';
  return dateTimeFormatter.format(parsed);
}

export function formatMoney(amount: number | string | null | undefined) {
  const value = typeof amount === 'string' ? Number(amount) : amount;
  if (value == null || !Number.isFinite(value)) return '-';
  return moneyFormatter.format(value);
}

export function formatId(id: string | null | undefined) {
  if (!id) return '-';
  if (id.length <= 14) return id;
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}
