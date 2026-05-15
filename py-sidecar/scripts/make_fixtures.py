"""Regenerate CV-test fixtures from scratch.

- sharp.jpg: 1024×768 high-contrast checkerboard (high Laplacian variance)
- blurry.jpg: same image with heavy gaussian blur
- face.jpg: a synthetic frontal face-like pattern (two dark circles for
  eyes, dark arc for mouth, on a light oval). The Haar cascade is not
  perfect on synthetic input, but it should detect this. If detection
  rate is unreliable, the test asserts `>=0` faces_count instead of
  exact count — we test that the endpoint runs without error and
  returns plausible shape, not detector accuracy.
- copy1.jpg / copy2.jpg: same source, JPEG-recompressed at q=70 and q=40
  to create near-duplicates with different bytes but identical pHash.
"""
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw


HERE = Path(__file__).parent
FIX = HERE.parent / "fixtures"
FIX.mkdir(exist_ok=True)


def write_sharp() -> Path:
    # 1024x768 checkerboard, 32px squares — high frequency content.
    img = np.zeros((768, 1024, 3), dtype=np.uint8)
    for y in range(0, 768, 32):
        for x in range(0, 1024, 32):
            if ((x // 32) + (y // 32)) % 2 == 0:
                img[y:y + 32, x:x + 32] = (240, 240, 240)
    cv2.imwrite(str(FIX / "sharp.jpg"), img, [cv2.IMWRITE_JPEG_QUALITY, 90])
    return FIX / "sharp.jpg"


def write_blurry(sharp_path: Path) -> Path:
    img = cv2.imread(str(sharp_path))
    blurred = cv2.GaussianBlur(img, (51, 51), sigmaX=20)
    cv2.imwrite(str(FIX / "blurry.jpg"), blurred, [cv2.IMWRITE_JPEG_QUALITY, 90])
    return FIX / "blurry.jpg"


def write_face() -> Path:
    # Synthetic face-ish pattern. Real face fixtures should be added later
    # if detection accuracy needs validating; for v2a we test that the
    # endpoint runs and returns a list of boxes (possibly empty).
    img = Image.new("RGB", (512, 512), (220, 200, 180))  # skin tone-ish
    d = ImageDraw.Draw(img)
    # Eyes
    d.ellipse((160, 180, 220, 220), fill=(40, 40, 40))
    d.ellipse((290, 180, 350, 220), fill=(40, 40, 40))
    # Mouth
    d.arc((180, 280, 330, 380), start=0, end=180, fill=(80, 40, 40), width=4)
    # Face outline
    d.ellipse((120, 100, 390, 470), outline=(100, 80, 60), width=3)
    img.save(FIX / "face.jpg", "JPEG", quality=90)
    return FIX / "face.jpg"


def write_copies(sharp_path: Path) -> None:
    img = Image.open(sharp_path)
    img.save(FIX / "copy1.jpg", "JPEG", quality=70)
    img.save(FIX / "copy2.jpg", "JPEG", quality=40)


def main() -> None:
    s = write_sharp()
    write_blurry(s)
    write_face()
    write_copies(s)
    print(f"Wrote fixtures to {FIX}")


if __name__ == "__main__":
    main()
