from fastapi import APIRouter, Depends

from backend.config import Settings, get_settings
from backend.db import Repo, get_repo
from backend.schemas import ScanUsage
from backend.services import usage

router = APIRouter(prefix="/usage", tags=["usage"])


@router.get("", response_model=ScanUsage)
def get_usage(repo: Repo = Depends(get_repo), settings: Settings = Depends(get_settings)):
    """Today's AI scans (UTC day). limit and remaining are null when there is no limit."""
    return usage.current(repo, settings.daily_scan_limit)
