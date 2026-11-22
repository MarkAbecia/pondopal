import { daysLeftInMonth, isIsoDate, manilaDate, manilaMonth, manilaNoon, monthRange } from './dates';

describe('dates (Asia/Manila)', () => {
  it('rolls over at Manila midnight, not UTC', () => {
    expect(manilaDate(new Date('2026-11-30T15:59:00Z'))).toBe('2026-11-30');
    expect(manilaDate(new Date('2026-11-30T16:00:00Z'))).toBe('2026-12-01');
    expect(manilaMonth(new Date('2026-11-30T16:00:00Z'))).toBe('2026-12-01');
  });

  it('bounds a month in UTC', () => {
    expect(monthRange('2026-12-01')).toEqual({
      from: '2026-11-30T16:00:00.000Z',
      to: '2026-12-31T16:00:00.000Z',
    });
  });

  it('counts days left including today', () => {
    expect(daysLeftInMonth(new Date('2026-11-22T04:00:00Z'))).toBe(9);
    expect(daysLeftInMonth(new Date('2027-02-28T04:00:00Z'))).toBe(1);
  });

  it('converts and validates dates', () => {
    expect(manilaNoon('2026-11-22')).toBe('2026-11-22T04:00:00.000Z');
    expect(isIsoDate('2026-02-29')).toBe(false);
    expect(isIsoDate('2028-02-29')).toBe(true);
    expect(isIsoDate('22/11/2026')).toBe(false);
  });
});
