from pathlib import Path

import numpy as np

from server.embed import embed_image, model_key


FIX = Path(__file__).parent.parent / "fixtures"


def test_embed_returns_512_dim_float32() -> None:
    raw, key = embed_image(str(FIX / "sharp.jpg"))
    assert key == "ViT-B-32/openai"
    arr = np.frombuffer(raw, dtype=np.float32)
    assert arr.shape == (512,)
    # L2-normalized
    norm = float(np.linalg.norm(arr))
    assert abs(norm - 1.0) < 1e-4


def test_embed_consistent_across_calls() -> None:
    raw1, _ = embed_image(str(FIX / "sharp.jpg"))
    raw2, _ = embed_image(str(FIX / "sharp.jpg"))
    a = np.frombuffer(raw1, dtype=np.float32)
    b = np.frombuffer(raw2, dtype=np.float32)
    # Deterministic given torch.eval() and no dropout
    assert np.allclose(a, b, atol=1e-5)
