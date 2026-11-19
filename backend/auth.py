"""Supabase access-token verification.

The browser signs in with Supabase Auth and sends its access token as
`Authorization: Bearer <token>`. We verify it here and keep the raw token so
database calls run as that user and row-level security still applies.
"""

import ssl
from dataclasses import dataclass
from functools import lru_cache

import certifi
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from backend.config import Settings, get_settings

ASYMMETRIC_ALGS = ["ES256", "RS256", "EdDSA"]
AUDIENCE = "authenticated"

_bearer = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class CurrentUser:
    id: str
    token: str
    email: str | None = None


@lru_cache
def _jwks_client(url: str) -> jwt.PyJWKClient:
    # Caches signing keys in memory; refetches when it sees an unknown `kid`.
    # certifi's CA bundle: python.org's macOS Python has none for urllib by default.
    return jwt.PyJWKClient(
        url,
        cache_keys=True,
        lifespan=3600,
        timeout=5,
        ssl_context=ssl.create_default_context(cafile=certifi.where()),
    )


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def verify_token(token: str, settings: Settings) -> dict:
    try:
        alg = jwt.get_unverified_header(token).get("alg")
        options = {"require": ["exp", "sub"]}
        if alg == "HS256":
            if not settings.supabase_jwt_secret:
                raise _unauthorized("Unsupported token")
            key = settings.supabase_jwt_secret
            algorithms = ["HS256"]
        elif alg in ASYMMETRIC_ALGS:
            key = _jwks_client(settings.jwks_url).get_signing_key_from_jwt(token).key
            algorithms = ASYMMETRIC_ALGS
        else:
            raise _unauthorized("Unsupported token")
        return jwt.decode(
            token,
            key,
            algorithms=algorithms,
            audience=AUDIENCE,
            issuer=settings.jwt_issuer,
            options=options,
        )
    except HTTPException:
        raise
    except jwt.ExpiredSignatureError:
        raise _unauthorized("Token expired")
    except jwt.PyJWKClientConnectionError:
        # Our problem, not the user's: don't make the client think it was logged out.
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Could not verify login, try again")
    except (jwt.PyJWTError, jwt.PyJWKClientError):
        raise _unauthorized("Invalid token")


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
    settings: Settings = Depends(get_settings),
) -> CurrentUser:
    if creds is None or creds.scheme.lower() != "bearer" or not creds.credentials:
        raise _unauthorized("Missing bearer token")
    claims = verify_token(creds.credentials, settings)
    return CurrentUser(id=claims["sub"], token=creds.credentials, email=claims.get("email"))
