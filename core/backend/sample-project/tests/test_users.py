"""Profile reads and renames — the behaviour that exists before DEEP-2041."""

from .conftest import PRIYA, TOM


def test_health(client):
    assert client.get("/health").json()["status"] == "ok"


def test_list_profiles(client):
    body = client.get("/api/v1/users").json()
    assert {u["id"] for u in body} == {PRIYA, TOM}


def test_read_one_profile(client):
    body = client.get(f"/api/v1/users/{PRIYA}").json()
    assert body["display_name"] == "Priya Raman"
    assert body["avatar_url"] is None
    assert body["initials"] == "PR"


def test_profile_falls_back_to_initials(client):
    """The state DEEP-2041 replaces: no avatar means initials."""
    body = client.get(f"/api/v1/users/{PRIYA}").json()
    assert body["avatar_url"] is None and body["initials"] == "PR"


def test_existing_avatar_is_returned(client):
    body = client.get(f"/api/v1/users/{TOM}").json()
    assert body["avatar_url"] == "/media/avatars/usr_3b70de.png"


def test_unknown_user_is_404(client):
    assert client.get("/api/v1/users/nope").status_code == 404


def test_rename_requires_sign_in(client):
    r = client.patch(f"/api/v1/users/{PRIYA}/display-name", json={"display_name": "P"})
    assert r.status_code == 401


def test_rename_own_profile(as_priya):
    r = as_priya.patch(f"/api/v1/users/{PRIYA}/display-name", json={"display_name": "Priya R"})
    assert r.status_code == 200
    assert r.json()["display_name"] == "Priya R"


def test_cannot_rename_someone_else(as_priya):
    r = as_priya.patch(f"/api/v1/users/{TOM}/display-name", json={"display_name": "Nope"})
    assert r.status_code == 403


def test_blank_display_name_is_rejected(as_priya):
    r = as_priya.patch(f"/api/v1/users/{PRIYA}/display-name", json={"display_name": "   "})
    assert r.status_code == 422
