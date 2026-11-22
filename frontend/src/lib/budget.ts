import type { Centavos } from './money';

export type BudgetLine = {
  categoryId: string;
  name: string;
  limit: Centavos;
  spent: Centavos;
};

export type SafeToSpend = {
  totalLimit: Centavos;
  totalSpent: Centavos; // all expenses this month, budgeted or not
  remaining: Centavos; // can be negative (over budget)
  perDay: Centavos; // floored: never suggests more than is left
  lines: (BudgetLine & { remaining: Centavos })[];
};

/**
 * Safe to spend = sum of this month's category limits − every expense this month.
 * Spending in unbudgeted categories still eats into it, so the number never overstates.
 */
export function safeToSpend(
  lines: BudgetLine[],
  unbudgetedSpent: Centavos,
  daysLeft: number,
): SafeToSpend {
  const totalLimit = lines.reduce((sum, l) => sum + l.limit, 0);
  const totalSpent = lines.reduce((sum, l) => sum + l.spent, 0) + unbudgetedSpent;
  const remaining = totalLimit - totalSpent;
  return {
    totalLimit,
    totalSpent,
    remaining,
    perDay: remaining > 0 ? Math.floor(remaining / Math.max(daysLeft, 1)) : 0,
    lines: lines.map((l) => ({ ...l, remaining: l.limit - l.spent })),
  };
}
