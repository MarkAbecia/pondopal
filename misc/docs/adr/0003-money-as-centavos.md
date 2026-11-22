# 0003 — Money is integer centavos

**Status:** accepted

**Decision.** Every amount is stored as `bigint` centavos and handled in code as integers. Python uses `int` and TypeScript uses `number`, which is safe up to about ₱90 trillion. Floats are never used. On the frontend, `toCentavos`, `fromCentavos` and `formatPHP` in `src/lib/money.ts` are the only way to convert or display money. Division rounds up (`ceil`) when the result tells a user how much they still need to save.

**Consequences.** There are no rounding drifts. The API exchanges integers, and formatting happens only at the edge.
