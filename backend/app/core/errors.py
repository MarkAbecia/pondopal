"""RFC 7807 problem+json for every error response."""

from http import HTTPStatus

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import DBAPIError
from starlette.exceptions import HTTPException

from app.core.logging import log, request_id_var

# Postgres SQLSTATE -> HTTP status. RLS denials are 42501; accept_invite raises P0001/P0002.
SQLSTATE_STATUS = {
    "42501": 403,
    "P0002": 404,
    "P0001": 409,
    "23505": 409,
    "23503": 422,
    "23514": 422,
    "22P02": 422,
    "28000": 401,
}


def problem(
    request: Request,
    status: int,
    detail: str | None = None,
    headers: dict[str, str] | None = None,
    **extra: object,
) -> JSONResponse:
    body = {
        "type": "about:blank",
        "title": HTTPStatus(status).phrase,
        "status": status,
        "detail": detail,
        "instance": request.scope.get("route").path if request.scope.get("route") else None,  # type: ignore[union-attr]
        "request_id": request_id_var.get(),
        **extra,
    }
    return JSONResponse(
        {k: v for k, v in body.items() if v is not None},
        status_code=status,
        media_type="application/problem+json",
        headers=headers,
    )


def pg_error(exc: DBAPIError) -> BaseException | None:
    return getattr(exc.orig, "__cause__", None)


def sqlstate(exc: DBAPIError) -> str | None:
    orig = exc.orig
    # SQLAlchemy wraps the asyncpg exception; the original is the __cause__
    code = getattr(orig, "sqlstate", None) or getattr(pg_error(exc), "sqlstate", None)
    return str(code) if code else None


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(HTTPException)
    async def http_error(request: Request, exc: HTTPException) -> JSONResponse:
        headers = dict(exc.headers) if exc.headers else None
        return problem(request, exc.status_code, str(exc.detail), headers=headers)

    @app.exception_handler(RequestValidationError)
    async def validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
        errors = [{"loc": e["loc"], "msg": e["msg"]} for e in exc.errors()]  # drop echoed input
        return problem(request, 422, "Request validation failed", errors=errors)

    @app.exception_handler(DBAPIError)
    async def db_error(request: Request, exc: DBAPIError) -> JSONResponse:
        code = sqlstate(exc)
        status = SQLSTATE_STATUS.get(code or "")
        if status is None:
            log.exception("database error", extra={"extra_fields": {"sqlstate": code}})
            return problem(request, 500)
        # P000x messages are ours (accept_invite/leave_space) and safe to show
        detail = getattr(pg_error(exc), "message", None) if code and code[0] == "P" else None
        return problem(request, status, detail)

    @app.exception_handler(Exception)
    async def unhandled(request: Request, exc: Exception) -> JSONResponse:
        log.exception("unhandled error")
        return problem(request, 500)
