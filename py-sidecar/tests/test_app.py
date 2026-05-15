from pathlib import Path

from fastapi.testclient import TestClient

from server.app import build_app


def test_health() -> None:
    app = build_app()
    client = TestClient(app)
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"ok": True}


FIX = Path(__file__).parent.parent / "fixtures"


def test_blur_endpoint_returns_score() -> None:
    app = build_app()
    client = TestClient(app)
    r = client.post("/blur", json={"path": str(FIX / "sharp.jpg")})
    assert r.status_code == 200
    assert r.json()["blur"] > 0


def test_blur_endpoint_404_on_missing() -> None:
    app = build_app()
    client = TestClient(app)
    r = client.post("/blur", json={"path": "/nonexistent/file.jpg"})
    assert r.status_code == 404
