from collections import defaultdict
from datetime import date, datetime
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncConnection

from app.domain import challenges as rules
from app.domain import goals
from app.domain.time import MANILA
from app.repositories import challenges as repo
from app.repositories import spaces
from app.schemas.challenges import (
    Challenge,
    ChallengeCreate,
    ChallengeProgress,
    ChallengeTemplate,
    Entry,
    EntryCreate,
    MemberProgress,
)
from app.schemas.goals import GoalPlan

WRITERS = ("owner", "admin", "member")


def _today() -> date:
    return datetime.now(MANILA).date()


async def templates(conn: AsyncConnection) -> list[ChallengeTemplate]:
    return [ChallengeTemplate.model_validate(t) for t in await repo.templates(conn)]


async def create(conn: AsyncConnection, body: ChallengeCreate) -> Challenge:
    # RLS limits inserts to owners/admins; checking first gives a clear 404/403
    role = await spaces.my_role(conn, body.space_id)
    if role is None:
        raise HTTPException(404, "Space not found")
    if role not in ("owner", "admin"):
        raise HTTPException(403, "Only owners and admins can start a challenge")
    template = await repo.template_rules(conn, body.template_key)
    if template is None:
        raise HTTPException(422, f"Unknown template {body.template_key!r}")
    base = body.base_centavos or int(template.get("default_base_centavos", 0))
    if body.template_key in rules.GRID_CELLS and base < 1:
        raise HTTPException(422, "base_centavos is required for this template")
    row = await repo.create(
        conn,
        {
            "space_id": body.space_id,
            "template_key": body.template_key,
            "name": body.name,
            "base_centavos": base,
            "settings": body.settings.model_dump(exclude_defaults=True),
            "start_date": body.start_date,
        },
    )
    return Challenge.model_validate(row)


async def _challenge(conn: AsyncConnection, challenge_id: UUID) -> Challenge:
    row = await repo.get(conn, challenge_id)
    if row is None:
        raise HTTPException(404, "Challenge not found")
    return Challenge.model_validate(row)


async def add_entry(conn: AsyncConnection, challenge_id: UUID, body: EntryCreate) -> Entry:
    ch = await _challenge(conn, challenge_id)
    if ch.status != "active":
        raise HTTPException(409, "This challenge has ended")
    if ch.template_key == "no_spend":
        raise HTTPException(409, "No-spend days are counted from your transactions")
    if await spaces.my_role(conn, ch.space_id) not in WRITERS:
        raise HTTPException(403, "Viewers can't save entries")
    if ch.template_key in rules.GRID_CELLS:
        if body.cell_index is None:
            raise HTTPException(422, "cell_index is required for this challenge")
        cell = body.cell_index
    else:
        # bill_50 / custom are a running log: the next number in line
        cell = await repo.next_cell(conn, challenge_id)
    try:
        amount = rules.entry_amount(
            ch.template_key,
            cell_index=cell,
            base_centavos=ch.base_centavos,
            settings=ch.settings,
            bills=body.bills,
            amount_centavos=body.amount_centavos,
        )
    except rules.ChallengeError as e:
        raise HTTPException(422, str(e)) from e
    # a duplicate cell hits unique (challenge_id, user_id, cell_index) -> 409
    return Entry.model_validate(await repo.add_entry(conn, ch.id, ch.space_id, cell, amount))


async def progress(conn: AsyncConnection, challenge_id: UUID, me: UUID) -> ChallengeProgress:
    ch = await _challenge(conn, challenge_id)
    today = _today()
    people = await repo.members(conn, ch.space_id)

    if ch.template_key == "no_spend":
        # space-wide: one result shared by every member
        expense_days = await repo.expense_days(conn, ch.space_id, ch.start_date)
        days = rules.no_spend_days(expense_days, ch.start_date, today)
        cells = [(d - ch.start_date).days + 1 for d in days]
        shared = rules.Progress(0, None, len(days), None, None, rules.streak(days, today))
        by_user = {p["user_id"]: shared for p in people}
        mine_cells = cells
    else:
        grouped: dict[UUID, list[rules.Entry]] = defaultdict(list)
        for e in await repo.entries(conn, challenge_id):
            grouped[e["user_id"]].append(
                rules.Entry(e["cell_index"], e["amount_centavos"], e["saved_on"])
            )
        by_user = {
            p["user_id"]: rules.progress(
                ch.template_key, ch.base_centavos, ch.settings, grouped[p["user_id"]], today
            )
            for p in people
        }
        mine_cells = sorted(e.cell_index for e in grouped[me])

    names = {p["user_id"]: p["display_name"] for p in people}
    members = sorted(
        (
            MemberProgress(user_id=uid, display_name=names.get(uid), **vars(p))
            for uid, p in by_user.items()
        ),
        key=lambda m: -m.saved_centavos,
    )
    mine = next((m for m in members if m.user_id == me), None)
    if mine is None:  # pragma: no cover - RLS only shows challenges of spaces you're in
        raise HTTPException(404, "Challenge not found")
    return ChallengeProgress(challenge=ch, me=mine, cells=mine_cells, members=members)


async def goal_plan(conn: AsyncConnection, goal_id: UUID) -> GoalPlan:
    g = await repo.goal_with_total(conn, goal_id)
    if g is None:
        raise HTTPException(404, "Goal not found")
    p = goals.plan(
        target_centavos=g["target_centavos"],
        contributed_centavos=g["contributed"],
        deadline=g["deadline"],
        frequency=goals.Frequency(g["pay_frequency"]),
        today=_today(),
        started_on=g["started_on"],
    )
    return GoalPlan(
        goal_id=g["id"],
        target_centavos=g["target_centavos"],
        contributed_centavos=g["contributed"],
        deadline=g["deadline"],
        pay_frequency=g["pay_frequency"],
        **vars(p),
    )
