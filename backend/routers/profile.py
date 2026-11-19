from fastapi import APIRouter, Depends, HTTPException, status

from backend.db import Repo, get_repo
from backend.schemas import Profile, ProfileIn

router = APIRouter(prefix="/profile", tags=["profile"])

# Only the profile screen sends these; setup leaves them out and they must stay as they are.
OPTIONAL_GOALS = {"goal_protein", "goal_carbs", "goal_fat", "goal_fiber"}


@router.get("", response_model=Profile)
def get_profile(repo: Repo = Depends(get_repo)):
    profile = repo.get_profile()
    if profile is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Profile not found")
    return profile


@router.put("", response_model=Profile)
def put_profile(body: ProfileIn, repo: Repo = Depends(get_repo)):
    fields = body.model_dump()
    for key in OPTIONAL_GOALS - body.model_fields_set:
        fields.pop(key)
    return repo.upsert_profile(fields)  # the id comes from the token, never the body
