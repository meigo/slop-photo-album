"""Face detection via OpenCV's YuNet (ONNX) detector.

YuNet is a small, modern DNN-based face detector bundled with the model
file in `py-sidecar/models/`. Compared to Haar cascades it has
substantially fewer false positives on textured backgrounds and
substantially better recall on tilted / partial / non-frontal faces.

Returned boxes are clipped to image bounds and represented as
{x, y, w, h} dicts of ints, matching the previous Haar interface so the
sidecar HTTP contract is unchanged.
"""
import os
from pathlib import Path

import cv2


_MODEL_PATH = str(Path(__file__).resolve().parents[2] / "models" / "face_detection_yunet_2023mar.onnx")

# YuNet detector is stateful around input size. We lazy-init one per
# input shape so we don't pay graph-rebuild cost between calls of the
# same size. In practice photos cluster at a small set of sizes (camera
# defaults), so a small LRU is enough.
_DETECTORS: dict[tuple[int, int], "cv2.FaceDetectorYN"] = {}


def _get_detector(width: int, height: int) -> "cv2.FaceDetectorYN":
    key = (width, height)
    det = _DETECTORS.get(key)
    if det is None:
        det = cv2.FaceDetectorYN.create(
            model=_MODEL_PATH,
            config="",
            input_size=(width, height),
            score_threshold=0.6,   # higher = stricter; tune in 2b if needed
            nms_threshold=0.3,
            top_k=200,
        )
        _DETECTORS[key] = det
    return det


def detect_faces(path: str) -> list[dict[str, int]]:
    if not os.path.isfile(path):
        raise FileNotFoundError(path)
    img = cv2.imread(path, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError(f"could not decode image: {path}")

    h, w = img.shape[:2]
    detector = _get_detector(w, h)
    _, faces = detector.detect(img)
    if faces is None:
        return []

    result: list[dict[str, int]] = []
    for row in faces:
        # YuNet rows: x, y, w, h, [5 landmark coords...], confidence
        x, y, fw, fh = row[0:4]
        # Clip to image bounds (YuNet sometimes returns slightly off-edge boxes).
        x = max(0, int(x))
        y = max(0, int(y))
        fw = max(0, min(w - x, int(fw)))
        fh = max(0, min(h - y, int(fh)))
        if fw == 0 or fh == 0:
            continue
        result.append({"x": x, "y": y, "w": fw, "h": fh})
    return result
