from pathlib import Path

from server.faces import detect_faces


FIX = Path(__file__).parent.parent / "fixtures"


def test_detect_faces_returns_list_of_boxes_with_quality() -> None:
    result = detect_faces(str(FIX / "face.jpg"))
    assert isinstance(result, list)
    for box in result:
        assert set(box.keys()) >= {"x", "y", "w", "h", "quality"}
        assert all(isinstance(box[k], int) for k in ("x", "y", "w", "h"))
        assert isinstance(box["quality"], float)


def test_detect_faces_on_sharp_returns_empty_or_few() -> None:
    result = detect_faces(str(FIX / "sharp.jpg"))
    assert len(result) <= 5
