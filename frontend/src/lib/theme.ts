import { vars } from "nativewind";
import { useColorScheme } from "react-native";

/** The single source of theme colors. Text colors meet WCAG AA (4.5:1) on canvas and card in
 * both schemes, and white text holds 4.5:1 on brand and both gradient stops; onExpense on expense.
 * Classes (bg-card, text-fg, ...) read these through CSS variables (themeVars, applied at the
 * root); props that need a raw color use usePalette(). */
export const palette = {
  light: {
    canvas: "#F4F3FA",
    card: "#FFFFFF",
    fg: "#1C1838",
    fg2: "#3B3660",
    muted: "#5F5A80",
    placeholder: "#827DA2",
    line: "#DCD9EC",
    lineSoft: "#ECEAF5",
    brand: "#4F46E5",
    brandSoft: "#EEEDFD",
    brandInk: "#3730A3",
    gradFrom: "#7C3AED",
    gradTo: "#4F46E5",
    onGradMuted: "#EDE9FE",
    glass: "rgba(255,255,255,0.16)",
    income: "#0B7A5C",
    incomeSoft: "#E2F5EE",
    expense: "#C8264B",
    onExpense: "#FFFFFF",
    dangerSoft: "#FCEBEF",
    shadow: "#3B2A8C",
    tileTint: 0.14,
  },
  dark: {
    canvas: "#0F0D1C",
    card: "#1B1830",
    fg: "#F2F0FB",
    fg2: "#D3CFEA",
    muted: "#A6A1C6",
    placeholder: "#8E89B0",
    line: "#3A3558",
    lineSoft: "#2A2642",
    brand: "#4F46E5",
    brandSoft: "#28244E",
    brandInk: "#BEBAFF",
    gradFrom: "#6D28D9",
    gradTo: "#4338CA",
    onGradMuted: "#EDE9FE",
    glass: "rgba(255,255,255,0.14)",
    income: "#3DD6A5",
    incomeSoft: "#123A2E",
    expense: "#FF7D96",
    onExpense: "#0F0D1C",
    dangerSoft: "#3D1626",
    shadow: "#000000",
    tileTint: 0.26, // stronger on the dark canvas, or tiles read as holes
  },
};

export type Scheme = keyof typeof palette;
export type Palette = (typeof palette)[Scheme];

/** Category colors: saturated enough for a white icon on a solid tile (3:1, non-text) and for a
 * colored icon on its own 14% tint. Picked by a stable hash of the category name. */
export const CATEGORY_COLORS = [
  "#E5486A", // coral
  "#2B8BE0", // sky
  "#E8711A", // orange
  "#8B5CF6", // violet
  "#0E9F76", // emerald
  "#B07800", // amber
  "#D9469F", // pink
  "#3B63F0", // blue
  "#0B9C9A", // teal
  "#B5532F", // clay
] as const;

export function categoryColor(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return CATEGORY_COLORS[h % CATEGORY_COLORS.length];
}

/** Hex color with an alpha channel, for tints of a category color. */
export const tint = (hex: string, alpha = 0.14) =>
  `${hex}${Math.round(alpha * 255).toString(16).padStart(2, "0")}`;

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
    "--income-soft": rgb(p.incomeSoft),
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
