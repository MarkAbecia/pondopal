import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { safeToSpend } from '@/lib/budget';
import { daysLeftInMonth, monthRange } from '@/lib/dates';
import { supabase, unwrap } from '@/lib/supabase';

/** Budgets for a space and month, with spending and safe-to-spend. */
export function useBudgetSummary(spaceId: string | undefined, month: string) {
  return useQuery({
    queryKey: ['budgets', spaceId, month],
    enabled: !!spaceId,
    queryFn: async () => {
      const { from, to } = monthRange(month);
      const [budgets, expenses] = await Promise.all([
        supabase
          .from('budgets')
          .select('id, category_id, limit_centavos, category:categories(name)')
          .eq('space_id', spaceId!)
          .eq('month', month),
        // shortcut: sums in the app; move to GET /spaces/{id}/reports/monthly (cached) for big spaces
        supabase
          .from('transactions')
          .select('category_id, amount_centavos')
          .eq('space_id', spaceId!)
          .eq('type', 'expense')
          .gte('occurred_at', from)
          .lt('occurred_at', to),
      ]);
      const spentBy = new Map<string | null, number>();
      for (const e of unwrap(expenses)) {
        spentBy.set(e.category_id, (spentBy.get(e.category_id) ?? 0) + e.amount_centavos);
      }
      const rows = unwrap(budgets);
      const lines = rows.map((b) => ({
        budgetId: b.id,
        categoryId: b.category_id,
        name: b.category?.name ?? '—',
        limit: b.limit_centavos,
        spent: spentBy.get(b.category_id) ?? 0,
      }));
      const budgeted = new Set(rows.map((b) => b.category_id));
      const unbudgeted = [...spentBy].reduce((sum, [cat, v]) => (budgeted.has(cat as string) ? sum : sum + v), 0);
      return { ...safeToSpend(lines, unbudgeted, daysLeftInMonth()), lines };
    },
  });
}

export function useSetBudget(spaceId: string, month: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { categoryId: string; limit: number }) =>
      unwrap(
        await supabase.from('budgets').upsert(
          { space_id: spaceId, category_id: input.categoryId, month, limit_centavos: input.limit },
          { onConflict: 'space_id,category_id,month' },
        ),
      ),
    onSettled: () => qc.invalidateQueries({ queryKey: ['budgets', spaceId] }),
  });
}

export function useDeleteBudget(spaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (budgetId: string) =>
      unwrap(await supabase.from('budgets').delete().eq('id', budgetId)),
    onSettled: () => qc.invalidateQueries({ queryKey: ['budgets', spaceId] }),
  });
}
