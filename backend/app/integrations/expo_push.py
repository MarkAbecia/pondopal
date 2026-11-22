"""Expo Push API client (https://docs.expo.dev/push-notifications/sending-notifications/)."""

from dataclasses import dataclass, field
from typing import Any

import httpx

from app.core.logging import log

URL = "https://exp.host/--/api/v2/push/send"
BATCH = 100  # Expo's per-request limit


@dataclass(frozen=True)
class Push:
    to: str
    title: str
    body: str
    data: dict[str, Any] = field(default_factory=dict)


async def send(client: httpx.AsyncClient, pushes: list[Push], access_token: str = "") -> list[str]:
    """Sends in batches. Returns tokens Expo says are dead (DeviceNotRegistered) so the caller
    can clear them. Failures are logged and skipped: a missed nudge must not stop the job."""
    headers = {"Authorization": f"Bearer {access_token}"} if access_token else {}
    dead: list[str] = []
    for i in range(0, len(pushes), BATCH):
        batch = pushes[i : i + BATCH]
        try:
            res = await client.post(
                URL,
                json=[
                    {
                        "to": p.to,
                        "title": p.title,
                        "body": p.body,
                        "data": p.data,
                        "sound": "default",
                    }
                    for p in batch
                ],
                headers=headers,
            )
            res.raise_for_status()
            tickets = res.json().get("data", [])
        except (httpx.HTTPError, ValueError) as e:
            log.warning(
                "expo push batch failed", extra={"extra_fields": {"error": type(e).__name__}}
            )
            continue
        for push, ticket in zip(batch, tickets, strict=False):
            if ticket.get("status") == "error":
                if ticket.get("details", {}).get("error") == "DeviceNotRegistered":
                    dead.append(push.to)
                else:
                    log.warning(
                        "expo push ticket error",
                        extra={"extra_fields": {"error": ticket.get("details", {}).get("error")}},
                    )
    return dead
