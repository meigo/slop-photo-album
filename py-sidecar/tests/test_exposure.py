from pathlib import Path

from server.exposure import exposure_score


FIX = Path(__file__).parent.parent / "fixtures"


def test_exposure_in_unit_range() -> None:
    s = exposure_score(str(FIX / "sharp.jpg"))
    assert 0.0 <= s <= 1.0


def test_exposure_missing_file_raises() -> None:
    import pytest

    with pytest.raises(FileNotFoundError):
        exposure_score("/nonexistent.jpg")
