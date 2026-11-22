/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  // Dark colors come from CSS variables (src/lib/theme.ts), not dark: classes. 'media' crashes NativeWind on web.
  darkMode: 'class',
  theme: {
    extend: {
      // Semantic colors that follow the system light/dark setting (src/global.css)
      colors: {
        canvas: token('canvas'),
        card: token('card'),
        fg: { DEFAULT: token('fg'), 2: token('fg-2') },
        muted: token('muted'),
        line: { DEFAULT: token('line'), soft: token('line-soft') },
        brand: { DEFAULT: token('brand'), light: token('brand-soft'), dark: token('brand-ink') },
        income: token('income'),
        expense: token('expense'),
        'danger-soft': token('danger-soft'),
      },
    },
  },
  plugins: [],
};
