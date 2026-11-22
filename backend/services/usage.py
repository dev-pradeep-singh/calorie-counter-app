"""Daily AI scan limit. Counts live in Supabase (see supabase/migrations/*_scan_usage.sql)."""

import logging
from datetime import datetime, time, timedelta, timezone

from fastapi import HTTPException, status
from postgrest.exceptions import APIError

from backend.schemas import ScanUsage

log = logging.getLogger(__name__)

# PostgREST / Postgres codes for "function or table does not exist": the migration hasn't run yet.
MISSING = {"PGRST202", "PGRST205", "42883", "42P01"}


def utc_today():
    return datetime.now(timezone.utc).date()


def resets_at() -> datetime:
    return datetime.combine(utc_today() + timedelta(days=1), time.min, tzinfo=timezone.utc)


def _missing(e: APIError) -> bool:
    if e.code in MISSING:
        log.warning("Scan limit not enforced: run the scan_usage migration in Supabase (%s)", e.code)
        return True
    return False


def current(repo, limit: int) -> ScanUsage:
    try:
        used = repo.scans_on(utc_today())
    except APIError as e:
        if not _missing(e):
            raise
        used = 0
    if limit <= 0:
        return ScanUsage(used=used, limit=None, remaining=None, resets_at=resets_at())
    return ScanUsage(used=used, limit=limit, remaining=max(0, limit - used), resets_at=resets_at())


def consume(repo, limit: int) -> None:
    """Use one scan, or raise 429 if today's limit is reached. limit <= 0 means unlimited."""
    if limit <= 0:
        return
    try:
        count = repo.use_scan(limit)
    except APIError as e:
        if _missing(e):
            return  # fail open rather than break analysis before the table exists
        raise
    if count is None:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            f"You've used all {limit} AI scans for today. They reset at midnight UTC.",
            headers={"Retry-After": str(int((resets_at() - datetime.now(timezone.utc)).total_seconds()))},
        )
