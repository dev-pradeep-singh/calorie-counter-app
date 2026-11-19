import anthropic
from fastapi import APIRouter, Depends

from backend.auth import CurrentUser, get_current_user
from backend.config import Settings, get_settings
from backend.schemas import AnalysisResult, AnalyzeIn
from backend.services import ai

router = APIRouter(prefix="/analyze", tags=["analyze"])


@router.post("", response_model=AnalysisResult)
def analyze_food(
    body: AnalyzeIn,
    _user: CurrentUser = Depends(get_current_user),  # login required: the API key costs money
    client: anthropic.Anthropic = Depends(ai.get_ai_client),
    settings: Settings = Depends(get_settings),
):
    return ai.analyze(body, client, settings.anthropic_model)
