"""Supabase access-token verification: JWKS (ES256/RS256) first, legacy HS256 secret as fallback."""

import asyncio
from dataclasses import dataclass
from typing import Annotated, Any
from uuid import UUID

import jwt
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

ASYMMETRIC_ALGS = {"ES256", "RS256"}
AUDIENCE = "authenticated"


@dataclass(frozen=True)
class AuthUser:
    id: UUID
    claims: dict[str, Any]


class TokenVerifier:
    def __init__(self, jwks_url: str, legacy_secret: str) -> None:
        self._jwks = jwt.PyJWKClient(jwks_url, cache_keys=True, lifespan=600) if jwks_url else None
        self._secret = legacy_secret

    async def verify(self, token: str) -> AuthUser:
        try:
            alg = jwt.get_unverified_header(token).get("alg")
            key: Any
            if alg in ASYMMETRIC_ALGS and self._jwks:
                # PyJWKClient is sync and caches keys; network only on cache miss / rotation
                key = (await asyncio.to_thread(self._jwks.get_signing_key_from_jwt, token)).key
            elif alg == "HS256" and self._secret:
                key = self._secret
            else:
                raise jwt.InvalidAlgorithmError(f"unsupported alg {alg}")
            claims: dict[str, Any] = jwt.decode(
                token, key, algorithms=[alg], audience=AUDIENCE, options={"require": ["exp", "sub"]}
            )
            return AuthUser(id=UUID(claims["sub"]), claims=claims)
        except (jwt.PyJWTError, ValueError) as exc:
            raise HTTPException(
                401, "Invalid or expired token", headers={"WWW-Authenticate": "Bearer"}
            ) from exc


bearer = HTTPBearer(auto_error=False)


async def current_user(
    request: Request,
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
) -> AuthUser:
    if creds is None:
        raise HTTPException(401, "Missing bearer token", headers={"WWW-Authenticate": "Bearer"})
    verifier: TokenVerifier = request.app.state.verifier
    return await verifier.verify(creds.credentials)


CurrentUser = Annotated[AuthUser, Depends(current_user)]
