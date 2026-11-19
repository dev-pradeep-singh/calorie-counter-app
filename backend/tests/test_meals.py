import uuid


def test_add_rounds_and_returns_id(client, repo):
    r = client.post("/api/v1/meals", json={
        "name": "Paneer tikka", "calories": 451.6, "protein": 31.4, "carbs": 10.5, "fat": 30.49,
        "fiber": 2.6, "emoji": "🧀", "date": "2026-11-19",
    })
    assert r.status_code == 201
    body = r.json()
    assert body["id"] and (body["calories"], body["protein"], body["carbs"], body["fat"], body["fiber"]) == (452, 31, 11, 30, 3)  # halves round up, like Math.round
    assert repo.meals[0]["calories"] == 452 and isinstance(repo.meals[0]["calories"], int)


def test_fiber_optional_and_negative_rejected(client):
    base = {"name": "x", "calories": 1, "protein": 1, "carbs": 1, "fat": 1, "date": "2026-11-19"}
    assert client.post("/api/v1/meals", json=base).json()["fiber"] == 0
    assert client.post("/api/v1/meals", json={**base, "calories": -5}).status_code == 422
    assert client.post("/api/v1/meals", json={**base, "user_id": "x"}).status_code == 422


def test_list_by_local_date_newest_first(client, repo):
    repo.add("2026-11-19", name="Lunch", logged_at="2026-11-19T12:00:00+00:00")
    repo.add("2026-11-19", name="Dinner", logged_at="2026-11-19T19:00:00+00:00")
    repo.add("2026-11-18", name="Yesterday")
    names = [m["name"] for m in client.get("/api/v1/meals?date=2026-11-19").json()]
    assert names == ["Dinner", "Lunch"]
    assert client.get("/api/v1/meals").status_code == 422


def test_delete_by_id(client, repo):
    meal = repo.add("2026-11-19")
    assert client.delete(f"/api/v1/meals/{meal['id']}").status_code == 204
    assert repo.meals == []
    assert client.delete(f"/api/v1/meals/{uuid.uuid4()}").status_code == 404
    assert client.delete("/api/v1/meals/not-a-uuid").status_code == 422


def test_history_dedupes_and_filters(client, repo):
    repo.add("2026-11-17", name="Dal Makhani", calories=400, logged_at="2026-11-17T12:00:00+00:00")
    repo.add("2026-11-19", name="dal makhani ", calories=450, logged_at="2026-11-19T12:00:00+00:00")
    repo.add("2026-11-18", name="Oats", logged_at="2026-11-18T08:00:00+00:00")
    hist = client.get("/api/v1/meals/history").json()
    assert [h["name"] for h in hist] == ["dal makhani ", "Oats"]
    assert hist[0]["calories"] == 450  # most recent entry wins
    assert [h["name"] for h in client.get("/api/v1/meals/history?q=OAT").json()] == ["Oats"]
