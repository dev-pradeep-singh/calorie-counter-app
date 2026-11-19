from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

Sex = Literal["male", "female"]
GoalType = Literal["lose", "maintain", "gain"]
ImageType = Literal["image/jpeg", "image/png", "image/webp", "image/gif"]

# Vercel caps request bodies at ~4.5 MB; leave room for the JSON around the image.
MAX_IMAGE_B64_CHARS = 4_000_000


# ── Profile ─────────────────────────────────────────────────────────────────
class ProfileIn(BaseModel):
    """Body of PUT /profile. Fields left out are not changed (setup sends no macro goals)."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(default="Friend", min_length=1, max_length=80)
    goal_calories: int = Field(default=2000, ge=500, le=10000)
    age: int | None = Field(default=None, ge=1, le=120)
    height_cm: int | None = Field(default=None, ge=50, le=275)
    weight_kg: float | None = Field(default=None, gt=0, le=500)
    target_weight_kg: float | None = Field(default=None, gt=0, le=500)
    sex: Sex = "male"
    goal_type: GoalType = "maintain"
    goal_protein: int | None = Field(default=None, ge=0, le=1000)
    goal_carbs: int | None = Field(default=None, ge=0, le=2000)
    goal_fat: int | None = Field(default=None, ge=0, le=1000)
    goal_fiber: int | None = Field(default=None, ge=0, le=500)

    @field_validator("name")
    @classmethod
    def strip_name(cls, v: str) -> str:
        return v.strip() or "Friend"


class Profile(BaseModel):
    """A stored profile. Lenient on purpose: it mirrors whatever is in the table."""

    id: str
    name: str | None = None
    goal_calories: int | None = None
    age: int | None = None
    height_cm: int | None = None
    weight_kg: float | None = None
    target_weight_kg: float | None = None
    sex: str | None = None
    goal_type: str | None = None
    goal_protein: int | None = None
    goal_carbs: int | None = None
    goal_fat: int | None = None
    goal_fiber: int | None = None


# ── Meals ───────────────────────────────────────────────────────────────────
class Macros(BaseModel):
    calories: float = Field(ge=0, le=20000)
    protein: float = Field(ge=0, le=2000)
    carbs: float = Field(ge=0, le=2000)
    fat: float = Field(ge=0, le=2000)
    fiber: float = Field(default=0, ge=0, le=500)


class MealIn(Macros):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=200)
    emoji: str | None = Field(default=None, max_length=16)
    date: date  # the client's local date: "today" depends on the user's time zone


class Meal(BaseModel):
    id: str
    date: date
    name: str | None = None
    calories: int = 0
    protein: int = 0
    carbs: int = 0
    fat: int = 0
    fiber: int = 0
    emoji: str | None = None
    logged_at: datetime

    @field_validator("calories", "protein", "carbs", "fat", "fiber", mode="before")
    @classmethod
    def round_nulls(cls, v):
        return round(v or 0)


class PastMeal(BaseModel):
    name: str
    calories: int = 0
    protein: int = 0
    carbs: int = 0
    fat: int = 0
    fiber: int = 0
    emoji: str | None = None

    @field_validator("calories", "protein", "carbs", "fat", "fiber", mode="before")
    @classmethod
    def round_nulls(cls, v):
        return round(v or 0)


# ── Analyze ─────────────────────────────────────────────────────────────────
class AnalyzeIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    description: str | None = Field(default=None, max_length=1000)
    photo_hint: str | None = Field(default=None, max_length=200)
    image_base64: str | None = None
    media_type: ImageType | None = None

    @model_validator(mode="after")
    def check_inputs(self):
        self.description = (self.description or "").strip() or None
        self.photo_hint = (self.photo_hint or "").strip() or None
        if not self.description and not self.image_base64:
            raise ValueError("Send a description or a photo")
        if self.image_base64 and not self.media_type:
            raise ValueError("media_type is required with image_base64")
        return self


class AnalysisResult(BaseModel):
    """What Claude must return; also the response body of POST /analyze."""

    name: str
    calories: int
    protein: int
    carbs: int
    fat: int
    fiber: int
    emoji: str
    tip: str


# ── Stats ───────────────────────────────────────────────────────────────────
class StatsSummary(BaseModel):
    total_meals: int
    streak: int
    avg_calories: int
    avg_protein: int
    days_on_track: int


class DayTotal(BaseModel):
    date: date
    calories: int


class WeekStats(BaseModel):
    days: list[DayTotal]
