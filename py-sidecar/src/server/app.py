"""FastAPI app builder. Routes registered here so tests can import buildServer-equivalent via app fixture."""
import base64

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from server.blur import laplacian_variance
from server.embed import embed_image, model_key
from server.faces import detect_faces
from server.phash import perceptual_hash
from server.tags import score_tags


class BlurRequest(BaseModel):
    path: str


class PhashRequest(BaseModel):
    path: str


class FacesRequest(BaseModel):
    path: str
    with_embeddings: bool = False


class EmbedRequest(BaseModel):
    path: str


class TagsRequest(BaseModel):
    path: str
    top_k: int = 5


def build_app() -> FastAPI:
    app = FastAPI(title="slop-family-album-py-sidecar")

    # Allow the Tauri renderer (origin http://localhost:1420 in dev,
    # tauri:// in prod) to call us. Safe because we bind to 127.0.0.1
    # only — nothing external can reach us regardless of origin.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health")
    async def health() -> dict[str, bool]:
        return {"ok": True}

    @app.post("/blur")
    async def blur(req: BlurRequest) -> dict[str, float]:
        try:
            return {"blur": laplacian_variance(req.path)}
        except FileNotFoundError as e:
            raise HTTPException(status_code=404, detail=str(e))
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

    @app.post("/phash")
    async def phash(req: PhashRequest) -> dict[str, str]:
        try:
            return {"phash": perceptual_hash(req.path)}
        except FileNotFoundError as e:
            raise HTTPException(status_code=404, detail=str(e))

    @app.post("/faces")
    async def faces(req: FacesRequest) -> dict[str, object]:
        try:
            entries = detect_faces(req.path, with_embeddings=req.with_embeddings)
            return {"count": len(entries), "faces": entries}
        except FileNotFoundError as e:
            raise HTTPException(status_code=404, detail=str(e))
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

    @app.post("/embed")
    async def embed(req: EmbedRequest) -> dict[str, str]:
        try:
            raw, mk = embed_image(req.path)
            return {
                "model": mk,
                "vector_b64": base64.b64encode(raw).decode("ascii"),
            }
        except FileNotFoundError as e:
            raise HTTPException(status_code=404, detail=str(e))

    @app.post("/tags")
    async def tags(req: TagsRequest) -> dict[str, list[dict[str, float]]]:
        try:
            return {"tags": score_tags(req.path, top_k=req.top_k)}
        except FileNotFoundError as e:
            raise HTTPException(status_code=404, detail=str(e))

    return app
