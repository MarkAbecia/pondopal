"""Supabase Storage admin calls with the service-role key (server only)."""

import httpx

PAGE = 1000


async def remove_folder(
    client: httpx.AsyncClient, base_url: str, service_key: str, bucket: str, folder: str
) -> int:
    """Deletes every object directly under bucket/folder/. Returns how many were removed."""
    headers = {"Authorization": f"Bearer {service_key}", "apikey": service_key}
    removed = 0
    while True:
        # always offset 0: each round deletes what the previous listing returned
        res = await client.post(
            f"{base_url}/storage/v1/object/list/{bucket}",
            json={"prefix": folder, "limit": PAGE, "offset": 0},
            headers=headers,
        )
        res.raise_for_status()
        names = [f"{folder}/{o['name']}" for o in res.json() if o.get("id")]  # id null = folder
        if not names:
            return removed
        res = await client.request(
            "DELETE",
            f"{base_url}/storage/v1/object/{bucket}",
            json={"prefixes": names},
            headers=headers,
        )
        res.raise_for_status()
        removed += len(names)
