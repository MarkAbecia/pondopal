import { buildSplit } from './shares';

describe('buildSplit', () => {
  it('needs at least one person', () => {
    expect(buildSplit('equal', [], {}, 1000)).toEqual({ ok: false, reason: 'nobody' });
  });

  it('sends equal splits without values', () => {
    expect(buildSplit('equal', ['a', 'b'], {}, 1000)).toEqual({
      ok: true,
      body: { method: 'equal', shares: [{ user_id: 'a', value: null }, { user_id: 'b', value: null }] },
    });
  });

  it('turns percentages into basis points and checks they make 100%', () => {
    expect(buildSplit('percent', ['a', 'b'], { a: '66.67', b: '33.33' }, 1000)).toMatchObject({
      ok: true,
      body: { shares: [{ value: 6667 }, { value: 3333 }] },
    });
    expect(buildSplit('percent', ['a', 'b'], { a: '50', b: '40' }, 1000)).toEqual({ ok: false, reason: 'sum', remaining: 1000 });
  });

  it('checks exact amounts add up to the expense', () => {
    expect(buildSplit('exact', ['a', 'b'], { a: '1,200', b: '300.50' }, 150_050)).toMatchObject({ ok: true });
    expect(buildSplit('exact', ['a', 'b'], { a: '1,000', b: '600' }, 150_000)).toEqual({ ok: false, reason: 'sum', remaining: -10_000 });
    expect(buildSplit('exact', ['a'], { a: 'abc' }, 100)).toEqual({ ok: false, reason: 'invalid' });
  });
});
