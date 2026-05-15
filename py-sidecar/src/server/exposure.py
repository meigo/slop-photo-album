"""Exposure scoring via histogram analysis.

Score ∈ [0, 1] where 1 = well-exposed (histogram centered, full tonal range)
and 0 = severely under/over-exposed (histogram pushed to one end).

Algorithm:
- Compute brightness histogram on the grayscale image (256 bins).
- Penalty for fraction of pixels at the extremes (0-5 and 250-255).
- Penalty for skew (mean far from 128).
"""
import os

import cv2
import numpy as np


def exposure_score(path: str) -> float:
    if not os.path.isfile(path):
        raise FileNotFoundError(path)
    img = cv2.imread(path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        raise ValueError(f"could not decode image: {path}")
    hist = cv2.calcHist([img], [0], None, [256], [0, 256]).flatten()
    total = hist.sum()
    if total == 0:
        return 0.0
    # Extreme-pixel fraction (clipped highlights + clipped shadows)
    dark = hist[:6].sum() / total
    bright = hist[250:].sum() / total
    clipped = dark + bright
    # Skew: distance of mean from 128, normalized to 0-1
    mean = float(np.mean(img))
    skew = abs(mean - 128.0) / 128.0
    # Combine: heavy penalty for clipping (>20%), moderate for skew
    score = 1.0 - min(1.0, 2.0 * clipped) - 0.3 * skew
    return max(0.0, min(1.0, float(score)))
