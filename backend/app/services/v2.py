from collections import defaultdict
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncConnection

from app.domain import paluwagan as pal_rules
from app.domain import splits as split_rules
from app.repositories import spaces
from app.repositories import v2 as repo
from app.schemas.paluwagan import (
    Member,
    Paid,
    Paluwagan,
    PaluwaganCreate,
    PayIn,
    Payment,
    Round,
    Schedule,
)
from app.schemas.splits import Balance, SettleUp, Share, SplitIn, TransferOut

MANAGERS = ("owner", "admin")


# ---------------------------------------------------------------- splits


async def set_splits(conn: AsyncConnection, me: UUID, txn_id: UUID, body: SplitIn) -> list[Share]:
    txn = await repo.transaction(conn, txn_id)
    if txn is None:
        raise HTTPException(404, "Transaction not found")
    if txn["type"] != "expense":
        raise HTTPException(409, "Only expenses can be split")
    if txn["space_type"] == "personal":
        raise HTTPException(409, "Personal spaces have nobody to split with")
    if txn["user_id"] is None:
        raise HTTPException(409, "The person who paid has left PondoPal")
    # RLS (can_write_as) would reject these too; checking first gives a clear 403
    role = await spaces.my_role(conn, txn["space_id"])
    if not (role in MANAGERS or (role == "member" and txn["user_id"] == me)):
        raise HTTPException(403, "Only the payer or an owner/admin can split this")

    people = [s.user_id for s in body.shares]
    if len(set(people)) != len(people):
        raise HTTPException(422, "Each person can appear once")
    members = await repo.active_members(conn, txn["space_id"])
    if any(p not in members for p in people):
        raise HTTPException(422, "Everyone in the split must be a member of the space")
    try:
        amounts = split_rules.split(
            txn["amount_centavos"], body.method, [s.value for s in body.shares]
        )
    except split_rules.SplitError as e:
        raise HTTPException(422, str(e)) from e
    pairs = list(zip(people, amounts, strict=True))
    await repo.replace_splits(conn, txn_id, txn["space_id"], pairs)
    return [Share(user_id=u, share_centavos=a) for u, a in pairs]


async def settle_up(conn: AsyncConnection, space_id: UUID) -> SettleUp:
    if await spaces.my_role(conn, space_id) is None:
        raise HTTPException(404, "Space not found")
    by_txn: dict[UUID, tuple[UUID, dict[UUID, int]]] = {}
    for r in await repo.split_rows(conn, space_id):
        by_txn.setdefault(r["txn"], (r["payer"], {}))[1][r["user_id"]] = r["share_centavos"]
    members = await repo.active_members(conn, space_id)
    net = {uid: 0 for uid in members}  # everyone shows up, even at zero
    for uid, amount in split_rules.balances(
        by_txn.values(), await repo.settlement_rows(conn, space_id)
    ).items():
        net[uid] = net.get(uid, 0) + amount
    return SettleUp(
        balances=sorted(
            (
                Balance(user_id=u, display_name=members.get(u), net_centavos=v)
                for u, v in net.items()
            ),
            key=lambda b: b.net_centavos,
        ),
        transfers=[
            TransferOut(from_user=t.from_user, to_user=t.to_user, amount_centavos=t.amount_centavos)
            for t in split_rules.settle_up(net)
        ],
    )


# ---------------------------------------------------------------- paluwagan


async def create_paluwagan(conn: AsyncConnection, body: PaluwaganCreate) -> Paluwagan:
    role = await spaces.my_role(conn, body.space_id)
    if role is None:
        raise HTTPException(404, "Space not found")
    if role not in MANAGERS:
        raise HTTPException(403, "Only owners and admins can start a paluwagan")
    if await spaces.space_type(conn, body.space_id) == "personal":
        raise HTTPException(409, "A paluwagan needs a shared space")
    if len(set(body.member_ids)) != len(body.member_ids):
        raise HTTPException(422, "Each member can appear once in the payout order")
    members = await repo.active_members(conn, body.space_id)
    if any(m not in members for m in body.member_ids):
        raise HTTPException(422, "Every paluwagan member must be in the space")
    due = pal_rules.due_dates(body.start_date, body.frequency, len(body.member_ids))
    row = await repo.create_paluwagan(
        conn,
        body.model_dump(
            include={"space_id", "name", "contribution_centavos", "frequency", "start_date"}
        ),
        body.member_ids,
        due,
    )
    return Paluwagan.model_validate(row)


async def schedule(conn: AsyncConnection, pal_id: UUID) -> Schedule:
    row = await repo.paluwagan(conn, pal_id)
    if row is None:
        raise HTTPException(404, "Paluwagan not found")
    pal = Paluwagan.model_validate(row)
    members = [Member.model_validate(m) for m in await repo.paluwagan_members(conn, pal_id)]
    recipient = {m.payout_order: m.user_id for m in members}

    grouped: dict[int, list[dict[str, object]]] = defaultdict(list)
    for r in await repo.paluwagan_rounds(conn, pal_id):
        grouped[r["round_number"]].append(r)
    rounds = [
        Round(
            round_number=n,
            due_date=rows[0]["due_date"],
            recipient_id=recipient.get(n),
            pot_centavos=pal_rules.pot(len(rows), pal.contribution_centavos),
            paid_count=sum(r["paid_at"] is not None for r in rows),
            payments=[Payment.model_validate(r) for r in rows],
        )
        for n, rows in sorted(grouped.items())
    ]
    current = next((r.round_number for r in rounds if r.paid_count < len(r.payments)), None)
    return Schedule(paluwagan=pal, members=members, rounds=rounds, current_round=current)


async def pay(
    conn: AsyncConnection, me: UUID, pal_id: UUID, round_number: int, body: PayIn
) -> Paid:
    user = body.user_id or me
    paid_at = await repo.pay(conn, pal_id, round_number, user, body.paid)
    return Paid(round_number=round_number, user_id=user, paid_at=paid_at)
