from pathlib import Path

from server.faces import detect_faces


FIX = Path(__file__).parent.parent / "fixtures"


def test_detect_faces_returns_list_of_boxes() -> None:
    result = detect_faces(str(FIX / "face.jpg"))
    assert isinstance(result, list)
    for box in result:
        assert set(box.keys()) >= {"x", "y", "w", "h"}
        assert all(isinstance(box[k], int) for k in ("x", "y", "w", "h"))
        # Embeddings off by default
        assert "embedding_b64" not in box


def test_detect_faces_on_sharp_returns_empty_or_few() -> None:
    result = detect_faces(str(FIX / "sharp.jpg"))
    assert len(result) <= 5


def test_detect_faces_with_embeddings_includes_b64_and_quality() -> None:
    result = detect_faces(str(FIX / "face.jpg"), with_embeddings=True)
    for box in result:
        assert "embedding_b64" in box
        assert "quality" in box
        assert isinstance(box["quality"], float)
        # 128 floats x 4 bytes = 512 bytes -> b64 ~ 684 chars
        assert len(box["embedding_b64"]) >= 600
