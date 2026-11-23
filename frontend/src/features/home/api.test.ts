import { dailyExpense, groupByCategory } from './api';

jest.mock('@/lib/supabase', () => ({ supabase: {}, unwrap: (r: unknown) => r }));

const food = { name: 'Food', icon: 'restaurant' };
const bills = { name: 'Bills & Utilities', icon: 'flash' };

describe('groupByCategory', () => {
  it('sums per category and type, largest first', () => {
    const out = groupByCategory([
      { type: 'expense', amount_centavos: 10000, category: food },
      { type: 'expense', amount_centavos: 245000, category: bills },
      { type: 'expense', amount_centavos: 5050, category: food },
      { type: 'income', amount_centavos: 2500000, category: null },
    ]);
    expect(out.expense).toEqual([
      { name: 'Bills & Utilities', icon: 'flash', total: 245000, count: 1 },
      { name: 'Food', icon: 'restaurant', total: 15050, count: 2 },
    ]);
    expect(out.income).toEqual([{ name: null, icon: null, total: 2500000, count: 1 }]);
  });

  it('returns empty lists when there is nothing this month', () => {
    expect(groupByCategory([])).toEqual({ income: [], expense: [] });
  });
});

describe('dailyExpense', () => {
  it('buckets expenses by Manila day and ignores income', () => {
    const days = dailyExpense(
      [
        // 2026-11-01 00:30 Manila is still 2026-10-31 in UTC
        { type: 'expense', amount_centavos: 100, occurred_at: '2026-10-31T16:30:00Z' },
        { type: 'expense', amount_centavos: 250, occurred_at: '2026-11-30T15:59:00Z' },
        { type: 'income', amount_centavos: 9999, occurred_at: '2026-11-02T04:00:00Z' },
      ],
      '2026-11-01',
    );
    expect(days).toHaveLength(30);
    expect(days[0]).toBe(100);
    expect(days[29]).toBe(250);
    expect(days[1]).toBe(0);
  });
});
