"""Per-face embeddings via OpenCV SFace, using YuNet's 5-landmark format.

SFace was trained on canonically-aligned face crops. The recommended
pipeline is:
  1. YuNet.detect() returns rows of [x,y,w,h, eye_r_x, eye_r_y, eye_l_x,
     eye_l_y, nose_x, nose_y, mouth_r_x, mouth_r_y, mouth_l_x, mouth_l_y,
     confidence] — 15 floats per face.
  2. SFace.alignCrop(img, row) uses those landmarks to produce a 112×112
     aligned crop.
  3. SFace.feature(aligned_crop) returns the 128-dim embedding.

Bypassing step 2 (feeding raw bbox crops) was the cause of the
over-segmentation we saw in Phase 2b v1.
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


def embed_face_aligned(img: np.ndarray, yunet_row: np.ndarray) -> bytes:
    """Embed a face from img using YuNet's full 15-float row.

    yunet_row: 1-D numpy array of 15 floats from YuNet.detect()[1][i].
    Returns the 128-dim float32 embedding as little-endian bytes.
    """
    recognizer = _get_recognizer()
    # alignCrop expects the YuNet row as a 1×N or N float array. Reshape
    # to (1, 15) to match the expected calling convention.
    row = np.asarray(yunet_row, dtype=np.float32).reshape(1, -1)
    aligned = recognizer.alignCrop(img, row)
    feat = recognizer.feature(aligned)
    vec = feat.flatten().astype(np.float32)
    norm = float(np.linalg.norm(vec))
    if norm > 0:
        vec /= norm
    return vec.tobytes()
