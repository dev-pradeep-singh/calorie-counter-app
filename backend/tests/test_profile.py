from backend.tests.conftest import USER_ID


def test_missing_profile_is_404(client):
    assert client.get("/api/v1/profile").status_code == 404


def test_setup_then_profile_save_keeps_and_updates_goals(client, repo):
    setup = {"name": " Sam ", "goal_calories": 1800, "age": 30, "height_cm": 170, "weight_kg": 70.5,
             "target_weight_kg": 65, "sex": "female", "goal_type": "lose"}
    r = client.put("/api/v1/profile", json=setup)
    assert r.status_code == 200
    assert r.json()["name"] == "Sam" and r.json()["id"] == USER_ID
    assert "goal_protein" not in repo.profile  # setup must not null out macro goals

    repo.profile["goal_protein"] = 120
    client.put("/api/v1/profile", json=setup)
    assert repo.profile["goal_protein"] == 120

    r = client.put("/api/v1/profile", json={**setup, "goal_protein": 140, "goal_fiber": None})
    assert r.json()["goal_protein"] == 140 and r.json()["goal_fiber"] is None
    assert client.get("/api/v1/profile").json()["goal_calories"] == 1800


def test_user_id_in_body_is_rejected(client):
    r = client.put("/api/v1/profile", json={"id": "someone-else", "name": "x"})
    assert r.status_code == 422


def test_bad_goal_type_rejected(client):
    assert client.put("/api/v1/profile", json={"goal_type": "bulk"}).status_code == 422
