import { safeToSpend } from './budget';

const food = { categoryId: 'f', name: 'Food', limit: 1_000_000, spent: 250_000 };
const bills = { categoryId: 'b', name: 'Bills', limit: 500_000, spent: 500_000 };

describe('safeToSpend', () => {
  it('subtracts all spending, including unbudgeted categories', () => {
    const s = safeToSpend([food, bills], 50_000, 10);
    expect(s.totalLimit).toBe(1_500_000);
    expect(s.totalSpent).toBe(800_000);
    expect(s.remaining).toBe(700_000);
    expect(s.perDay).toBe(70_000);
    expect(s.lines.map((l) => l.remaining)).toEqual([750_000, 0]);
  });

  it('floors per-day and never goes negative', () => {
    expect(safeToSpend([food], 0, 3).perDay).toBe(250_000);
    expect(safeToSpend([{ ...food, limit: 100 }], 0, 3).perDay).toBe(0);
    expect(safeToSpend([{ ...food, limit: 10 }], 0, 3).perDay).toBe(0);
    expect(safeToSpend([food], 0, 0).perDay).toBe(750_000);
  });

  it('handles no budgets', () => {
    const s = safeToSpend([], 1_000, 5);
    expect(s).toMatchObject({ totalLimit: 0, totalSpent: 1_000, remaining: -1_000, perDay: 0 });
  });
});
