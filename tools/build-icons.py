"""Cut the app icons from Varuna's own sprite.

An installed game needs an icon at 192 and 512 pixels, and a picture made for the purpose would be
one more piece of art to keep in step. The traveller already exists at 26x40: the first frame of
his sheet, facing the player, enlarged by whole numbers so every pixel stays a square.

Drawn on the diary's paper with room round him, because a "maskable" icon is cropped to a circle
or a squircle by the device and anything in the outer fifth is cut off.

    python tools/build-icons.py
"""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SHEET = ROOT / "assets" / "varuna-overworld.png"
OUT = ROOT / "public" / "icons"
FRAME = (26, 40)
PAPER = (255, 246, 223, 255)  # --paper in src/ui/styles.css

figure = Image.open(SHEET).convert("RGBA").crop((0, 0, *FRAME))
OUT.mkdir(parents=True, exist_ok=True)
for size in (192, 512):
    # The largest whole-number enlargement that keeps him inside the middle 70% of the square.
    scale = int(size * 0.7) // FRAME[1]
    big = figure.resize((FRAME[0] * scale, FRAME[1] * scale), Image.NEAREST)
    icon = Image.new("RGBA", (size, size), PAPER)
    icon.alpha_composite(big, ((size - big.width) // 2, (size - big.height) // 2))
    icon.convert("RGB").save(OUT / f"icon-{size}.png", optimize=True)
    print(f"  icon-{size}.png  figure x{scale}")
