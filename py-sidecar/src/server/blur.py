"""Blur scoring via Laplacian variance.

Laplacian variance is a classical sharpness measure: convolve with a
Laplacian kernel (second derivative) and take variance. Sharp edges
contribute large positive and negative responses; blur smooths the
response, lowering variance.

We return the raw variance without size normalization. Phone photos
generally cluster at 200-3000 sharp / <100 blurry; pyimagesearch's
classic threshold of 100 is a reasonable v1 default.
"""
import os

import cv2


def laplacian_variance(path: str) -> float:
    if not os.path.isfile(path):
        raise FileNotFoundError(path)
    img = cv2.imread(path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        raise ValueError(f"could not decode image: {path}")
    lap = cv2.Laplacian(img, cv2.CV_64F)
    return float(lap.var())
