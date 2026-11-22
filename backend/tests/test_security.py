import time
import uuid
from typing import Any

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi import HTTPException

from app.core.security import TokenVerifier
from tests.conftest import SECRET, make_token

USER = uuid.uuid4()


async def test_hs256_fallback() -> None:
    user = await TokenVerifier("", SECRET).verify(make_token(USER))
    assert user.id == USER
    assert user.claims["role"] == "authenticated"


@pytest.mark.parametrize(
    "token",
    [
        make_token(USER, secret="wrong-secret-wrong-secret-wrong-secret!"),
        make_token(USER, exp=int(time.time()) - 10),
        make_token(USER, aud="anon"),
        make_token("not-a-uuid"),
        jwt.encode({"sub": str(USER), "aud": "authenticated"}, SECRET, algorithm="HS256"),  # no exp
        jwt.encode(
            {"sub": str(USER), "aud": "authenticated", "exp": time.time() + 60},
            "",
            algorithm="none",
        ),
        "garbage",
    ],
)
async def test_rejected_tokens(token: str) -> None:
    with pytest.raises(HTTPException) as err:
        await TokenVerifier("", SECRET).verify(token)
    assert err.value.status_code == 401


async def test_hs256_disabled_without_secret() -> None:
    with pytest.raises(HTTPException):
        await TokenVerifier("", "").verify(make_token(USER))


async def test_es256_via_jwks(monkeypatch: pytest.MonkeyPatch) -> None:
    private = ec.generate_private_key(ec.SECP256R1())
    token = jwt.encode(
        {"sub": str(USER), "aud": "authenticated", "exp": int(time.time()) + 60},
        private,
        algorithm="ES256",
        headers={"kid": "k1"},
    )

    class FakeJwks:
        def get_signing_key_from_jwt(self, _: str) -> Any:
            return type("Key", (), {"key": private.public_key()})

    verifier = TokenVerifier("http://unused/jwks.json", "")
    monkeypatch.setattr(verifier, "_jwks", FakeJwks())
    assert (await verifier.verify(token)).id == USER

    # signed by a key that isn't in the JWKS
    other = ec.generate_private_key(ec.SECP256R1())
    forged = jwt.encode(
        {"sub": str(USER), "aud": "authenticated", "exp": int(time.time()) + 60},
        other,
        algorithm="ES256",
    )
    with pytest.raises(HTTPException):
        await verifier.verify(forged)
