/** Asia/Manila date helpers. PH has no DST, so a fixed +08:00 offset is exact. */
const OFFSET_MS = 8 * 60 * 60 * 1000;

/** YYYY-MM-DD in Manila. */
export function manilaDate(at: Date = new Date()): string {
  return new Date(at.getTime() + OFFSET_MS).toISOString().slice(0, 10);
}

/** First day of the Manila month, YYYY-MM-01 (the `budgets.month` value). */
export function manilaMonth(at: Date = new Date()): string {
  return `${manilaDate(at).slice(0, 7)}-01`;
}

/** UTC instants bounding a Manila calendar month, for `occurred_at` filters. */
export function monthRange(month: string): { from: string; to: string } {
  const [y, m] = month.split('-').map(Number);
  return {
    from: new Date(Date.UTC(y, m - 1, 1) - OFFSET_MS).toISOString(),
    to: new Date(Date.UTC(y, m, 1) - OFFSET_MS).toISOString(),
  };
}

/** Days left in the Manila month, counting today. */
export function daysLeftInMonth(at: Date = new Date()): number {
  const [y, m, d] = manilaDate(at).split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return daysInMonth - d + 1;
}

/** A Manila YYYY-MM-DD as the UTC instant of noon that day (safe default time for entries). */
export function manilaNoon(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12) - OFFSET_MS).toISOString();
}

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}
