"""Face detection (YuNet) + aligned embedding (SFace)."""
import base64
import os
from pathlib import Path

import cv2

from server.face_embed import embed_face_aligned


_MODEL_PATH = str(Path(__file__).resolve().parents[2] / "models" / "face_detection_yunet_2023mar.onnx")
_DETECTORS: dict[tuple[int, int], "cv2.FaceDetectorYN"] = {}


def _get_detector(width: int, height: int) -> "cv2.FaceDetectorYN":
    key = (width, height)
    det = _DETECTORS.get(key)
    if det is None:
        det = cv2.FaceDetectorYN.create(
            model=_MODEL_PATH,
            config="",
            input_size=(width, height),
            score_threshold=0.6,
            nms_threshold=0.3,
            top_k=200,
        )
        _DETECTORS[key] = det
    return det


def detect_faces(path: str, with_embeddings: bool = False) -> list[dict[str, object]]:
    if not os.path.isfile(path):
        raise FileNotFoundError(path)
    img = cv2.imread(path, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError(f"could not decode image: {path}")

    H, W = img.shape[:2]
    detector = _get_detector(W, H)
    _, faces = detector.detect(img)
    if faces is None:
        return []

    result: list[dict[str, object]] = []
    for row in faces:
        x, y, fw, fh = row[0:4]
        confidence = float(row[14]) if len(row) > 14 else 1.0
        x_i = max(0, int(x))
        y_i = max(0, int(y))
        fw_i = max(0, min(W - x_i, int(fw)))
        fh_i = max(0, min(H - y_i, int(fh)))
        if fw_i == 0 or fh_i == 0:
            continue
        face_dict: dict[str, object] = {"x": x_i, "y": y_i, "w": fw_i, "h": fh_i}
        if with_embeddings:
            face_area = (fw_i * fh_i) / max(1.0, W * H)
            quality = float(min(1.0, confidence * (face_area / 0.05)))
            try:
                emb_bytes = embed_face_aligned(img, row)
                face_dict["embedding_b64"] = base64.b64encode(emb_bytes).decode("ascii")
                face_dict["quality"] = quality
            except cv2.error:
                # alignCrop can fail on edge cases (face partially out of frame,
                # landmark estimation poor). Fall back to skipping the
                # embedding so the face still appears as a count/bbox.
                face_dict["quality"] = quality
        result.append(face_dict)
    return result
