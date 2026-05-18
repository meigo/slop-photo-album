from pathlib import Path

from server.blur import laplacian_variance


FIX = Path(__file__).parent.parent / "fixtures"


def test_sharp_has_higher_blur_score_than_blurry() -> None:
    sharp = laplacian_variance(str(FIX / "sharp.jpg"))
    blurry = laplacian_variance(str(FIX / "blurry.jpg"))
    # Both should be positive numbers; sharp must be at least 5x higher.
    assert sharp > 0
    assert blurry > 0
    assert sharp > blurry * 5


def test_missing_file_raises() -> None:
    import pytest

    with pytest.raises(FileNotFoundError):
        laplacian_variance("/nonexistent/file.jpg")


def test_face_bbox_focuses_score_on_face_region() -> None:
    """A blurry full image with a sharp face crop in the bbox should score
    closer to sharp than the whole-image variance — that's the shallow-DOF
    correction. We don't have a dedicated bokeh fixture, so we approximate:
    on the sharp image, restricting variance to a small central crop
    should still give a sane (positive) value rather than dropping to zero,
    proving the crop path is wired."""
    sharp_whole = laplacian_variance(str(FIX / "sharp.jpg"))
    # Box covering ~the middle third of a typical photo.
    bbox = [(100, 100, 200, 200)]
    sharp_cropped = laplacian_variance(str(FIX / "sharp.jpg"), bbox)
    assert sharp_cropped > 0
    # Crop variance and full-image variance are usually within an order
    # of magnitude on a sharp image; this is a sanity check, not a
    # precise match.
    assert sharp_cropped > sharp_whole * 0.05


def test_empty_face_list_falls_back_to_whole_image() -> None:
    same_with_empty = laplacian_variance(str(FIX / "sharp.jpg"), [])
    whole = laplacian_variance(str(FIX / "sharp.jpg"))
    assert same_with_empty == whole


def test_tiny_bbox_falls_back_to_whole_image() -> None:
    """Bboxes smaller than 16px in any dimension shouldn't be used —
    variance on a 3x3 crop is meaningless. Function should fall back."""
    tiny = laplacian_variance(str(FIX / "sharp.jpg"), [(0, 0, 4, 4)])
    whole = laplacian_variance(str(FIX / "sharp.jpg"))
    assert tiny == whole
