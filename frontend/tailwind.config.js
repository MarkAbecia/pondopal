/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // shortcut: brand palette only; full light/dark tokens land in Phase 6
      colors: {
        brand: { DEFAULT: '#0F9D58', dark: '#0B7A44', light: '#E6F6EE' },
        income: '#0F9D58',
        expense: '#D93025',
      },
    },
  },
  plugins: [],
};
