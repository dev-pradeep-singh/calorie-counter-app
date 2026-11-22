import anthropic
from fastapi import APIRouter, Depends

from backend.config import Settings, get_settings
from backend.db import Repo, get_repo
from backend.schemas import AnalysisResult, AnalyzeIn
from backend.services import ai, usage

router = APIRouter(prefix="/analyze", tags=["analyze"])


@router.post("", response_model=AnalysisResult, responses={429: {"description": "Daily AI scan limit reached"}})
def analyze_food(
    body: AnalyzeIn,
    repo: Repo = Depends(get_repo),  # login required: the API key costs money
    client: anthropic.Anthropic = Depends(ai.get_ai_client),
    settings: Settings = Depends(get_settings),
):
    content = ai.build_content(body)  # reject bad photos before they use up a scan
    usage.consume(repo, settings.daily_scan_limit)
    return ai.analyze_content(content, client, settings.anthropic_model)
