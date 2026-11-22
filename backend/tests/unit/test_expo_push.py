import json

import httpx

from app.integrations.expo_push import URL, Push, send


async def test_batches_and_collects_dead_tokens() -> None:
    sizes: list[int] = []

    def handler(request: httpx.Request) -> httpx.Response:
        assert str(request.url) == URL
        assert request.headers["authorization"] == "Bearer tok"
        msgs = json.loads(request.content)
        sizes.append(len(msgs))
        tickets = [
            {"status": "error", "details": {"error": "DeviceNotRegistered"}}
            if m["to"] == "dead"
            else {"status": "error", "details": {"error": "MessageRateExceeded"}}
            if m["to"] == "slow"
            else {"status": "ok", "id": "x"}
            for m in msgs
        ]
        return httpx.Response(200, json={"data": tickets})

    pushes = [Push(f"ExponentPushToken[{i}]", "t", "b") for i in range(148)]
    pushes += [Push("dead", "t", "b"), Push("slow", "t", "b")]
    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        assert await send(client, pushes, access_token="tok") == ["dead"]
    assert sizes == [100, 50]


async def test_failed_batch_is_skipped_not_raised() -> None:
    calls = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        if calls == 1:
            return httpx.Response(503)
        return httpx.Response(
            200, json={"data": [{"status": "error", "details": {"error": "DeviceNotRegistered"}}]}
        )

    pushes = [Push(str(i), "t", "b") for i in range(101)]
    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        assert await send(client, pushes) == ["100"]
    assert calls == 2
