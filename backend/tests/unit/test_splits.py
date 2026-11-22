import pytest

from app.domain.splits import SplitError, SplitMethod, Transfer, balances, settle_up, split


@pytest.mark.parametrize(
    ("amount", "method", "values", "expected"),
    [
        (100_000, SplitMethod.EQUAL, [None] * 3, [33_334, 33_333, 33_333]),  # ₱1,000 / 3
        (2, SplitMethod.EQUAL, [None] * 3, [1, 1, 0]),
        (100_000, SplitMethod.PERCENT, [5000, 3000, 2000], [50_000, 30_000, 20_000]),
        (10_001, SplitMethod.PERCENT, [3333, 3333, 3334], [3333, 3333, 3335]),
        (100_000, SplitMethod.EXACT, [70_000, 30_000], [70_000, 30_000]),
        (100_000, SplitMethod.EXACT, [100_000, 0], [100_000, 0]),
    ],
)
def test_split(
    amount: int, method: SplitMethod, values: list[int | None], expected: list[int]
) -> None:
    shares = split(amount, method, values)
    assert shares == expected
    assert sum(shares) == amount


@pytest.mark.parametrize(
    ("amount", "method", "values", "message"),
    [
        (0, SplitMethod.EQUAL, [None], "positive"),
        (100, SplitMethod.EQUAL, [], "at least one"),
        (100, SplitMethod.PERCENT, [5000, 4000], "100%"),
        (100, SplitMethod.PERCENT, [None, 10_000], "value"),
        (100, SplitMethod.EXACT, [50, 40], "add up"),
        (100, SplitMethod.EXACT, [150, -50], "value"),
    ],
)
def test_split_rejects(
    amount: int, method: SplitMethod, values: list[int | None], message: str
) -> None:
    with pytest.raises(SplitError, match=message):
        split(amount, method, values)


def test_balances_and_settle_up() -> None:
    # Ana paid ₱3,000 dinner split 3 ways; Ben paid ₱600 grab split with Chi
    net = balances(
        [
            ("ana", {"ana": 100_000, "ben": 100_000, "chi": 100_000}),
            ("ben", {"ben": 30_000, "chi": 30_000}),
        ],
        [("chi", "ana", 50_000)],  # Chi already sent Ana ₱500
    )
    assert net == {"ana": 150_000, "ben": -70_000, "chi": -80_000}
    assert sum(net.values()) == 0
    assert settle_up(net) == [Transfer("chi", "ana", 80_000), Transfer("ben", "ana", 70_000)]


def test_settle_up_minimizes_transfers() -> None:
    net = {"a": -500, "b": -300, "c": 600, "d": 200}
    transfers = settle_up(net)
    assert len(transfers) <= len(net) - 1
    after = dict(net)
    for t in transfers:
        after[t.from_user] += t.amount_centavos
        after[t.to_user] -= t.amount_centavos
    assert set(after.values()) == {0}
    assert settle_up({"a": 0, "b": 0}) == []
