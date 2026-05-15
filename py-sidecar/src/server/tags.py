"""Zero-shot scene tagging via OpenCLIP.

Given a fixed prompt list, compute similarity between the image embedding
and each prompt's text embedding, then softmax to get a probability
distribution. Returns the top-K labels.

The prompt list is curated for the photo-album use case: indoor/outdoor,
season hints, scene categories, and a few common photographic genres.
Phase 2c can expand or fine-tune.
"""
import numpy as np

from server.embed import embed_image, embed_texts


# Each entry maps a short tag name → a descriptive prompt for OpenCLIP.
# OpenCLIP performs best with full natural-language prompts.
TAG_PROMPTS: dict[str, str] = {
    "indoor": "a photo taken indoors",
    "outdoor": "a photo taken outdoors",
    "portrait": "a portrait photograph of a person",
    "group_portrait": "a group photo of several people",
    "landscape": "a wide landscape photograph",
    "food": "a photograph of food on a plate",
    "celebration": "a photo of a birthday or celebration",
    "beach": "a photo at a beach with sand and water",
    "snow": "a photo with snow",
    "forest": "a photo in a forest",
    "city": "a photo of a city street",
    "child": "a photo of a child",
    "pet": "a photo of a pet animal",
    "document": "a photograph of a document or screenshot of text",
    "screenshot": "a screenshot of a computer or phone screen",
}

# Precompute text embeddings on first use.
_text_embeddings: np.ndarray | None = None
_tags: list[str] | None = None


def _ensure_text_embeddings() -> tuple[np.ndarray, list[str]]:
    global _text_embeddings, _tags
    if _text_embeddings is None or _tags is None:
        tags = list(TAG_PROMPTS.keys())
        prompts = [TAG_PROMPTS[t] for t in tags]
        _text_embeddings = embed_texts(prompts)
        _tags = tags
    return _text_embeddings, _tags


def score_tags(path: str, top_k: int = 5) -> list[dict[str, float]]:
    """Score the image against all tag prompts; return top_k by softmax score."""
    raw, _ = embed_image(path)
    img_vec = np.frombuffer(raw, dtype=np.float32)
    text_vecs, tag_names = _ensure_text_embeddings()
    # Cosine similarity (both already L2-normalized).
    sims = text_vecs @ img_vec
    # Temperature-scaled softmax. Temperature ~100 is OpenCLIP's calibration.
    scaled = sims * 100.0
    probs = np.exp(scaled - scaled.max())
    probs /= probs.sum()
    order = np.argsort(-probs)[:top_k]
    return [{"tag": tag_names[i], "score": float(probs[i])} for i in order]
