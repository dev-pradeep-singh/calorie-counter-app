import base64
from types import SimpleNamespace

import anthropic
import httpx2
import pytest

from backend.schemas import AnalysisResult
from backend.services import ai

RESULT = AnalysisResult(name="Grilled chicken", calories=450, protein=32, carbs=45, fat=12, fiber=5, emoji="🍗", tip="Add greens.")


class FakeMessages:
    def __init__(self, result=RESULT, stop_reason="end_turn", error=None):
        self.result, self.stop_reason, self.error = result, stop_reason, error
        self.calls = []

    def parse(self, **kwargs):
        self.calls.append(kwargs)
        if self.error:
            raise self.error
        return SimpleNamespace(parsed_output=self.result, stop_reason=self.stop_reason)


@pytest.fixture
def fake_ai(client):
    from backend.main import app

    fake = SimpleNamespace(messages=FakeMessages())
    app.dependency_overrides[ai.get_ai_client] = lambda: fake
    return fake.messages


def test_description_builds_prompt_server_side(client, fake_ai):
    r = client.post("/api/v1/analyze", json={"description": "2 rotis and dal"})
    assert r.status_code == 200 and r.json()["name"] == "Grilled chicken"
    call = fake_ai.calls[0]
    assert call["model"] == "test-model" and call["output_format"] is AnalysisResult
    content = call["messages"][0]["content"]
    assert len(content) == 1 and "2 rotis and dal" in content[0]["text"]


def test_photo_with_hint(client, fake_ai):
    img = base64.b64encode(b"\xff\xd8fakejpeg").decode()
    r = client.post("/api/v1/analyze", json={"image_base64": img, "media_type": "image/jpeg", "photo_hint": "dal makhani"})
    assert r.status_code == 200
    content = fake_ai.calls[0]["messages"][0]["content"]
    assert content[0]["type"] == "image" and content[0]["source"]["data"] == img
    assert "dal makhani" in content[1]["text"]


@pytest.mark.parametrize(
    "body",
    [
        {},
        {"description": "   "},
        {"image_base64": "aGk="},  # no media_type
        {"image_base64": "aGk=", "media_type": "application/pdf"},
        {"messages": [{"role": "user", "content": "free prompt"}]},  # old proxy shape is not accepted
    ],
)
def test_invalid_bodies_rejected(client, fake_ai, body):
    assert client.post("/api/v1/analyze", json=body).status_code == 422
    assert fake_ai.calls == []


def test_bad_base64_and_oversized(client, fake_ai, monkeypatch):
    r = client.post("/api/v1/analyze", json={"image_base64": "not base64!!", "media_type": "image/png"})
    assert r.status_code == 422
    monkeypatch.setattr(ai, "MAX_IMAGE_B64_CHARS", 8)
    r = client.post("/api/v1/analyze", json={"image_base64": "aGVsbG8gd29ybGQ=", "media_type": "image/png"})
    assert r.status_code == 413
    assert fake_ai.calls == []


def test_negative_numbers_clamped(client, fake_ai):
    fake_ai.result = RESULT.model_copy(update={"fat": -3})
    assert client.post("/api/v1/analyze", json={"description": "water"}).json()["fat"] == 0


def test_refusal_and_missing_output(client, fake_ai):
    fake_ai.stop_reason = "refusal"
    assert client.post("/api/v1/analyze", json={"description": "x"}).status_code == 422
    fake_ai.stop_reason, fake_ai.result = "max_tokens", None
    assert client.post("/api/v1/analyze", json={"description": "x"}).status_code == 502


def test_upstream_error_maps_to_502(client, fake_ai):
    req = httpx2.Request("POST", "https://api.anthropic.com/v1/messages")
    fake_ai.error = anthropic.InternalServerError("boom", response=httpx2.Response(500, request=req), body=None)
    assert client.post("/api/v1/analyze", json={"description": "x"}).status_code == 502


def test_not_configured_is_503(client, settings):
    settings.anthropic_api_key = None
    assert client.post("/api/v1/analyze", json={"description": "x"}).status_code == 503
