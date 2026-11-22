/** Turns the split form into the API body and checks it before sending. The backend does the
 * actual dividing (backend/app/domain/splits.py); this only validates what the user typed. */
import { parsePesos } from '@/lib/money';

export type SplitMethod = 'equal' | 'percent' | 'exact';
export type SplitBody = { method: SplitMethod; shares: { user_id: string; value: number | null }[] };

export type SplitCheck =
  | { ok: true; body: SplitBody }
  | { ok: false; reason: 'nobody' | 'invalid' | 'sum'; remaining?: number };

/** `inputs` holds the typed value per user: a percent like "33.5" or a peso amount like "150". */
export function buildSplit(
  method: SplitMethod,
  selected: string[],
  inputs: Record<string, string>,
  amount: number,
): SplitCheck {
  if (selected.length === 0) return { ok: false, reason: 'nobody' };
  if (method === 'equal') {
    return { ok: true, body: { method, shares: selected.map((user_id) => ({ user_id, value: null })) } };
  }
  // "33.33" percent parses like pesos to 3333, which is exactly basis points
  const values = selected.map((u) => parsePesos(inputs[u] ?? ''));
  if (values.some((v) => v === null || v < 0)) return { ok: false, reason: 'invalid' };
  const total = method === 'percent' ? 10_000 : amount;
  const sum = (values as number[]).reduce((a, b) => a + b, 0);
  if (sum !== total) return { ok: false, reason: 'sum', remaining: total - sum };
  return { ok: true, body: { method, shares: selected.map((user_id, i) => ({ user_id, value: values[i] })) } };
}
