import { cellValue, daysSince, gridTotal, shortPesos } from './grid';

describe('grid', () => {
  it('matches the spec totals', () => {
    expect(gridTotal(5000, 52)).toBe(6_890_000); // ₱50 base -> ₱68,900
    expect(gridTotal(100, 365)).toBe(6_679_500); // ₱1 base -> ₱66,795
  });

  it('values cells by index, reversed for the 52-week option', () => {
    expect(cellValue('week_52', 3, 5000)).toBe(15_000);
    expect(cellValue('week_52', 1, 5000, true)).toBe(260_000);
    expect(cellValue('day_365', 365, 100, true)).toBe(36_500); // reverse is week_52 only
  });

  it('counts completed days', () => {
    expect(daysSince('2026-11-20', '2026-11-22')).toBe(2);
    expect(daysSince('2026-02-27', '2026-03-01')).toBe(2);
    expect(daysSince('2026-11-23', '2026-11-22')).toBe(0);
  });

  it('shortens labels', () => {
    expect(shortPesos(15_000)).toBe('150');
    expect(shortPesos(125_000)).toBe('1.2k');
    expect(shortPesos(260_000)).toBe('2.6k');
  });
});
