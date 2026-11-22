from types import SimpleNamespace

import pytest
from postgrest.exceptions import APIError

from backend.main import app
from backend.schemas import AnalysisResult
from backend.services import ai

RESULT = AnalysisResult(name="Dal", calories=300, protein=12, carbs=40, fat=8, fiber=6, emoji="🍛", tip="Add salad.")


class Messages:
    def __init__(self):
        self.calls = 0

    def parse(self, **_):
        self.calls += 1
        return SimpleNamespace(parsed_output=RESULT.model_copy(), stop_reason="end_turn")


@pytest.fixture
def fake_ai(client):
    m = Messages()
    app.dependency_overrides[ai.get_ai_client] = lambda: SimpleNamespace(messages=m)
    return m


def scan(client):
    return client.post("/api/v1/analyze", json={"description": "dal"})


def test_limit_blocks_after_n_scans(client, repo, settings, fake_ai):
    settings.daily_scan_limit = 2
    assert [scan(client).status_code for _ in range(3)] == [200, 200, 429]
    assert fake_ai.calls == 2  # the blocked request never reached Claude
    r = scan(client)
    assert r.status_code == 429 and "2 AI scans" in r.json()["detail"]
    assert int(r.headers["retry-after"]) > 0


def test_usage_endpoint(client, repo, settings, fake_ai):
    settings.daily_scan_limit = 3
    scan(client)
    body = client.get("/api/v1/usage").json()
    assert body["used"] == 1 and body["limit"] == 3 and body["remaining"] == 2
    assert body["resets_at"].startswith("20") and body["resets_at"].endswith(("Z", "+00:00"))


def test_zero_means_unlimited(client, repo, settings, fake_ai):
    settings.daily_scan_limit = 0
    assert all(scan(client).status_code == 200 for _ in range(5))
    assert repo.scans == 0
    body = client.get("/api/v1/usage").json()
    assert body["limit"] is None and body["remaining"] is None


def test_invalid_photo_does_not_use_a_scan(client, repo, settings, fake_ai):
    r = client.post("/api/v1/analyze", json={"image_base64": "not base64!!", "media_type": "image/png"})
    assert r.status_code == 422 and repo.scans == 0


def test_missing_migration_fails_open(client, repo, fake_ai):
    repo.scan_error = APIError({"code": "PGRST202", "message": "Could not find the function"})
    assert scan(client).status_code == 200
    assert client.get("/api/v1/usage").json()["used"] == 0


def test_other_database_errors_are_not_swallowed(client, repo, fake_ai):
    repo.scan_error = APIError({"code": "XX000", "message": "boom"})
    assert scan(client).status_code == 502
    assert fake_ai.calls == 0


def test_requires_login(anon_client):
    assert anon_client.post("/api/v1/analyze", json={"description": "x"}).status_code == 401
    assert anon_client.get("/api/v1/usage").status_code == 401
