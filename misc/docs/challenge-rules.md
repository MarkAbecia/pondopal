# Ipon challenge and goal rules

All amounts are integer centavos. Dates use `Asia/Manila`. The source of truth is `backend/app/domain/`, and the frontend mirrors it for display.

| Challenge | Rule | Check |
|---|---|---|
| 52-week | Week *n* deposit = *n* × base. In reverse mode, week 1 is 52 × base. | With a ₱50 base, week 52 is ₱2,600 and the total is ₱68,900. |
| 365-day grid | The user can tick any unticked cell 1–365 on any day. The cell's value is its number × base. | With a ₱1 base, the total is ₱66,795. |
| ₱50 bill alkansya | The user sets a target number of bills. Each entry is ₱50 × bills. | — |
| No-spend days | A day counts if the user records no expense transactions in that space on that Manila date. | — |

**Streaks.** A streak is consecutive days (or weeks, for weekly challenges) with at least one entry.

**Group challenges.** Each member has their own grid (ADR 0005). Group progress is the sum across members.

**Goal plan.**
- `remaining = target − contributed`
- `periods_left` is the number of periods from today to the deadline at the chosen frequency. For semi-monthly, the periods fall on the 15th and the last day of each month.
- The amount per period is `ceil(remaining / periods_left)`.
- The status is `done` when `remaining ≤ 0`. Otherwise it is `on_track` when the amount saved so far is at least the straight-line share of the target for the time elapsed (`target × days_elapsed / total_days`), and `behind` if not. This means a brand-new goal starts out on track.
- The projected finish date is `today + ceil(remaining × days_elapsed / contributed)`. It is `null` until there's at least one contribution and one day of history.
- When no due date is left (the deadline has passed, or there's no payday before it), the whole remainder is due now.
- Streaks stay alive until the current day or week is over. No-spend days only count completed days, never today.

**Settle-up (v2).** Compute each member's net balance, then repeatedly match the largest debtor with the largest creditor.

**Paluwagan (v2).** With N members contributing C each, every round's pot is N × C. The pot goes to the member whose turn it is in the payout order.
