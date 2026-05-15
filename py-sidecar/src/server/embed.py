"""Whole-image embeddings via OpenCLIP ViT-B/32.

Embeddings are 512-dim float32. The model is loaded lazily once per
process and reused across requests. Weights are cached by open_clip
under `~/.cache/torch/hub/checkpoints/` (~150 MB).
"""
import io
import threading
from typing import Optional

import numpy as np
import open_clip
import torch
from PIL import Image


MODEL_NAME = "ViT-B-32"
PRETRAINED = "openai"
MODEL_KEY = f"{MODEL_NAME}/{PRETRAINED}"

_lock = threading.Lock()
_model: Optional[torch.nn.Module] = None
_preprocess = None
_tokenizer = None


def _ensure_loaded() -> None:
    global _model, _preprocess, _tokenizer
    with _lock:
        if _model is not None:
            return
        model, _, preprocess = open_clip.create_model_and_transforms(
            MODEL_NAME, pretrained=PRETRAINED
        )
        model.eval()
        _model = model
        _preprocess = preprocess
        _tokenizer = open_clip.get_tokenizer(MODEL_NAME)


def embed_image(path: str) -> tuple[bytes, str]:
    """Return (float32 little-endian bytes, model_key)."""
    _ensure_loaded()
    img = Image.open(path).convert("RGB")
    with torch.no_grad():
        x = _preprocess(img).unsqueeze(0)  # type: ignore[misc]
        feats = _model.encode_image(x)  # type: ignore[union-attr]
        feats = feats / feats.norm(dim=-1, keepdim=True)
    arr = feats.squeeze(0).cpu().numpy().astype(np.float32)
    return arr.tobytes(), MODEL_KEY


def embed_texts(prompts: list[str]) -> np.ndarray:
    """Return L2-normalized text embeddings (N, 512) for the prompt list."""
    _ensure_loaded()
    with torch.no_grad():
        tokens = _tokenizer(prompts)  # type: ignore[misc]
        feats = _model.encode_text(tokens)  # type: ignore[union-attr]
        feats = feats / feats.norm(dim=-1, keepdim=True)
    return feats.cpu().numpy().astype(np.float32)


def model_key() -> str:
    return MODEL_KEY
