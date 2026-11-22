"""Structured JSON logs with a per-request ID. Never log tokens, bodies or raw paths (PII)."""

import json
import logging
import time
import uuid
from collections.abc import Awaitable, Callable
from contextvars import ContextVar

from fastapi import Request, Response

request_id_var: ContextVar[str] = ContextVar("request_id", default="-")
log = logging.getLogger("pondopal")


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        entry = {
            "ts": self.formatTime(record, "%Y-%m-%dT%H:%M:%S%z"),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
            "request_id": request_id_var.get(),
            **getattr(record, "extra_fields", {}),
        }
        if record.exc_info:
            entry["exc"] = self.formatException(record.exc_info)
        return json.dumps(entry, default=str)


def configure_logging(level: str) -> None:
    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter())
    logging.basicConfig(level=level, handlers=[handler], force=True)


async def request_context(
    request: Request, call_next: Callable[[Request], Awaitable[Response]]
) -> Response:
    rid = request.headers.get("x-request-id") or uuid.uuid4().hex
    request_id_var.set(rid[:64])
    start = time.perf_counter()
    response = await call_next(request)
    route = request.scope.get("route")
    log.info(
        "request",
        extra={
            "extra_fields": {
                "method": request.method,
                # route template (/v1/invites/{code}/accept), never the raw path with codes/ids
                "route": getattr(route, "path", "unmatched"),
                "status": response.status_code,
                "ms": round((time.perf_counter() - start) * 1000, 1),
            }
        },
    )
    response.headers["x-request-id"] = request_id_var.get()
    return response
