import en from './en.json';
import fil from './fil.json';

function keys(obj: object, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    typeof v === 'object' && v !== null ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

const placeholders = (s: string) => (s.match(/{{\w+}}/g) ?? []).sort();

describe('translations', () => {
  it('Filipino has exactly the English keys', () => {
    expect(keys(fil).sort()).toEqual(keys(en).sort());
  });

  it('keeps every {{placeholder}}', () => {
    const lookup = (obj: object, path: string) =>
      path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], obj) as string;
    for (const k of keys(en)) {
      expect([k, placeholders(lookup(fil, k))]).toEqual([k, placeholders(lookup(en, k))]);
    }
  });
});
