import pytest
from fastapi.testclient import TestClient

import api.nutrition as nutrition_api
from api.user import get_current_user
from main import app


@pytest.fixture
def client(monkeypatch):
    async def fake_stock(uid: str):
        return {
            "p1": {"name": "Elma", "quantity": 2},
            "p2": {"name": "Sut", "quantity": 1.5},
        }

    monkeypatch.setattr(nutrition_api, "get_stock_items", fake_stock)

    async def fake_user():
        return {"uid": "test-user", "email": "u@test.com", "name": "Test"}

    app.dependency_overrides[get_current_user] = fake_user
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_nutrition_stock_overview(client):
    r = client.get("/api/nutrition/stock-overview")
    assert r.status_code == 200
    data = r.json()
    assert data["total_product_kinds"] == 2
    assert data["total_units"] == pytest.approx(3.5)
    assert "Elma" in data["item_names"]
    assert "Sut" in data["item_names"]
