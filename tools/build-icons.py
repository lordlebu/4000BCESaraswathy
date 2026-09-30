"""Cut every icon the game is shown by, from one picture of the Asura-Tainted Princess.

The owner's painting of her head is the game's mark: in a browser tab, on a home screen, in a
store. One picture, because an icon drawn separately at each size is several things to keep alike.

    python tools/build-icons.py            # cut the icons from assets/icon.png
    python tools/build-icons.py --intake   # first, rebuild assets/icon.png from the raw

**The raw is not tracked and the master is.** The painting arrived at 1254 pixels and a megabyte,
and sits in `assets/source/dump/` with the rest of the raws. `--intake` trims it to the art, squares
it and writes `assets/icon.png` at 512 -- that is the kept file, small enough to live in the
repository, and the only thing the ordinary run reads.

Three kinds of icon come out, and they are not the same picture at three sizes:

  favicon        transparent, the head filling the frame. A tab is sixteen pixels wide and has no
                 room to spend on a margin.
  icon-192/512   on the diary's paper, with a little air. What an installed app shows.
  maskable       on paper with the head inside the middle 70%. A phone crops this one to a circle
                 or a squircle, and her horns reach the edge of the painting -- without the margin
                 they are the first thing cut off.

Scaled with premultiplied alpha. Resizing a transparent image channel by channel drags the colour
of the invisible pixels into the edge, and hers are black: the outline grows a dark fringe.
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "assets" / "source" / "dump" / "favicon.png"
MASTER = ROOT / "assets" / "icon.png"
OUT = ROOT / "public"
PAPER = (255, 246, 223, 255)  # --paper in src/ui/styles.css


def resized(image: Image.Image, size: int) -> Image.Image:
    """Shrink an RGBA image without a fringe, by scaling colour already multiplied by alpha."""
    pre = image.convert("RGBa").resize((size, size), Image.LANCZOS)
    return pre.convert("RGBA")


def intake() -> None:
    raw = Image.open(RAW).convert("RGBA")
    # The background was cut out by a tool that left specks behind: pixels a few per cent opaque,
    # invisible on black and a scatter of grey on paper. They also stretch the bounding box to the
    # edge of the file, so the head was being centred on dust. Anything under a quarter opaque goes.
    alpha = raw.getchannel("A").point(lambda a: 0 if a < 64 else a)
    raw.putalpha(alpha)
    art = raw.crop(alpha.getbbox())
    side = max(art.size)
    square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    square.alpha_composite(art, ((side - art.width) // 2, (side - art.height) // 2))
    resized(square, 512).save(MASTER, optimize=True)
    print(f"  assets/icon.png  from {raw.width}x{raw.height}, art {art.width}x{art.height}")


def on_paper(master: Image.Image, size: int, fill: float) -> Image.Image:
    """The head at `fill` of the square, centred on paper."""
    inner = round(size * fill)
    icon = Image.new("RGBA", (size, size), PAPER)
    offset = (size - inner) // 2
    icon.alpha_composite(resized(master, inner), (offset, offset))
    return icon.convert("RGB")


def build() -> None:
    master = Image.open(MASTER).convert("RGBA")
    icons = OUT / "icons"
    icons.mkdir(parents=True, exist_ok=True)

    # The tab. An .ico holding three sizes is what every browser still asks for by name, and the
    # PNG beside it is what a modern one prefers.
    resized(master, 48).save(OUT / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    resized(master, 32).save(icons / "favicon-32.png", optimize=True)
    # iOS puts its own rounded square behind the icon and does not honour transparency.
    on_paper(master, 180, 0.86).save(icons / "apple-touch-icon.png", optimize=True)
    for size in (192, 512):
        on_paper(master, size, 0.86).save(icons / f"icon-{size}.png", optimize=True)
    on_paper(master, 512, 0.68).save(icons / "icon-maskable-512.png", optimize=True)
    for path in sorted([OUT / "favicon.ico", *icons.glob("*.png")]):
        print(f"  {path.relative_to(ROOT).as_posix():38} {path.stat().st_size / 1024:6.1f} KB")


if __name__ == "__main__":
    if "--intake" in sys.argv:
        intake()
    build()
