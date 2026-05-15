"""Per-face embeddings via OpenCV SFace.

SFace expects an aligned face crop. We extract the YuNet bounding box,
crop the original image, resize to 112x112 (SFace expected input), and
pass through the recognizer. Output is a 128-dim L2-normalized vector.

We also compute a 'quality' score = detector confidence (passed in from
YuNet, defaulting to 1.0 if absent) x normalized face size (face area /
image area), capped at 1.0. Quality is consumed by clustering to weight
representatives.
"""
from pathlib import Path

import cv2
import numpy as np


_MODEL_PATH = str(Path(__file__).resolve().parents[2] / "models" / "face_recognition_sface_2021dec.onnx")
_recognizer = None


def _get_recognizer() -> "cv2.FaceRecognizerSF":
    global _recognizer
    if _recognizer is None:
        _recognizer = cv2.FaceRecognizerSF.create(_MODEL_PATH, "")
    return _recognizer


def embed_face_crop(img: np.ndarray, bbox: tuple[int, int, int, int]) -> bytes:
    """Crop the face from img using bbox (x,y,w,h), embed via SFace."""
    x, y, w, h = bbox
    # Clip to image bounds
    H, W = img.shape[:2]
    x = max(0, min(W - 1, x))
    y = max(0, min(H - 1, y))
    w = max(1, min(W - x, w))
    h = max(1, min(H - y, h))
    crop = img[y:y + h, x:x + w]
    # SFace expects 112x112 RGB
    crop = cv2.resize(crop, (112, 112))
    recognizer = _get_recognizer()
    # alignCrop expects 5-landmark format; we don't have landmarks, so
    # we skip alignment and pass the raw crop via feature(). This is
    # slightly less accurate than the aligned form but adequate for v1.
    feat = recognizer.feature(crop)
    # feature() returns (1, 128) float32; flatten + normalize
    vec = feat.flatten().astype(np.float32)
    vec /= max(1e-9, float(np.linalg.norm(vec)))
    return vec.tobytes()
