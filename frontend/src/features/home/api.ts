import { useQuery } from '@tanstack/react-query';

import { manilaDate, monthRange } from '@/lib/dates';
import { supabase, unwrap } from '@/lib/supabase';
import type { TxnType } from '@/types/models';

export type Totals = { income: number; expense: number };

/** Income and expenses this month per space, for every space the user can see (RLS). */
export function useMonthSummary(month: string) {
  return useQuery({
    queryKey: ['month-summary', month],
    queryFn: async () => {
      const { from, to } = monthRange(month);
      // shortcut: sums in the app; switch to the backend monthly report when volumes grow
      const rows = unwrap(
        await supabase
          .from('transactions')
          .select('space_id, type, amount_centavos')
          .gte('occurred_at', from)
          .lt('occurred_at', to),
      );
      // a plain object, not a Map: the query cache is persisted as JSON
      const bySpace: Record<string, Totals> = {};
      const all: Totals = { income: 0, expense: 0 };
      for (const r of rows) {
        const t = (bySpace[r.space_id] ??= { income: 0, expense: 0 });
        t[r.type] += r.amount_centavos;
        all[r.type] += r.amount_centavos;
      }
      return { bySpace, all };
    },
  });
}

export type CategoryTotal = { name: string | null; icon: string | null; total: number; count: number };
export type Breakdown = Record<TxnType, CategoryTotal[]>;

/** Group rows by category per type, largest first. Uncategorised rows share one null bucket. */
export function groupByCategory(
  rows: { type: TxnType; amount_centavos: number; category: { name: string; icon: string | null } | null }[],
): Breakdown {
  const out: Record<TxnType, Map<string, CategoryTotal>> = { income: new Map(), expense: new Map() };
  for (const r of rows) {
    const key = r.category?.name ?? '';
    const bucket = out[r.type].get(key) ?? { name: r.category?.name ?? null, icon: r.category?.icon ?? null, total: 0, count: 0 };
    bucket.total += r.amount_centavos;
    bucket.count += 1;
    out[r.type].set(key, bucket);
  }
  const sorted = (m: Map<string, CategoryTotal>) => [...m.values()].sort((a, b) => b.total - a.total);
  return { income: sorted(out.income), expense: sorted(out.expense) };
}

/** Expenses per Manila calendar day of `month` (index 0 is the 1st), for the spending line. */
export function dailyExpense(rows: { type: TxnType; amount_centavos: number; occurred_at: string }[], month: string): number[] {
  const [y, m] = month.split('-').map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const out = new Array<number>(days).fill(0);
  for (const r of rows) {
    if (r.type !== 'expense') continue;
    const day = Number(manilaDate(new Date(r.occurred_at)).slice(8, 10));
    if (day >= 1 && day <= days) out[day - 1] += r.amount_centavos;
  }
  return out;
}

/** One month's totals per category in one space (donut, top-spending tiles) and per day (spending line). */
export function useCategoryBreakdown(spaceId: string | undefined, month: string) {
  return useQuery({
    queryKey: ['month-summary', month, 'categories', spaceId],
    enabled: !!spaceId,
    queryFn: async () => {
      const { from, to } = monthRange(month);
      // shortcut: grouped in the app like useMonthSummary; move to SQL when volumes grow
      const rows = unwrap(
        await supabase
          .from('transactions')
          .select('type, amount_centavos, occurred_at, category:categories(name, icon)')
          .eq('space_id', spaceId!)
          .gte('occurred_at', from)
          .lt('occurred_at', to),
      );
      return { ...groupByCategory(rows), daily: dailyExpense(rows, month) };
    },
  });
}
