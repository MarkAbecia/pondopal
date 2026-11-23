---
version: 1
slug: "frontend-src-app"
primary_target: "frontend/src/app"
related_targets: []
---

# PondoPal app screens

Scope: every screen under frontend/src/app (tabs, auth, space, challenge, goal, paluwagan, transaction). Mode: Operate.

Audience and job: Filipino households and barkadas logging pesos on a phone and checking what's left; the fastest action is adding an expense.

Constraints: Expo React Native + NativeWind, one design for Android and iOS, light and dark follow the phone, English and Filipino copy lengths, 48dp targets.

## Direction contract

THESIS: Money as a lit violet stage. Each tab opens on a violet-to-indigo gradient header that holds the one peso figure that matters, with the work below on white rounded cards. Refuses the grey list-of-cards budgeting default.

OWN-WORLD: Gradient #7C3AED to #4F46E5 (deeper in dark). Lavender-tinted canvas, white cards (ink-violet in dark) with a soft violet shadow and no borders. Indigo for active state and primary buttons. Coral for expense, teal for income. Each category gets its own colour: a rounded-square icon tile with a soft tint. Progress is a pill: a thick rounded track with the amount set inside the fill.

STORY: You see this month's net or what's safe to spend at a glance. You flip between Expense and Income, see where the money went by category, and add an entry with the floating + button.

FIRST VIEWPORT: Home. The gradient header runs edge to edge under the status bar: the space switcher (white) on top, then "This month" and the net amount at display size with small centavos, then income and expense in two quiet white chips. Below it an Expense/Income segmented control, a horizontal row of top-category tiles, monthly budget pills, then the space cards. The tab bar is white with an indigo active tab.

FORM: Pinned by the user's reference image. seed: none (pinned) "here's the sample design I want" (violet gradient headers, white rounded cards, donut report, segmented Expense/Income toggle, coloured category tiles, pill progress bars, indigo active tab, floating add button). Signature move: peso figures set with small centavos on the gradient stage, and the Transactions donut of this month's spending by category.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
