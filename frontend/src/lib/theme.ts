import { vars } from "nativewind";
import { useColorScheme } from "react-native";

/** The single source of theme colors. Text colors meet WCAG AA (4.5:1) on canvas and card in
 * both schemes; white text on `brand` is 5:1. Classes (bg-card, text-fg, ...) read these through
 * CSS variables (themeVars, applied at the root); props that need a raw color use usePalette(). */
export const palette = {
  light: {
    canvas: "#F9FAFB",
    card: "#FFFFFF",
    fg: "#111827",
    fg2: "#374151",
    muted: "#4B5563",
    placeholder: "#6B7280",
    line: "#D1D5DB",
    lineSoft: "#E5E7EB",
    brand: "#0B8043",
    brandSoft: "#E6F6EE",
    brandInk: "#065F32",
    income: "#0B8043",
    expense: "#C5221F",
    dangerSoft: "#FEF2F2",
  },
  dark: {
    canvas: "#0B0F14",
    card: "#181D25",
    fg: "#F3F4F6",
    fg2: "#D1D5DB",
    muted: "#9CA3AF",
    placeholder: "#9CA3AF",
    line: "#4B5563",
    lineSoft: "#2D343F",
    brand: "#0B8043",
    brandSoft: "#0A3822",
    brandInk: "#86EFAC",
    income: "#4ADE80",
    expense: "#F87171",
    dangerSoft: "#451313",
  },
};

export type Scheme = keyof typeof palette;
export type Palette = (typeof palette)[Scheme];

const rgb = (hex: string) =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(" ");

const toVars = (p: Palette) =>
  vars({
    "--canvas": rgb(p.canvas),
    "--card": rgb(p.card),
    "--fg": rgb(p.fg),
    "--fg-2": rgb(p.fg2),
    "--muted": rgb(p.muted),
    "--line": rgb(p.line),
    "--line-soft": rgb(p.lineSoft),
    "--brand": rgb(p.brand),
    "--brand-soft": rgb(p.brandSoft),
    "--brand-ink": rgb(p.brandInk),
    "--income": rgb(p.income),
    "--expense": rgb(p.expense),
    "--danger-soft": rgb(p.dangerSoft),
  });

export const themeVars = {
  light: toVars(palette.light),
  dark: toVars(palette.dark),
};

export function useScheme(): Scheme {
  return useColorScheme() === "dark" ? "dark" : "light";
}

export function usePalette(): Palette {
  return palette[useScheme()];
}
