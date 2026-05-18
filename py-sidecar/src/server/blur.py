"""Blur scoring via Laplacian variance.

Laplacian variance is a classical sharpness measure: convolve with a
Laplacian kernel (second derivative) and take variance. Sharp edges
contribute large positive and negative responses; blur smooths the
response, lowering variance.

Whole-image variance misranks shallow-DOF portraits (sharp face, soft
bokeh background) as blurry. When face bboxes are passed in, we compute
variance over the largest face region instead — that's the bit the user
cares about for ranking. Falls back to whole-image when no faces.

Returned values stay on the same scale (raw variance, no normalization)
so the app's `normalizedSharpness` threshold (blur/500) keeps working.
"""
import os
from typing import Optional, Sequence

import cv2


FaceBBox = tuple[int, int, int, int]  # (x, y, w, h)


def laplacian_variance(path: str, face_bboxes: Optional[Sequence[FaceBBox]] = None) -> float:
    if not os.path.isfile(path):
        raise FileNotFoundError(path)
    img = cv2.imread(path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        raise ValueError(f"could not decode image: {path}")

    region = _face_region(img, face_bboxes) if face_bboxes else None
    target = region if region is not None else img
    lap = cv2.Laplacian(target, cv2.CV_64F)
    return float(lap.var())


def _face_region(img, face_bboxes: Sequence[FaceBBox]):
    """Crop the largest face's bbox with a small pad. Returns None if the
    crop would be too small to compute variance meaningfully."""
    H, W = img.shape[:2]
    largest = max(face_bboxes, key=lambda b: b[2] * b[3])
    x, y, w, h = largest
    # 10% padding around the face, clamped to image bounds.
    pad_x = max(1, int(w * 0.1))
    pad_y = max(1, int(h * 0.1))
    x0 = max(0, x - pad_x)
    y0 = max(0, y - pad_y)
    x1 = min(W, x + w + pad_x)
    y1 = min(H, y + h + pad_y)
    if x1 - x0 < 16 or y1 - y0 < 16:
        return None
    return img[y0:y1, x0:x1]
