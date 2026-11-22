"""Bill splitting and settle-up (misc/docs/challenge-rules.md). Pure; all money in centavos."""

from collections.abc import Hashable, Iterable, Mapping, Sequence
from dataclasses import dataclass
from enum import StrEnum


class SplitMethod(StrEnum):
    EQUAL = "equal"
    PERCENT = "percent"  # values are basis points: 2500 = 25.00%, summing to 10000
    EXACT = "exact"  # values are centavos, summing to the amount


class SplitError(ValueError):
    pass


def _largest_remainder(total: int, weights: Sequence[int]) -> list[int]:
    """Splits `total` in proportion to `weights` so the parts sum exactly to `total`. Leftover
    centavos go to the largest fractional parts; ties go to whoever is listed first."""
    whole = sum(weights)
    parts = [total * w // whole for w in weights]
    order = sorted(range(len(weights)), key=lambda i: (-(total * weights[i] % whole), i))
    for i in order[: total - sum(parts)]:
        parts[i] += 1
    return parts


def split(amount: int, method: SplitMethod, values: Sequence[int | None]) -> list[int]:
    """Each person's share of `amount`, in the order given. `values` is ignored for EQUAL."""
    if amount < 1:
        raise SplitError("amount must be positive")
    if not values:
        raise SplitError("split between at least one person")
    if method == SplitMethod.EQUAL:
        return _largest_remainder(amount, [1] * len(values))
    if any(v is None or v < 0 for v in values):
        raise SplitError("every share needs a value of 0 or more")
    given = [v for v in values if v is not None]
    if method == SplitMethod.PERCENT:
        if sum(given) != 10_000:
            raise SplitError("percentages must add up to 100%")
        return _largest_remainder(amount, given)
    if sum(given) != amount:
        raise SplitError("exact shares must add up to the amount")
    return given


@dataclass(frozen=True)
class Transfer[K: Hashable]:
    from_user: K
    to_user: K
    amount_centavos: int


def balances[K: Hashable](
    splits: Iterable[tuple[K, Mapping[K, int]]],
    settlements: Iterable[tuple[K, K, int]],
) -> dict[K, int]:
    """Net position per person: positive = is owed money, negative = owes.
    splits: (payer, {person: share}) per split expense. settlements: (from, to, amount)."""
    net: dict[K, int] = {}
    for payer, shares in splits:
        for person, share in shares.items():
            if person != payer:  # your own share of what you paid is just spending
                net[payer] = net.get(payer, 0) + share
                net[person] = net.get(person, 0) - share
    for payer, payee, amount in settlements:
        net[payer] = net.get(payer, 0) + amount
        net[payee] = net.get(payee, 0) - amount
    return net


def settle_up[K: Hashable](net: Mapping[K, int]) -> list[Transfer[K]]:
    """Greedy: the biggest debtor pays the biggest creditor, repeatedly. At most n - 1
    transfers. Ties are broken by the order people appear in `net`, so results are stable."""
    rank = {p: i for i, p in enumerate(net)}
    debtors = [(p, -v) for p, v in net.items() if v < 0]
    creditors = [(p, v) for p, v in net.items() if v > 0]
    out: list[Transfer[K]] = []
    while debtors and creditors:
        debtors.sort(key=lambda x: (-x[1], rank[x[0]]))
        creditors.sort(key=lambda x: (-x[1], rank[x[0]]))
        (debtor, owes), (creditor, owed) = debtors[0], creditors[0]
        amount = min(owes, owed)
        out.append(Transfer(debtor, creditor, amount))
        debtors[0] = (debtor, owes - amount)
        creditors[0] = (creditor, owed - amount)
        debtors = [d for d in debtors if d[1]]
        creditors = [c for c in creditors if c[1]]
    return out
