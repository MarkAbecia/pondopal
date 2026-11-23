import { CATEGORY_COLORS, categoryColor, type Palette, palette } from './theme';

jest.mock('nativewind', () => ({ vars: (v: object) => v }));

// WCAG 2.x relative luminance and contrast ratio
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// [text, background] pairs the UI actually uses
type Color = Exclude<keyof Palette, 'tileTint'>;
const PAIRS: [Color | 'white', Color][] = [
  ['fg', 'canvas'],
  ['fg', 'card'],
  ['fg2', 'card'],
  ['muted', 'canvas'],
  ['muted', 'card'],
  ['income', 'card'],
  ['expense', 'card'],
  ['expense', 'dangerSoft'],
  ['brandInk', 'card'],
  ['brandInk', 'brandSoft'],
  ['white', 'brand'], // primary buttons, ticked grid cells
  ['white', 'gradFrom'], // header text on the gradient
  ['white', 'gradTo'],
  ['onGradMuted', 'gradFrom'], // secondary header text
  ['onGradMuted', 'gradTo'],
  ['onExpense', 'expense'], // amounts inside over-budget pill bars
  ['income', 'incomeSoft'],
];

describe.each(['light', 'dark'] as const)('%s theme', (scheme) => {
  const p = palette[scheme];
  it.each(PAIRS)('%s on %s meets AA (4.5:1)', (text, bg) => {
    const fg = text === 'white' ? '#FFFFFF' : p[text];
    expect(contrast(fg, p[bg])).toBeGreaterThanOrEqual(4.5);
  });

  it('placeholder text meets 3:1 on inputs', () => {
    expect(contrast(p.placeholder, p.canvas)).toBeGreaterThanOrEqual(3);
    expect(contrast(p.placeholder, p.card)).toBeGreaterThanOrEqual(3);
  });
});

describe('category colors', () => {
  it.each(CATEGORY_COLORS)('%s carries a white icon (3:1)', (c) => {
    expect(contrast('#FFFFFF', c)).toBeGreaterThanOrEqual(3);
  });
  it('picks the same color for the same name', () => {
    expect(categoryColor('Groceries')).toBe(categoryColor('Groceries'));
  });
});
