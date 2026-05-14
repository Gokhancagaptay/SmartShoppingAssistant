"""Mongo veya dış servis gerektirmeyen uç nokta duman testleri."""

from fastapi.testclient import TestClient

from main import app


def test_root_message():
    client = TestClient(app)
    r = client.get("/")
    assert r.status_code == 200
    assert "message" in r.json()


def test_routes_list_contains_products():
    client = TestClient(app)
    r = client.get("/routes")
    assert r.status_code == 200
    paths = {item["path"] for item in r.json()["routes"]}
    assert any("/api/products" in p for p in paths)
