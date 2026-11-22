/** Display-side mirror of backend/app/domain/challenges.py. The backend decides amounts;
 * this only labels cells and lays out the grid. */

export type TemplateKey = 'week_52' | 'day_365' | 'bill_50' | 'no_spend' | 'custom';

export const GRID_CELLS: Partial<Record<TemplateKey, number>> = { week_52: 52, day_365: 365 };

export const isGrid = (key: string) => key in GRID_CELLS;

/** What tapping cell `index` (1-based) saves. */
export function cellValue(key: string, index: number, base: number, reverse = false): number {
  const cells = GRID_CELLS[key as TemplateKey] ?? 0;
  return (key === 'week_52' && reverse ? cells + 1 - index : index) * base;
}

export function gridTotal(base: number, cells: number): number {
  return (base * cells * (cells + 1)) / 2;
}

/** No-spend cells: one per completed day since the start (today isn't over yet). */
export function daysSince(startDate: string, today: string): number {
  const ms = Date.parse(`${today}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`);
  return Math.max(Math.round(ms / 86_400_000), 0);
}

/** Short cell label: ₱1,250 -> "1.2k", ₱150 -> "150". Full amounts go in the a11y label. */
export function shortPesos(centavos: number): string {
  const pesos = Math.floor(centavos / 100);
  if (pesos < 1000) return String(pesos);
  const k = Math.floor(pesos / 100) / 10;
  return `${k}k`;
}
