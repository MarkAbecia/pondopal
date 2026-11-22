/** Normalize a Philippine mobile number to E.164 (+639XXXXXXXXX). Null if it isn't one. */
export function toE164PH(input: string): string | null {
  const digits = input.replace(/[\s\-()]/g, '');
  const local = /^(?:\+?63|0)?(9\d{9})$/.exec(digits);
  return local ? `+63${local[1]}` : null;
}
