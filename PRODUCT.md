# Product

<!-- impeccable:product-schema 1 -->

## Platform

android

One shared design ships to Android and iOS alike through Expo; the web build is a development convenience, not a product target.

## Users
Filipino individuals, couples, families and barkadas who track everyday spending in pesos, alone or in shared spaces, usually on a phone right after paying for something or when sweldo lands.

## Product Purpose
PondoPal makes shared money visible and ipon a habit: log income and expenses per space, keep budgets and bills on track, and save through challenges, goals and paluwagan. Success is people logging consistently and seeing their ipon grow.

## Positioning
Built around Philippine money rituals rather than generic budgeting: the 52-week and ₱50 ipon challenges, kinsenas-and-katapusan pay cycles, paluwagan rounds, and splitting and settling within a barkada or household.

## Operating Context
- Spaces: personal, partner, family and group (barkada), with owner, admin, member and viewer roles.
- Quick entry after a purchase, often offline; entries sync when the connection returns.
- Reminders for bills, paluwagan rounds and streaks arrive as push notifications.

## Capabilities and Constraints
- Money is stored as integer centavos and shown as ₱ with two decimals; dates follow Asia/Manila.
- English and Filipino UI (i18next); every label exists in both.
- Light and dark appearance follow the phone setting.
- Data rights under the Data Privacy Act (RA 10173): export and account deletion live in Profile.
- Stack: Expo (React Native) with expo-router, NativeWind, TanStack Query; FastAPI backend; Supabase.

## Brand Commitments
- Name: PondoPal. Voice: friendly, Taglish-comfortable, never preachy about money.
- The user supplied a visual reference (violet-to-indigo gradient headers, white rounded cards, donut report, segmented Expense/Income toggle, coloured category tiles, pill progress bars, indigo active tab, floating add button) and chose to keep its gradient on 2026-11-23.

## Evidence on Hand
- Seeded demo data only (`database/supabase/seed.sql`: Juan and Maria, a shared partner space). No real users, testimonials, metrics or logos exist; none may be invented.

## Product Principles
- Logging an expense is the fastest thing in the app.
- Shared money stays fair and legible: who paid, who owes, what's left.
- Ipon progress is celebrated, never shamed.
- Pesos and Manila time everywhere, no conversions.

## Accessibility & Inclusion
Touch targets at least 44pt, screen-reader labels on every control, contrast that holds in both themes, and copy that works in English and Filipino lengths.
