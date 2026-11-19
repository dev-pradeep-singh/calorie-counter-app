"""Checks the PostgREST requests Repo sends, using a mock HTTP transport."""

import json
from datetime import date
from urllib.parse import parse_qs, urlsplit

import httpx
import pytest

from backend import db
from backend.tests.conftest import USER_ID


class Recorder:
    def __init__(self, responder):
        self.requests: list[httpx.Request] = []
        self.responder = responder

    def __call__(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(request)
        return self.responder(request)


def make_repo(settings, responder):
    rec = Recorder(responder)
    http = httpx.Client(transport=httpx.MockTransport(rec), headers={"Accept": "application/json", "Content-Type": "application/json"})
    client = db.make_client(settings, "user-token", http_client=http)
    return db.Repo(client, USER_ID), rec


def q(request):
    return parse_qs(urlsplit(str(request.url)).query)


def test_requests_carry_user_token_and_anon_key(settings):
    repo, rec = make_repo(settings, lambda r: httpx.Response(200, json=[]))
    assert repo.get_profile() is None
    req = rec.requests[0]
    assert req.url.path == "/rest/v1/profiles"
    assert req.headers["authorization"] == "Bearer user-token"
    assert req.headers["apikey"] == "anon"
    assert q(req)["id"] == [f"eq.{USER_ID}"]


def test_list_meals_filters_user_and_date(settings):
    repo, rec = make_repo(settings, lambda r: httpx.Response(200, json=[{"id": "1"}]))
    assert repo.list_meals(date(2026, 11, 19)) == [{"id": "1"}]
    params = q(rec.requests[0])
    assert params["user_id"] == [f"eq.{USER_ID}"] and params["date"] == ["eq.2026-11-19"]
    assert params["order"] == ["logged_at.desc"]


def test_upsert_sets_id_from_token(settings):
    repo, rec = make_repo(settings, lambda r: httpx.Response(201, json=[json.loads(r.content)]))
    out = repo.upsert_profile({"name": "Sam"})
    req = rec.requests[0]
    assert req.method == "POST" and "resolution=merge-duplicates" in req.headers["prefer"]
    assert out == {"name": "Sam", "id": USER_ID}


def test_delete_scoped_to_user(settings):
    repo, rec = make_repo(settings, lambda r: httpx.Response(200, json=[]))
    assert repo.delete_meal("abc") is False
    req = rec.requests[0]
    assert req.method == "DELETE" and q(req)["id"] == ["eq.abc"] and q(req)["user_id"] == [f"eq.{USER_ID}"]


def test_daily_rows_pages_past_row_cap(settings, monkeypatch):
    monkeypatch.setattr(db, "PAGE_SIZE", 2)

    def responder(request):
        start = int(q(request)["offset"][0])
        rows = [{"date": "2026-11-19", "calories": 1, "protein": 1}] * (2 if start < 4 else 1)
        return httpx.Response(200, json=rows)

    repo, rec = make_repo(settings, responder)
    rows = repo.daily_rows(start=date(2026, 11, 13), end=date(2026, 11, 19))
    assert len(rows) == 5 and len(rec.requests) == 3
    assert [(q(r)["offset"], q(r)["limit"]) for r in rec.requests] == [(["0"], ["2"]), (["2"], ["2"]), (["4"], ["2"])]
    assert q(rec.requests[0])["date"] == ["gte.2026-11-13", "lte.2026-11-19"]


@pytest.mark.parametrize("code, status", [("PGRST301", 401), ("42501", 502)])
def test_postgrest_errors_mapped(client, repo, code, status):
    from postgrest.exceptions import APIError

    def boom(*_):
        raise APIError({"code": code, "message": "nope", "details": None, "hint": None})

    repo.get_profile = boom
    assert client.get("/api/v1/profile").status_code == status
