/**
 * The only way the app converts or displays money (ADR 0003).
 * Amounts are integer centavos; strings are parsed digit by digit, never through floats.
 */
export type Centavos = number;

const PESOS = /^(-)?(\d{1,13})(?:\.(\d{0,2}))?$/;

/** Parse user input like "1,234.5" or "₱ 50" into centavos. Null if it isn't a valid amount. */
export function parsePesos(input: string): Centavos | null {
  const match = PESOS.exec(input.replace(/[₱,\s]/g, ''));
  if (!match) return null;
  const [, minus, whole, frac = ''] = match;
  const centavos = Number(whole) * 100 + Number(frac.padEnd(2, '0'));
  return minus ? -centavos : centavos;
}

/** Like parsePesos, but throws on invalid input. */
export function toCentavos(input: string): Centavos {
  const value = parsePesos(input);
  if (value === null) throw new RangeError(`Not a peso amount: ${input}`);
  return value;
}

/** Plain decimal string for editing ("1234.50"); round-trips through toCentavos. */
export function fromCentavos(centavos: Centavos): string {
  const abs = Math.abs(centavos);
  const text = `${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
  return centavos < 0 ? `-${text}` : text;
}

/** Display format: ₱1,234.50 (or -₱1,234.50). */
export function formatPHP(centavos: Centavos): string {
  const [whole, frac] = fromCentavos(Math.abs(centavos)).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${centavos < 0 ? '-' : ''}₱${grouped}.${frac}`;
}
