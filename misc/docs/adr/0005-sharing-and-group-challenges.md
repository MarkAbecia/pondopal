# 0005 — Sharing personal transactions; per-member challenge cells

**Status:** accepted

**Sharing.** A transaction belongs to exactly one space. When a user shares a personal transaction into a shared space, a **copy** is created there with `shared_from_transaction_id` pointing back to the original. The personal row and its space stay private, and the shared space never sees the source space. The pointer is cleared (`ON DELETE SET NULL`) if the original is deleted.

**Group challenges.** `challenge_entries` is unique per `(challenge_id, user_id, cell_index)`, not per `(challenge_id, cell_index)`. Each member fills their own grid, which supports per-member progress, streaks and a leaderboard. Group progress is the sum across members.
