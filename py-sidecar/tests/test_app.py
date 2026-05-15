from fastapi.testclient import TestClient

from server.app import build_app


def test_health() -> None:
    app = build_app()
    client = TestClient(app)
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"ok": True}
