import { useQuery } from '@tanstack/react-query';

import { monthRange } from '@/lib/dates';
import { supabase, unwrap } from '@/lib/supabase';

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
      const bySpace = new Map<string, Totals>();
      const all: Totals = { income: 0, expense: 0 };
      for (const r of rows) {
        const t = bySpace.get(r.space_id) ?? { income: 0, expense: 0 };
        t[r.type] += r.amount_centavos;
        all[r.type] += r.amount_centavos;
        bySpace.set(r.space_id, t);
      }
      return { bySpace, all };
    },
  });
}
