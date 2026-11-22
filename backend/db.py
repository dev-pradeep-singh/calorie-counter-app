"""Supabase PostgREST access, always as the signed-in user.

Every request gets a client that sends the user's own access token, so
row-level security decides what it can read and write. The user id filters
below are for clarity and index use; RLS is what actually enforces them.
"""

from collections.abc import Iterator
from datetime import date

import httpx
from fastapi import Depends
from postgrest import SyncPostgrestClient

from backend.auth import CurrentUser, get_current_user
from backend.config import Settings, get_settings

PAGE_SIZE = 1000  # PostgREST's default max rows per response
MEAL_COLUMNS = "id, date, name, calories, protein, carbs, fat, fiber, emoji, logged_at"


class Repo:
    def __init__(self, client: SyncPostgrestClient, user_id: str):
        self.client = client
        self.user_id = user_id

    # ── profiles ────────────────────────────────────────────────────────────
    def get_profile(self) -> dict | None:
        rows = self.client.table("profiles").select("*").eq("id", self.user_id).limit(1).execute().data
        return rows[0] if rows else None

    def upsert_profile(self, fields: dict) -> dict:
        row = {**fields, "id": self.user_id}
        return self.client.table("profiles").upsert(row).execute().data[0]

    # ── meal_logs ───────────────────────────────────────────────────────────
    def list_meals(self, day: date) -> list[dict]:
        return (
            self.client.table("meal_logs")
            .select(MEAL_COLUMNS)
            .eq("user_id", self.user_id)
            .eq("date", day.isoformat())
            .order("logged_at", desc=True)
            .execute()
            .data
        )

    def insert_meal(self, row: dict) -> dict:
        row = {**row, "user_id": self.user_id}
        return self.client.table("meal_logs").insert(row).execute().data[0]

    def delete_meal(self, meal_id: str) -> bool:
        deleted = (
            self.client.table("meal_logs")
            .delete()
            .eq("id", meal_id)
            .eq("user_id", self.user_id)
            .execute()
            .data
        )
        return bool(deleted)

    def meal_history(self) -> list[dict]:
        return self._all(
            "name, calories, protein, carbs, fat, fiber, emoji, logged_at",
            order="logged_at",
        )

    def daily_rows(self, start: date | None = None, end: date | None = None) -> list[dict]:
        return self._all("date, calories, protein", order="date", start=start, end=end)

    def _all(self, columns: str, order: str, start: date | None = None, end: date | None = None) -> list[dict]:
        """Fetch every matching row, paging past PostgREST's per-response cap."""
        rows: list[dict] = []
        offset = 0
        while True:
            query = self.client.table("meal_logs").select(columns).eq("user_id", self.user_id)
            if start:
                query = query.gte("date", start.isoformat())
            if end:
                query = query.lte("date", end.isoformat())
            page = query.order(order, desc=True).order("id").range(offset, offset + PAGE_SIZE - 1).execute().data
            rows.extend(page)
            if len(page) < PAGE_SIZE:
                return rows
            offset += PAGE_SIZE


    # ── scan_usage ──────────────────────────────────────────────────────────
    def scans_on(self, day: date) -> int:
        rows = (
            self.client.table("scan_usage").select("count")
            .eq("user_id", self.user_id).eq("day", day.isoformat()).limit(1).execute().data
        )
        return rows[0]["count"] if rows else 0

    def use_scan(self, limit: int) -> int | None:
        """One more scan for today, or None if the limit is reached (atomic, in SQL)."""
        return self.client.rpc("use_scan", {"p_limit": limit}).execute().data


def make_client(settings: Settings, token: str, http_client: httpx.Client | None = None) -> SyncPostgrestClient:
    return SyncPostgrestClient(
        settings.rest_url,
        headers={
            "apikey": settings.supabase_anon_key,
            "Authorization": f"Bearer {token}",
        },
        http_client=http_client or httpx.Client(timeout=10),
    )


def get_repo(
    user: CurrentUser = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> Iterator[Repo]:
    client = make_client(settings, user.token)
    try:
        yield Repo(client, user.id)
    finally:
        client.session.close()
