from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query

from backend.db import Repo, get_repo
from backend.schemas import StatsSummary, WeekStats
from backend.services import stats

router = APIRouter(prefix="/stats", tags=["stats"])

DEFAULT_GOAL = 2000


@router.get("/summary", response_model=StatsSummary)
def summary(today: date = Query(..., description="Client's local date"), repo: Repo = Depends(get_repo)):
    profile = repo.get_profile() or {}
    goal = profile.get("goal_calories") or DEFAULT_GOAL
    return stats.summarize(repo.daily_rows(), goal, today)


@router.get("/week", response_model=WeekStats)
def week(end: date = Query(..., description="Client's local date for the last bar"), repo: Repo = Depends(get_repo)):
    rows = repo.daily_rows(start=end - timedelta(days=6), end=end)
    return WeekStats(days=stats.week_totals(rows, end))
