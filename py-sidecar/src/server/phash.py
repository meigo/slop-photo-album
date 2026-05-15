"""Perceptual hash for near-duplicate detection.

`imagehash.phash` produces a 64-bit DCT-based hash that's stable under
small edits (recompression, mild crop, slight color shift). We
hex-encode the 64-bit hash so the renderer can compare via Hamming
distance on hex strings.
"""
import imagehash
from PIL import Image


def perceptual_hash(path: str) -> str:
    with Image.open(path) as img:
        h = imagehash.phash(img, hash_size=8)  # 8 → 64-bit
    # imagehash's str() returns 16 hex chars for an 8×8 hash.
    return str(h)
