from datetime import date, datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status

from backend.db import Repo, get_repo
from backend.schemas import Meal, MealIn, PastMeal, round_half_up

router = APIRouter(prefix="/meals", tags=["meals"])


@router.get("", response_model=list[Meal])
def list_meals(date: date = Query(..., description="Client's local date, YYYY-MM-DD"), repo: Repo = Depends(get_repo)):
    return repo.list_meals(date)


@router.post("", response_model=Meal, status_code=status.HTTP_201_CREATED)
def add_meal(body: MealIn, repo: Repo = Depends(get_repo)):
    row = {
        "date": body.date.isoformat(),
        "name": body.name.strip(),
        "calories": round_half_up(body.calories),
        "protein": round_half_up(body.protein),
        "carbs": round_half_up(body.carbs),
        "fat": round_half_up(body.fat),
        "fiber": round_half_up(body.fiber),
        "emoji": body.emoji,
        "logged_at": datetime.now(timezone.utc).isoformat(),
    }
    return repo.insert_meal(row)


@router.delete("/{meal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_meal(meal_id: UUID, repo: Repo = Depends(get_repo)):
    if not repo.delete_meal(str(meal_id)):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Meal not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/history", response_model=list[PastMeal])
def meal_history(q: str | None = Query(default=None, max_length=100), repo: Repo = Depends(get_repo)):
    """Past meals, newest first, one per name (case-insensitive), optionally filtered by `q`."""
    needle = (q or "").strip().lower()
    seen: set[str] = set()
    out = []
    for m in repo.meal_history():
        name = (m.get("name") or "").strip()
        key = name.lower()
        if not key or key in seen:
            continue
        seen.add(key)
        if needle and needle not in key:
            continue
        out.append(m)
    return out
