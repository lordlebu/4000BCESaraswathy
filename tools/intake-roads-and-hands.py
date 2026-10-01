"""The owner's art for the Roads and Hands plan, 1 October 2026, made ready for the builder.

Only technical faults are repaired -- never a style choice (docs/art-handover.md). Two kinds:

- **Painted paper frames** on four pieces: a picture of a picture once the card draws its own edge.
  Each is trimmed to where the frame gives way (measured: the first row and column, from outside
  in, where under 15% of pixels are still the frame's paper colour), plus a margin that clears the
  torn edge -- 50 px on the 2400-wide raws, 22 on the 1024-wide one.
- **A "Grok" logo** in the bottom-right corner of both Aravali road paintings, over sea and grass.
  Painted out with a strip from the same rows just to its left, so the gradient carries, feathered.

Small tool sparkles inside a picture are left, as the handover's standing instruction says: at the
built size they read as highlights. Everything else is copied untouched under the name the game
looks it up by. Writes truecolour raws; the builder resamples and encodes.

    python tools/intake-roads-and-hands.py
    node tools/build-plates.js --prologue
    node tools/build-plates.js --events
"""

from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
DUMP = ROOT / "assets" / "source" / "dump"
PROLOGUE = ROOT / "assets" / "source" / "prologue"
EVENTS = ROOT / "assets" / "source" / "events"

# name in the dump -> (where it goes, the name the game looks it up by, crop box or None)
WORK = {
    "prologue-1-road.png": (PROLOGUE, "prologue-1-road.png", (112, 112, 2289, 1678)),
    "prologue-2-kit.png": (PROLOGUE, "prologue-2-kit.png", (140, 124, 2282, 1670)),
    "prologue-3-lothal.png": (PROLOGUE, "prologue-3-lothal.png", None),
    "prologue-4-kilns.png": (PROLOGUE, "prologue-4-kilns.png", None),
    "journey-lothal-narmada.png": (EVENTS, "journey-lothal-narmada.png", None),
    "journey-dwarka-lothal.png": (EVENTS, "journey-dwarka-lothal.png", None),
    "journey-aravali-lothal.png": (EVENTS, "journey-aravali-lothal.png", None),
    "journey-aravali-narmada.png": (EVENTS, "journey-aravali-narmada.png", None),
    "woven-camp-adventurers.png": (EVENTS, "woven-camp-adventurers.png", None),
    "woven-camp-dacoits.png": (EVENTS, "woven-camp-dacoits.png", None),
    "woven-camp-drovers.png": (EVENTS, "woven-camp-drovers.png", None),
    "woven-camp-pilgrims.png": (EVENTS, "woven-camp-pilgrims.png", None),
    "camp-night-fireside.png": (EVENTS, "camp-night-fireside.png", None),
    "camp-night-visitor.png": (EVENTS, "camp-night-visitor.png", (48, 53, 977, 717)),
    # A second take of the visitor, the eyeshine plainer; a take, never a replacement.
    "Gemini_Generated_Image_ug3nd9ug3nd9ug3n (1).png": (EVENTS, "camp-night-visitor.2.png", (140, 124, 2282, 1670)),
}

# The logo's corner on each Aravali road: paint out the bright marks in the bottom-right 420 x 200.
LOGO = {"journey-aravali-lothal.png", "journey-aravali-narmada.png"}


def paint_out_logo(img: Image.Image) -> Image.Image:
    a = np.asarray(img.convert("RGB")).astype(np.int32)
    h, w = a.shape[:2]
    x0, y0 = w - 420, h - 200
    region = a[y0:h, x0:w]
    # The logo is near-white and grey on a dark or mid ground: brighter than the picture around it.
    bright = region.mean(-1) > np.percentile(region.mean(-1), 92)
    ys, xs = np.nonzero(bright)
    if len(xs) == 0:
        return img
    bx0, by0, bx1, by1 = xs.min() + x0 - 12, ys.min() + y0 - 12, xs.max() + x0 + 12, ys.max() + y0 + 12
    bw = bx1 - bx0
    out = img.convert("RGB").copy()
    patch = out.crop((bx0 - bw - 20, by0, bx0 - 20, by1))
    mask = Image.new("L", patch.size, 255).filter(ImageFilter.GaussianBlur(0))
    feather = Image.new("L", patch.size, 0)
    feather.paste(255, (10, 10, patch.size[0] - 10, patch.size[1] - 10))
    feather = feather.filter(ImageFilter.GaussianBlur(8))
    out.paste(patch, (bx0, by0), feather if mask else None)
    print(f"  logo painted out at {bx0},{by0} {bw}x{by1 - by0}, from {bw + 20}px to the left")
    return out


def main() -> None:
    PROLOGUE.mkdir(parents=True, exist_ok=True)
    EVENTS.mkdir(parents=True, exist_ok=True)
    for src, (folder, name, box) in WORK.items():
        img = Image.open(DUMP / src)
        print(f"{src} -> {folder.name}/{name}")
        if box:
            img = img.crop(box)
            print(f"  frame trimmed to {box}")
        if src in LOGO:
            img = paint_out_logo(img)
        img.convert("RGB").save(folder / name)


if __name__ == "__main__":
    main()
