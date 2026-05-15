"""Blur scoring via Laplacian variance.

Laplacian variance is a classical sharpness measure: convolve with a
Laplacian kernel (second derivative) and take variance. Sharp edges
contribute large positive and negative responses; blur smooths the
response, lowering variance.

We normalize by image area so the score is comparable across resolutions.
"""
import os

import cv2


def laplacian_variance(path: str) -> float:
    if not os.path.isfile(path):
        raise FileNotFoundError(path)
    img = cv2.imread(path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        # imread returns None on decode failure (e.g. corrupt JPEG)
        raise ValueError(f"could not decode image: {path}")
    lap = cv2.Laplacian(img, cv2.CV_64F)
    var = float(lap.var())
    # Normalize per million pixels so scores compare across sizes.
    h, w = img.shape[:2]
    mpx = (h * w) / 1_000_000.0
    return var / max(mpx, 0.01)
