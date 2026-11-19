import time

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi import HTTPException

from backend import auth
from backend.tests.conftest import SUPABASE_URL, USER_ID

ISSUER = f"{SUPABASE_URL}/auth/v1"


def make_claims(**over):
    now = int(time.time())
    claims = {"sub": USER_ID, "aud": "authenticated", "iss": ISSUER, "exp": now + 3600, "iat": now, "email": "a@b.c"}
    claims.update(over)
    return claims


class FakeJWKS:
    def __init__(self, public_key):
        self.public_key = public_key

    def get_signing_key_from_jwt(self, token):
        return type("K", (), {"key": self.public_key})()


@pytest.fixture
def es256(monkeypatch):
    private = ec.generate_private_key(ec.SECP256R1())
    monkeypatch.setattr(auth, "_jwks_client", lambda url: FakeJWKS(private.public_key()))
    return private


def test_valid_es256_token(es256, settings):
    token = jwt.encode(make_claims(), es256, algorithm="ES256", headers={"kid": "k1"})
    assert auth.verify_token(token, settings)["sub"] == USER_ID


@pytest.mark.parametrize(
    "over, detail",
    [
        ({"exp": int(time.time()) - 10}, "Token expired"),
        ({"aud": "anon"}, "Invalid token"),
        ({"iss": "https://evil.example/auth/v1"}, "Invalid token"),
    ],
)
def test_rejects_bad_claims(es256, settings, over, detail):
    token = jwt.encode(make_claims(**over), es256, algorithm="ES256")
    with pytest.raises(HTTPException) as e:
        auth.verify_token(token, settings)
    assert e.value.status_code == 401 and e.value.detail == detail


def test_rejects_token_signed_by_other_key(es256, settings):
    other = ec.generate_private_key(ec.SECP256R1())
    token = jwt.encode(make_claims(), other, algorithm="ES256")
    with pytest.raises(HTTPException):
        auth.verify_token(token, settings)


def test_hs256_rejected_without_secret(settings):
    token = jwt.encode(make_claims(), "x" * 32, algorithm="HS256")
    with pytest.raises(HTTPException):
        auth.verify_token(token, settings)


def test_hs256_accepted_with_legacy_secret(settings):
    secret = "legacy-secret-" + "x" * 32
    settings.supabase_jwt_secret = secret
    token = jwt.encode(make_claims(), secret, algorithm="HS256")
    assert auth.verify_token(token, settings)["sub"] == USER_ID


def test_rejects_alg_none(settings):
    token = jwt.encode(make_claims(), None, algorithm="none")
    with pytest.raises(HTTPException):
        auth.verify_token(token, settings)


@pytest.mark.parametrize(
    "method, path",
    [
        ("get", "/api/v1/profile"),
        ("get", "/api/v1/meals?date=2026-11-19"),
        ("post", "/api/v1/analyze"),
        ("get", "/api/v1/stats/summary?today=2026-11-19"),
    ],
)
def test_endpoints_require_token(anon_client, method, path):
    r = getattr(anon_client, method)(path)
    assert r.status_code == 401


def test_health_is_public(anon_client):
    assert anon_client.get("/api/health").json() == {"status": "ok"}


def test_key_fetch_failure_is_503_not_401(settings, monkeypatch):
    class Down:
        def get_signing_key_from_jwt(self, token):
            raise jwt.PyJWKClientConnectionError("down")

    monkeypatch.setattr(auth, "_jwks_client", lambda url: Down())
    private = ec.generate_private_key(ec.SECP256R1())
    token = jwt.encode(make_claims(), private, algorithm="ES256")
    with pytest.raises(HTTPException) as e:
        auth.verify_token(token, settings)
    assert e.value.status_code == 503
