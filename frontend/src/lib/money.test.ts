import { formatPHP, fromCentavos, parsePesos, toCentavos } from './money';

describe('money', () => {
  it.each([
    ['1234.50', 123450],
    ['1,234.5', 123450],
    ['₱ 50', 5000],
    ['0.01', 1],
    ['1.', 100],
    ['-20.25', -2025],
    ['0.07', 7],
    ['1.10', 110],
  ])('parses %s', (input, expected) => {
    expect(parsePesos(input)).toBe(expected);
  });

  it.each(['', 'abc', '1.234', '1e3', '12..3', '--1', '.5'])('rejects %p', (input) => {
    expect(parsePesos(input)).toBeNull();
    expect(() => toCentavos(input)).toThrow(RangeError);
  });

  it('avoids float rounding traps', () => {
    expect(toCentavos('0.29')).toBe(29); // 0.29 * 100 = 28.999999999999996 in floats
    expect(toCentavos('1.005'.slice(0, 4))).toBe(100);
  });

  it('formats pesos', () => {
    expect(formatPHP(123450)).toBe('₱1,234.50');
    expect(formatPHP(5)).toBe('₱0.05');
    expect(formatPHP(0)).toBe('₱0.00');
    expect(formatPHP(-6890000)).toBe('-₱68,900.00');
    expect(formatPHP(100000000000)).toBe('₱1,000,000,000.00');
  });

  it('round-trips through the edit format', () => {
    for (const c of [0, 1, 99, 100, 123450, -2025]) {
      expect(toCentavos(fromCentavos(c))).toBe(c);
    }
    expect(fromCentavos(-5)).toBe('-0.05');
  });
});
