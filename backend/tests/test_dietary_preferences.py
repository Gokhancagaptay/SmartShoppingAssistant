"""Diyet tercihleri: RTDB ve JWT mock ile hızlı API testleri."""

import pytest
from fastapi.testclient import TestClient

import api.user as user_api
from main import app


@pytest.fixture
def dietary_client(monkeypatch):
    storage: dict = {}

    class FakeRef:
        def __init__(self, path: str):
            self._path = path

        def get(self):
            return storage.get(self._path)

        def set(self, data):
            storage[self._path] = data

    def fake_reference(path: str):
        return FakeRef(path)

    monkeypatch.setattr(user_api.db, "reference", fake_reference)

    def verify_ok(token: str):
        return {"uid": "user-1", "email": "a@b.com"}

    monkeypatch.setattr(user_api.auth, "verify_id_token", verify_ok)

    yield TestClient(app), storage


def test_get_dietary_empty(dietary_client):
    client, _ = dietary_client
    r = client.get(
        "/api/auth/users/user-1/dietary-preferences",
        headers={"Authorization": "Bearer fake"},
    )
    assert r.status_code == 200
    assert r.json() == {"tags": [], "custom_note": ""}


def test_get_dietary_normalizes_rtdb_dict_tags(dietary_client):
    client, storage = dietary_client
    storage["users/user-1/dietary_preferences"] = {
        "tags": {"0": "vegan", "1": "glutensiz"},
        "custom_note": "Not",
    }
    r = client.get(
        "/api/auth/users/user-1/dietary-preferences",
        headers={"Authorization": "Bearer fake"},
    )
    assert r.status_code == 200
    body = r.json()
    assert set(body["tags"]) == {"vegan", "glutensiz"}
    assert body["custom_note"] == "Not"


def test_put_dietary_then_get(dietary_client):
    client, storage = dietary_client
    r = client.put(
        "/api/auth/users/user-1/dietary-preferences",
        headers={"Authorization": "Bearer fake"},
        json={"tags": ["vejetaryen"], "custom_note": "Şeker yok"},
    )
    assert r.status_code == 200
    assert r.json() == {"success": True}
    assert storage["users/user-1/dietary_preferences"]["tags"] == ["vejetaryen"]
    r2 = client.get(
        "/api/auth/users/user-1/dietary-preferences",
        headers={"Authorization": "Bearer fake"},
    )
    assert r2.status_code == 200
    assert r2.json()["tags"] == ["vejetaryen"]


def test_get_dietary_invalid_token_401(dietary_client, monkeypatch):
    client, _ = dietary_client

    def bad_verify(_token: str):
        raise ValueError("invalid")

    monkeypatch.setattr(user_api.auth, "verify_id_token", bad_verify)
    r = client.get(
        "/api/auth/users/user-1/dietary-preferences",
        headers={"Authorization": "Bearer bad"},
    )
    assert r.status_code == 401


def test_get_dietary_wrong_uid_403(dietary_client):
    client, _ = dietary_client
    r = client.get(
        "/api/auth/users/other-user/dietary-preferences",
        headers={"Authorization": "Bearer fake"},
    )
    assert r.status_code == 403
