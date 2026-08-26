import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.repositories.user_repository import user_repository
from app.services.storage import storage

PRIYA = "usr_8fa21c"
TOM = "usr_3b70de"


@pytest.fixture(autouse=True)
def clean_state(tmp_path, monkeypatch):
    """Each test starts from the seeded users and an empty media root."""
    monkeypatch.setattr(storage, "root", tmp_path / "media")
    storage.root.mkdir(parents=True, exist_ok=True)
    user_repository.__init__()
    yield


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def as_priya(client):
    client.headers.update({"X-User-Id": PRIYA})
    return client
