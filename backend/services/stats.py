"""Stats math, kept free of I/O so it is easy to test."""

from collections import defaultdict
from datetime import date, timedelta

from backend.schemas import DayTotal, StatsSummary


def summarize(rows: list[dict], goal_calories: int, today: date) -> StatsSummary:
    """rows: meal_logs rows with `date`, `calories`, `protein`."""
    if not rows:
        return StatsSummary(total_meals=0, streak=0, avg_calories=0, avg_protein=0, days_on_track=0)

    cal_by_day: dict[str, float] = defaultdict(float)
    prot_by_day: dict[str, float] = defaultdict(float)
    for r in rows:
        cal_by_day[r["date"]] += r.get("calories") or 0
        prot_by_day[r["date"]] += r.get("protein") or 0

    days = len(cal_by_day)
    streak = 0
    check = today
    while check.isoformat() in cal_by_day:
        streak += 1
        check -= timedelta(days=1)

    return StatsSummary(
        total_meals=len(rows),
        streak=streak,
        avg_calories=round(sum(cal_by_day.values()) / days),
        avg_protein=round(sum(prot_by_day.values()) / days),
        days_on_track=sum(1 for c in cal_by_day.values() if c <= goal_calories),
    )


def week_totals(rows: list[dict], end: date) -> list[DayTotal]:
    """Seven daily calorie totals ending on `end` (inclusive), oldest first."""
    by_day: dict[str, float] = defaultdict(float)
    for r in rows:
        by_day[r["date"]] += r.get("calories") or 0
    dates = [end - timedelta(days=i) for i in range(6, -1, -1)]
    return [DayTotal(date=d, calories=round(by_day.get(d.isoformat(), 0))) for d in dates]
