import uuid
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

from backend.auth import CurrentUser, get_current_user
from backend.config import Settings, get_settings
from backend.db import get_repo
from backend.main import app

USER_ID = "11111111-1111-1111-1111-111111111111"
SUPABASE_URL = "https://example.supabase.co"


class FakeRepo:
    """In-memory stand-in for backend.db.Repo."""

    def __init__(self):
        self.profile: dict | None = None
        self.meals: list[dict] = []

    def get_profile(self):
        return self.profile

    def upsert_profile(self, fields):
        self.profile = {**(self.profile or {}), **fields, "id": USER_ID}
        return self.profile

    def list_meals(self, day):
        rows = [m for m in self.meals if m["date"] == day.isoformat()]
        return sorted(rows, key=lambda m: m["logged_at"], reverse=True)

    def insert_meal(self, row):
        meal = {"id": str(uuid.uuid4()), **row}
        self.meals.append(meal)
        return meal

    def delete_meal(self, meal_id):
        before = len(self.meals)
        self.meals = [m for m in self.meals if m["id"] != meal_id]
        return len(self.meals) < before

    def meal_history(self):
        return sorted(self.meals, key=lambda m: m["logged_at"], reverse=True)

    def daily_rows(self, start=None, end=None):
        return [
            m for m in self.meals
            if (start is None or m["date"] >= start.isoformat()) and (end is None or m["date"] <= end.isoformat())
        ]

    def add(self, date, calories=500, protein=20, name="Meal", logged_at=None, **extra):
        return self.insert_meal({
            "date": date, "name": name, "calories": calories, "protein": protein,
            "carbs": extra.get("carbs", 50), "fat": extra.get("fat", 10), "fiber": extra.get("fiber", 3),
            "emoji": extra.get("emoji", "🍽️"),
            "logged_at": logged_at or datetime.now(timezone.utc).isoformat(),
        })


@pytest.fixture
def settings():
    return Settings(
        _env_file=None,
        supabase_url=SUPABASE_URL,
        supabase_anon_key="anon",
        anthropic_api_key="test-key",
        anthropic_model="test-model",
    )


@pytest.fixture
def repo():
    return FakeRepo()


@pytest.fixture
def client(repo, settings):
    app.dependency_overrides[get_settings] = lambda: settings
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(id=USER_ID, token="t")
    app.dependency_overrides[get_repo] = lambda: repo
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def anon_client(settings):
    """No auth override: requests go through real token verification."""
    app.dependency_overrides[get_settings] = lambda: settings
    yield TestClient(app)
    app.dependency_overrides.clear()
