from fastapi.testclient import TestClient

from app.main import app


def test_health() -> None:
    response = TestClient(app).get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_cors_preflight_allows_expo_web_only() -> None:
    client = TestClient(app)
    headers = {
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "authorization",
    }
    ok = client.options(
        "/v1/spaces/x/invites", headers={"Origin": "http://localhost:8081", **headers}
    )
    assert ok.status_code == 200
    assert ok.headers["access-control-allow-origin"] == "http://localhost:8081"
    bad = client.options(
        "/v1/spaces/x/invites", headers={"Origin": "https://evil.example", **headers}
    )
    assert "access-control-allow-origin" not in bad.headers
