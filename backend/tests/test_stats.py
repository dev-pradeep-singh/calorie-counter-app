from datetime import date

from backend.services.stats import summarize, week_totals


def test_summary_endpoint(client, repo):
    repo.profile = {"id": "x", "goal_calories": 1000}
    repo.add("2026-11-19", calories=600, protein=30)
    repo.add("2026-11-19", calories=600, protein=30)  # 1200: over goal
    repo.add("2026-11-18", calories=800, protein=40)
    repo.add("2026-11-16", calories=500, protein=10)  # gap on the 17th breaks the streak
    s = client.get("/api/v1/stats/summary?today=2026-11-19").json()
    assert s == {"total_meals": 4, "streak": 2, "avg_calories": 833, "avg_protein": 37, "days_on_track": 2}


def test_summary_empty(client):
    s = client.get("/api/v1/stats/summary?today=2026-11-19").json()
    assert s == {"total_meals": 0, "streak": 0, "avg_calories": 0, "avg_protein": 0, "days_on_track": 0}


def test_streak_zero_when_nothing_today():
    rows = [{"date": "2026-11-18", "calories": 100, "protein": 1}]
    assert summarize(rows, 2000, date(2026, 11, 19)).streak == 0


def test_streak_crosses_month_boundary():
    rows = [{"date": d, "calories": 100, "protein": 1} for d in ("2026-12-01", "2026-11-30", "2026-11-29")]
    assert summarize(rows, 2000, date(2026, 12, 1)).streak == 3


def test_week_endpoint(client, repo):
    repo.add("2026-11-19", calories=300)
    repo.add("2026-11-19", calories=200)
    repo.add("2026-11-13", calories=700)
    repo.add("2026-11-12", calories=999)  # outside the window
    days = client.get("/api/v1/stats/week?end=2026-11-19").json()["days"]
    assert [d["date"] for d in days][0] == "2026-11-13" and days[-1]["date"] == "2026-11-19"
    assert [d["calories"] for d in days] == [700, 0, 0, 0, 0, 0, 500]


def test_week_totals_handles_missing_values():
    assert [d.calories for d in week_totals([{"date": "2026-11-19", "calories": None}], date(2026, 11, 19))][-1] == 0
