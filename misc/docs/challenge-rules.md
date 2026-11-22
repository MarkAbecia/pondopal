# Ipon challenge and goal rules

All amounts are integer centavos. Dates use `Asia/Manila`. The source of truth is `backend/app/domain/`, and the frontend mirrors it for display.

| Challenge | Rule | Check |
|---|---|---|
| 52-week | Week *n* deposit = *n* × base. In reverse mode, week 1 is 52 × base. | With a ₱50 base, week 52 is ₱2,600 and the total is ₱68,900. |
| 365-day grid | The user can tick any unticked cell 1–365 on any day. The cell's value is its number × base. | With a ₱1 base, the total is ₱66,795. |
| ₱50 bill alkansya | The user sets a target number of bills. Each entry is ₱50 × bills. | — |
| No-spend days | A day counts if the user records no expense transactions in that space on that Manila date. | — |

**Streaks.** A streak is consecutive days (or weeks, for weekly challenges) with at least one entry.

**Group challenges.** Each member has their own grid (ADR 0005). `GET /v1/challenges/{id}/progress` returns your own progress plus every member's, sorted by amount saved. With `settings.leaderboard` the app shows that list as a ranking.

**Entries.**
- Grid templates (`week_52`, `day_365`): you pick the cell. Each cell can be saved once per member; a repeat is `409`. Undo deletes the entry.
- `bill_50` and `custom` are a running log, so the backend numbers each entry itself.
- `no_spend` has no entries. Its days come from the space's expense transactions, the same for every member.
- Amounts are always computed by the backend (`app/domain/challenges.py`); the app only displays them.

**Reminders** (`app/jobs.py`, run by `python -m app.worker`, Asia/Manila):
- 08:00 bill reminders. Past due dates first roll forward to their next occurrence (`due_day` clamped to the month's end). Then every non-viewer member gets a reminder for bills due today or tomorrow.
- 08:00 paluwagan alerts for unpaid rounds due today or tomorrow, sent to the payer.
- 20:00 streak nudges for members who saved in the previous period but not yet in this one: daily for `day_365`, `bill_50` and `custom`, and on Sundays for `week_52`.
- Every reminder is stored in `notifications` (the in-app inbox) and pushed through Expo to users with a device token. Tokens Expo reports as `DeviceNotRegistered` are cleared.

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
