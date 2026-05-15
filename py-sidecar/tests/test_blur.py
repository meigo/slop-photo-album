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
