"""FastAPI app builder. Routes registered here so tests can import buildServer-equivalent via app fixture."""
from fastapi import FastAPI


def build_app() -> FastAPI:
    app = FastAPI(title="slop-family-album-py-sidecar")

    @app.get("/health")
    async def health() -> dict[str, bool]:
        return {"ok": True}

    return app
