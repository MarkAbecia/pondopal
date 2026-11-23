---
name: PondoPal
description: Shared peso budgeting and ipon for Filipino households and barkadas, set on a violet stage.
colors:
  grad-from: "#7C3AED"
  grad-to: "#4F46E5"
  brand: "#4F46E5"
  brand-soft: "#EEEDFD"
  brand-ink: "#3730A3"
  on-grad-muted: "#EDE9FE"
  glass: "rgba(255,255,255,0.16)"
  income: "#0B7A5C"
  income-soft: "#E2F5EE"
  expense: "#C8264B"
  on-expense: "#FFFFFF"
  danger-soft: "#FCEBEF"
  canvas: "#F4F3FA"
  card: "#FFFFFF"
  fg: "#1C1838"
  fg-2: "#3B3660"
  muted: "#5F5A80"
  placeholder: "#827DA2"
  line: "#DCD9EC"
  line-soft: "#ECEAF5"
  shadow: "#3B2A8C"
  dark-grad-from: "#6D28D9"
  dark-grad-to: "#4338CA"
  dark-brand-soft: "#28244E"
  dark-brand-ink: "#BEBAFF"
  dark-glass: "rgba(255,255,255,0.14)"
  dark-income: "#3DD6A5"
  dark-income-soft: "#123A2E"
  dark-expense: "#FF7D96"
  dark-on-expense: "#0F0D1C"
  dark-danger-soft: "#3D1626"
  dark-canvas: "#0F0D1C"
  dark-card: "#1B1830"
  dark-fg: "#F2F0FB"
  dark-fg-2: "#D3CFEA"
  dark-muted: "#A6A1C6"
  dark-placeholder: "#8E89B0"
  dark-line: "#3A3558"
  dark-line-soft: "#2A2642"
  dark-shadow: "#000000"
  category-coral: "#E5486A"
  category-sky: "#2B8BE0"
  category-orange: "#E8711A"
  category-violet: "#8B5CF6"
  category-emerald: "#0E9F76"
  category-amber: "#B07800"
  category-pink: "#D9469F"
  category-blue: "#3B63F0"
  category-teal: "#0B9C9A"
  category-clay: "#B5532F"
typography:
  display:
    fontFamily: "Figtree_800ExtraBold, system-ui, sans-serif"
    fontSize: "40px"
    fontWeight: 800
    lineHeight: 1.15
    fontFeature: "tnum"
  figure:
    fontFamily: "Figtree_700Bold, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 700
    fontFeature: "tnum"
  headline:
    fontFamily: "system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 700
  title:
    fontFamily: "system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 700
  body:
    fontFamily: "system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
  body-sm:
    fontFamily: "system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
  label:
    fontFamily: "system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
  tab-label:
    fontFamily: "system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 600
rounded:
  cell: "8px"
  tile: "16px"
  tile-ring: "20px"
  card: "24px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  header-bottom: "28px"
components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.card}"
    rounded: "{rounded.pill}"
    padding: "12px 20px"
    height: "48px"
  button-secondary:
    backgroundColor: "{colors.brand-soft}"
    textColor: "{colors.brand-ink}"
    rounded: "{rounded.pill}"
    padding: "12px 20px"
    height: "48px"
  button-danger:
    backgroundColor: "{colors.danger-soft}"
    textColor: "{colors.expense}"
    rounded: "{rounded.pill}"
    padding: "12px 20px"
    height: "48px"
  card:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.card}"
    padding: "20px"
  text-field:
    backgroundColor: "{colors.card}"
    textColor: "{colors.fg}"
    rounded: "{rounded.tile}"
    padding: "0 16px"
    height: "48px"
  segmented:
    backgroundColor: "{colors.card}"
    textColor: "{colors.brand-ink}"
    rounded: "{rounded.pill}"
    padding: "4px"
  segmented-selected:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.card}"
    rounded: "{rounded.pill}"
    height: "44px"
  chip:
    backgroundColor: "{colors.card}"
    textColor: "{colors.fg-2}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "48px"
  chip-selected:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.card}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "48px"
  category-tile:
    rounded: "{rounded.tile}"
    size: "48px"
  pill-bar:
    backgroundColor: "{colors.line-soft}"
    rounded: "{rounded.pill}"
    height: "36px"
  header-stat:
    backgroundColor: "{colors.glass}"
    textColor: "{colors.card}"
    rounded: "{rounded.tile}"
    padding: "12px"
  fab:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.card}"
    rounded: "{rounded.pill}"
    size: "64px"
  tab-bar:
    backgroundColor: "{colors.card}"
    textColor: "{colors.muted}"
    height: "68px"
  tab-bar-active:
    textColor: "{colors.brand-ink}"
---

# Design System: PondoPal

## Overview

**Creative North Star: "The Violet Stage"**

Every tab opens on a violet-to-indigo gradient header that holds the one peso figure that matters, set large in Figtree with its centavos at half size. Below the stage, the work sits on a lavender-tinted canvas in white rounded cards lifted by a soft violet shadow, never outlined. Colour carries meaning: indigo for action and the active state, teal-green for income, coral-red for expense, and a hashed per-category hue on every category tile.

One design ships to Android and iOS through Expo (React Native + NativeWind v4); light and dark follow the phone. All values below are read from `frontend/src/lib/theme.ts`, `frontend/tailwind.config.js`, `frontend/src/global.css` and `frontend/src/components/ui/index.tsx`. Review captures exist only for react-native-web at 375x812 (`.impeccable/review/`); no native captures exist, so native shadow, elevation and font-fallback rendering are unverified. The gradient header is the user's explicit choice (recorded 2026-11-23). There are no shipping raster assets; every icon is an Ionicons glyph.

**Key Characteristics:**
- Gradient stage header on every tab and pushed screen; content below on canvas.
- Borderless white cards (24px corners) with a soft violet lift.
- Peso figures in Figtree 800/700 with tabular numerals; small centavos on display figures.
- Pills everywhere a control or progress needs a shape: buttons, segmented, chips, progress, FAB.
- Category identity by colour: rounded-square tiles, solid or softly tinted.

## Colors

A violet-indigo brand on a cool lavender neutral, with two semantic money colours and a ten-hue category set. Every key has a light value and a `dark-` counterpart; `brand` is the same in both schemes.

### Primary
- **Stage Violet to Indigo** (`grad-from` to `grad-to`, deeper in dark): the diagonal gradient behind `GradientHeader`, `StatusScrim` and auth headers only. White and `on-grad-muted` text sit on it.
- **Action Indigo** (`brand`): primary buttons, the FAB, selected segmented/chip/challenge cells, focused field border, TilePicker selection ring, web focus outline, default PillBar fill.
- **Indigo Ink** (`brand-ink`): text-on-soft for secondary buttons, unselected segmented labels, "See all" links, the active tab tint. `brand-soft` is its background.

### Secondary
- **Income Teal** (`income`, `income-soft`): income amounts (`+₱`), earned PillBar fill.
- **Expense Coral** (`expense`, `danger-soft`, `on-expense`): expense amounts (`-₱`), over-limit PillBar fill, field errors, ErrorNote and danger buttons. In dark mode the bright `dark-expense`/`dark-income` fills take dark ink (`dark-on-expense`).

### Tertiary
- **Category Hues** (`category-*`, ten): assigned by a stable hash of the category name (`categoryColor`). Solid tile with a white glyph, or the hue at 14% alpha (26% in dark, `tileTint`) with a hue-coloured glyph. Donut slices use the same hue.

### Neutral
- **Lavender Canvas** (`canvas`): screen background under the stage.
- **Card White** (`card`): cards, fields, tab bar, unselected chips.
- **Ink Violet** (`fg`, `fg-2`): primary text and labels/secondary text.
- **Dusk Muted** (`muted`, `placeholder`): notes, inactive tab, placeholders.
- **Hairline Lavender** (`line`, `line-soft`): row dividers, field and chip borders, PillBar and Donut tracks.

### Named Rules
**The Stage-Only Gradient Rule.** The gradient appears only behind headers (and the pinned status-bar scrim). Content surfaces are flat canvas and card colours.

**The Money Has a Colour Rule.** Income is always `income` with a `+`, expense always `expense` with a `-`; neutral totals stay `fg`. Use `Money` or `BigMoney`, never colour a peso figure by hand.

**The Token-Only Rule.** Classes read colours through CSS variables (`bg-card`, `text-fg`, `bg-brand-light`, `text-brand-dark`); props that need a raw value read `usePalette()`. No hex literals in screens, except `#FFFFFF` on brand or gradient.

## Typography

**Display Font:** Figtree 800 ExtraBold / 700 Bold (loaded via `@expo-google-fonts/figtree`; web falls back to system-ui)
**Body Font:** the platform system sans (Roboto / SF)

**Character:** A rounded geometric face for money, plain system text for everything else. Figtree has no peso sign; the ₱ falls back to the system face on every platform.

### Hierarchy
- **Display** (Figtree 800, 40px, line-height 1.15, tabular): `BigMoney` on the stage. Centavos render at 50% size. Smaller sizes are used on canvas (30-32px in cards, 16px inline).
- **Figure** (Figtree 700, 14-16px, tabular): `HeaderStat` amounts, the Donut centre total. Use the exported `FIGURE` style.
- **Headline** (system 700, 24px): `HeaderTitle` on the stage, white.
- **Title** (system 700, 18px): `Title` section headings on canvas; `StackHeader` title on the stage.
- **Body** (system 400-600, 16px): ListRow titles (600), field input, button labels (600).
- **Body small** (system 400, 14px): notes, `Muted`, field labels (500), legends.
- **Label** (system 600, 12px): tile captions, PillBar amounts (700, tabular), header stat labels. Tab labels are 11px 600.

### Named Rules
**The Tabular Money Rule.** Every peso figure uses tabular numerals (`DISPLAY`, `FIGURE`, or the `tabular-nums` variant in `Money`/`PillBar`) so columns line up.

**The Scales-With-The-Phone Rule.** Text follows the system font size. Cap scaling (`maxFontSizeMultiplier`) only inside fixed-size cells, and put the full value in the accessibility label.

## Layout

Single column, phone first. `Screen` is the page shell: canvas background, body `px-4` (16px) with `pt-5` (20px) and a 16px vertical gap between blocks; the header scrolls with the content and the bottom pads `safe-area + 96px` to clear the tab bar and FAB. `GradientHeader` pads 20px horizontally, `safe-area top + 8px` above, 28px below (16px when `flat`, i.e. a StackHeader with no children). Header blocks stack at `mt-6` (switcher to figure) and `mt-5` (figure to stats); header stats sit two across with a 12px gap.

Horizontal rails (category tiles, budget cards) bleed to the screen edge (`-mx-4`, inner `px-4`, 12px gap). Rows inside a card are separated by a `line-soft` top border, not by spacing. Category pickers are a four-column wrap (`w-1/4`). Every interactive target is at least 48px tall (`min-h-12`), except the ipon challenge grid cells at 44px; the FAB is 64px.

## Elevation & Depth

Depth is one soft, coloured lift plus the stage. Cards and floating controls use `lift(c, strength)`: shadow colour `shadow`, offset 0/8, radius 18, opacity `0.07 x strength`, Android elevation `2 x strength`. Cards use strength 1, the tab bar 2, the FAB 3. In dark mode the shadow colour is `dark-shadow` (black) at the same opacity, so depth comes mostly from `dark-card` sitting lighter than `dark-canvas`.

### Shadow Vocabulary
- **Card lift** (`shadowColor: shadow; offset 0 8; radius 18; opacity 0.07; elevation 2`): Card, budget rail cards.
- **Bar lift** (opacity 0.14, elevation 4): tab bar.
- **Float lift** (opacity 0.21, elevation 6): FAB.

### Named Rules
**The No-Border Card Rule.** Cards separate from the canvas by colour and lift, never by an outline. Borders belong to inputs, chips, dashed Empty states and in-card row dividers.

## Shapes

Soft and round. Pills (`rounded-full`) for every button, chip, segmented control, PillBar and the FAB. Large 24px corners for cards and Empty placeholders; 16px for category tiles, text fields, header stats and ErrorNote; 20px for the TilePicker selection ring around a tile; 8px only for the dense ipon challenge cells. Avatars and header-stat icon wells are circles. Tiles are rounded squares, never circles.

## Components

### Buttons
- **Shape:** pill, min height 48px, 20px horizontal padding, optional 18px leading Ionicon.
- **Primary:** `brand` fill, white 16px semibold label.
- **Secondary:** `brand-soft` fill, `brand-ink` label.
- **Danger:** `danger-soft` fill, `expense` label.
- **Press / Disabled:** `active:opacity-80`; disabled or loading at 50% opacity, loading swaps the label for a spinner in the label colour. Web keyboard focus is a 3px `brand` outline, offset 2px (`global.css`); native draws its own.

### Chips (Choice)
- **Style:** pill, 48px tall, 2px `line-soft` border on `card`, `fg-2` label.
- **Selected:** `brand` border and fill, white semibold label. Radio-group semantics.

### Segmented
- Pill with a 2px `brand` border on `card`, 4px inset; options are 44px pills, selected `brand` with white text, others `brand-ink` text. Two or three options only (Expense / Income).

### Cards / Containers
- **Corner Style:** 24px. **Background:** `card`. **Shadow:** card lift. **Border:** none. **Padding:** 20px, 8px internal gap. Tappable cards wrap in a Pressable with `active:opacity-80`.

### Inputs / Fields
- **Style:** 48px min height, 16px corners, 2px `line-soft` border, `card` fill, 16px text, 16px horizontal padding; label above in 14px medium `fg-2`.
- **Focus:** border turns `brand`; caret/selection `brand`.
- **Error:** border and message in `expense`, message announced as an alert.

### Navigation
- **Tab bar:** `card` background, no top border, bar lift, 68px plus the bottom inset. Ionicons at 24px, outline when inactive and filled when active; active tint `brand-ink`, inactive `muted`; labels 11px 600. Five tabs: Home, Transactions, Ipon, Spaces, Profile.
- **Stack header:** `StackHeader` on the gradient, 48px back button (white arrow) and an 18px bold white title; it can hold children (a figure, a SpendLine) and then takes the full header padding.

### Gradient Header (signature)
`GradientHeader` with a `HeaderNote` label, a `BigMoney` figure and two `HeaderStat` chips (translucent `glass`, 16px corners, white circular icon well with a `grad-to` glyph). Selection on the stage inverts to a white pill (the Transactions month strip); the Profile avatar is a 64px `glass` circle. `StatusScrim` pins a strip of the same gradient under the status bar once the header scrolls away. Every tab screen builds its header from these parts and passes it to `Screen`.

### Category Tile and Picker
`CategoryTile`: rounded square (default 48px; 40-60px in use), glyph at 46% of the size, solid or tint. `TilePicker` shows 52px tiles in a four-column radio grid; selected becomes solid with a 2px `brand` ring and bold caption.

### PillBar (signature)
36px pill track in `line-soft`; the fill (`brand` by default, any colour passed, `expense` when over) carries the amount inside once it is 42% or wider, otherwise the amount sits just past the fill. The limit sits at the right end. Minimum visible fill 8%. Exposed as a progressbar.

### Donut and SpendLine
`Donut`: SVG ring (default 168px / 26px stroke; 128/20 on Transactions) on a `line-soft` track, clockwise from 12 o'clock, 1.2% gaps between slices, category hues, total in the centre in `FIGURE`, legend dots beside it. `SpendLine`: a 2.5px white line with a white-to-transparent area fill and a 30% white baseline, for use on the gradient only.

### List Row, FAB, Empty
- **ListRow:** min 56px, tile + 16px semibold title + 14px muted note + right slot (chevron when tappable).
- **FAB:** 64px `brand` circle, 30px white `add` glyph, bottom 24px / right 20px, float lift. One per screen, passed as `Screen`'s `overlay`, shown only to members who can write.
- **Empty:** dashed 2px `line-soft` border, 24px corners, a 48px `brand-soft` icon well with a `brand-ink` glyph, one centred muted line, optional action.

## Do's and Don'ts

### Do:
- **Do** start a new screen with `Screen` and a header built from `GradientHeader` (tabs) or `StackHeader` (pushed routes); put content in `Card`s on the canvas.
- **Do** show peso amounts with `BigMoney`, `Money` or `FIGURE`, so they keep tabular numerals and income/expense colouring.
- **Do** take colours from tailwind tokens or `usePalette()`, and check the screen in both light and dark.
- **Do** give every control `accessibilityRole` and label, a 48px minimum target, and an `active:` press class.
- **Do** colour categories with `categoryColor(name)` through `CategoryTile`, never a hand-picked hue.
- **Do** keep one primary action per screen; when it is "add", it is the FAB.

### Don't:
- **Don't** put the gradient on cards, buttons or the canvas; it is the stage only.
- **Don't** outline cards or add a second shadow style; use `lift`.
- **Don't** use square or small-radius corners on controls; controls are pills, containers 16-24px.
- **Don't** set money in the system face or with proportional digits.
- **Don't** use `dark:` classes; dark values come from the CSS variables set at the root (`darkMode: 'class'` is only there to keep NativeWind web from crashing).
