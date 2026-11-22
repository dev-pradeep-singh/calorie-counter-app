"""Food analysis with Claude. The prompt is built here, never in the browser."""

import base64
import binascii
import logging
from functools import lru_cache

import anthropic
from fastapi import Depends, HTTPException, status

from backend.config import Settings, get_settings
from backend.schemas import MAX_IMAGE_B64_CHARS, AnalysisResult, AnalyzeIn

log = logging.getLogger(__name__)

SYSTEM = (
    "You are a nutrition assistant inside a calorie-tracking app. Estimate calories and "
    "macronutrients (grams of protein, carbs, fat and fiber) for one typical serving of the "
    "meal described or shown, as whole numbers. Pick one fitting food emoji. The tip is one "
    "or two short sentences on making the meal healthier or what would complement it well."
)


@lru_cache
def _client(api_key: str) -> anthropic.Anthropic:
    return anthropic.Anthropic(api_key=api_key, timeout=45.0, max_retries=1)


def get_ai_client(settings: Settings = Depends(get_settings)) -> anthropic.Anthropic:
    if not settings.anthropic_api_key:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "AI analysis is not configured")
    return _client(settings.anthropic_api_key)


def build_prompt(req: AnalyzeIn) -> str:
    if req.description:
        prompt = f"Analyze this food: <meal>{req.description}</meal>"
        if req.image_base64:
            prompt += " A photo of it is attached."
        return prompt
    prompt = "Analyze the food in the attached photo."
    if req.photo_hint:
        prompt += f" The user says it is: <hint>{req.photo_hint}</hint>. Use this as a strong hint when identifying the dish."
    return prompt


def build_content(req: AnalyzeIn) -> list[dict]:
    content: list[dict] = []
    if req.image_base64:
        if len(req.image_base64) > MAX_IMAGE_B64_CHARS:
            raise HTTPException(status.HTTP_413_CONTENT_TOO_LARGE, "Photo is too large")
        try:
            base64.b64decode(req.image_base64, validate=True)
        except (binascii.Error, ValueError):
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "image_base64 is not valid base64")
        content.append(
            {"type": "image", "source": {"type": "base64", "media_type": req.media_type, "data": req.image_base64}}
        )
    content.append({"type": "text", "text": build_prompt(req)})
    return content


def analyze(req: AnalyzeIn, client: anthropic.Anthropic, model: str) -> AnalysisResult:
    return analyze_content(build_content(req), client, model)


def analyze_content(content: list[dict], client: anthropic.Anthropic, model: str) -> AnalysisResult:
    try:
        response = client.messages.parse(
            model=model,
            max_tokens=4000,
            system=SYSTEM,
            output_config={"effort": "low"},
            output_format=AnalysisResult,
            messages=[{"role": "user", "content": content}],
        )
    except anthropic.BadRequestError as e:
        log.warning("Anthropic rejected request: %s", e.message)
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Could not analyze that input")
    except anthropic.RateLimitError:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "AI is busy, try again shortly")
    except (anthropic.APIStatusError, anthropic.APIConnectionError) as e:
        log.error("Anthropic call failed: %r", e)
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Analysis failed, try again")

    if response.stop_reason == "refusal":
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Could not analyze that input")
    result = response.parsed_output
    if result is None:
        log.error("No parsed output (stop_reason=%s)", response.stop_reason)
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Analysis failed, try again")
    # Guard against negative numbers; the schema can't express minimums for the model.
    for f in ("calories", "protein", "carbs", "fat", "fiber"):
        setattr(result, f, max(0, getattr(result, f)))
    return result
