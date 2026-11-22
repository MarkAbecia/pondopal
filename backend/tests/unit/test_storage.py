import json

import httpx

from app.integrations.storage import remove_folder


async def test_remove_folder_lists_then_deletes_until_empty() -> None:
    pages = [[{"name": "a.jpg", "id": "1"}, {"name": "sub", "id": None}], []]
    deleted: list[list[str]] = []

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.headers["apikey"] == "svc"
        assert request.headers["authorization"] == "Bearer svc"
        body = json.loads(request.content)
        if request.method == "POST":
            assert request.url.path == "/storage/v1/object/list/receipts"
            assert body["prefix"] == "space-1"
            return httpx.Response(200, json=pages.pop(0))
        assert request.method == "DELETE"
        assert request.url.path == "/storage/v1/object/receipts"
        deleted.append(body["prefixes"])
        return httpx.Response(200, json=[])

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        n = await remove_folder(client, "http://sb", "svc", "receipts", "space-1")
    assert n == 1
    assert deleted == [["space-1/a.jpg"]]
