import uuid
from datetime import UTC, datetime
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import DBAPIError

from app.repositories import spaces as repo
from tests.conftest import make_token

ALICE = uuid.uuid4()
SPACE = uuid.uuid4()


def auth(sub: uuid.UUID = ALICE) -> dict[str, str]:
    return {"Authorization": f"Bearer {make_token(sub)}"}


def fake_repo(monkeypatch: pytest.MonkeyPatch, role: str | None, kind: str = "group") -> None:
    async def my_role(conn: Any, space_id: uuid.UUID) -> str | None:
        return role

    async def space_type(conn: Any, space_id: uuid.UUID) -> str:
        return kind

    async def create_invite(conn: Any, space_id: uuid.UUID, role: str, *_: Any) -> dict[str, Any]:
        return {
            "code": "ABCDEF1234",
            "space_id": space_id,
            "role": role,
            "expires_at": datetime(2026, 11, 29, tzinfo=UTC),
            "max_uses": None,
        }

    monkeypatch.setattr(repo, "my_role", my_role)
    monkeypatch.setattr(repo, "space_type", space_type)
    monkeypatch.setattr(repo, "create_invite", create_invite)


def test_health_and_request_id(client: TestClient) -> None:
    r = client.get("/health", headers={"x-request-id": "abc123"})
    assert r.json() == {"status": "ok"}
    assert r.headers["x-request-id"] == "abc123"


def test_missing_token_is_problem_json(client: TestClient) -> None:
    r = client.post(f"/v1/spaces/{SPACE}/invites", json={})
    assert r.status_code == 401
    assert r.headers["content-type"] == "application/problem+json"
    body = r.json()
    assert body["title"] == "Unauthorized"
    assert body["instance"] == "/v1/spaces/{space_id}/invites"
    assert body["request_id"] == r.headers["x-request-id"]


def test_validation_error_is_problem_json(client: TestClient) -> None:
    r = client.post(f"/v1/spaces/{SPACE}/invites", json={"role": "owner"}, headers=auth())
    assert r.status_code == 422
    assert r.headers["content-type"] == "application/problem+json"
    assert r.json()["errors"][0]["loc"] == ["body", "role"]
    assert "input" not in r.json()["errors"][0]


@pytest.mark.parametrize(
    ("role", "kind", "status"),
    [
        (None, "group", 404),
        ("member", "group", 403),
        ("viewer", "group", 403),
        ("owner", "personal", 409),
        ("admin", "group", 201),
        ("owner", "partner", 201),
    ],
)
def test_create_invite_role_checks(
    client: TestClient, monkeypatch: pytest.MonkeyPatch, role: str | None, kind: str, status: int
) -> None:
    fake_repo(monkeypatch, role, kind)
    r = client.post(f"/v1/spaces/{SPACE}/invites", json={"role": "viewer"}, headers=auth())
    assert r.status_code == status, r.json()
    if status == 201:
        assert r.json()["code"] == "ABCDEF1234" and r.json()["role"] == "viewer"


def test_rate_limit(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    fake_repo(monkeypatch, "owner")
    codes = [
        client.post(f"/v1/spaces/{SPACE}/invites", json={}, headers=auth()).status_code
        for _ in range(21)
    ]
    assert codes[:20] == [201] * 20
    assert codes[20] == 429
    # a different user has their own budget
    other = client.post(f"/v1/spaces/{SPACE}/invites", json={}, headers=auth(uuid.uuid4()))
    assert other.status_code == 201


class PgError(Exception):
    def __init__(self, sqlstate: str, message: str) -> None:
        super().__init__(message)
        self.sqlstate = sqlstate
        self.message = message


@pytest.mark.parametrize(
    ("sqlstate", "status", "detail"),
    [
        ("P0002", 404, "invite is invalid or expired"),
        ("P0001", 409, "partner space is full"),
        ("42501", 403, None),
        ("XX000", 500, None),
    ],
)
def test_db_errors_map_to_http(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
    sqlstate: str,
    status: int,
    detail: str | None,
) -> None:
    async def accept(conn: Any, code: str) -> uuid.UUID:
        err = DBAPIError("select", {}, Exception("wrapped"))
        err.orig.__cause__ = PgError(sqlstate, detail or "internal")  # type: ignore[union-attr]
        raise err

    monkeypatch.setattr(repo, "accept_invite", accept)
    r = client.post("/v1/invites/ABCD1234/accept", headers=auth())
    assert r.status_code == status
    assert r.json().get("detail") == detail


def test_accept_rejects_odd_codes(client: TestClient) -> None:
    r = client.post("/v1/invites/drop;table/accept", headers=auth())
    assert r.status_code == 422
