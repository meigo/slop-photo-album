from pathlib import Path

from server.phash import perceptual_hash


FIX = Path(__file__).parent.parent / "fixtures"


def test_phash_returns_16_hex_chars() -> None:
    h = perceptual_hash(str(FIX / "sharp.jpg"))
    assert len(h) == 16
    assert all(c in "0123456789abcdef" for c in h)


def test_near_duplicates_share_phash() -> None:
    # Same source image at different JPEG qualities → same perceptual hash.
    h1 = perceptual_hash(str(FIX / "copy1.jpg"))
    h2 = perceptual_hash(str(FIX / "copy2.jpg"))
    assert h1 == h2
