"""Cut the owner's camp prop sheets into the pieces a camp is drawn from.

Each sheet (`assets/source/camps/camp-<kind>.png`, from the owner's art of 1 October 2026) is three
props side by side on a transparent ground -- for the adventurers a lean-to, packs, and a hide rack;
for the dacoits a shelter, salt sacks, a tethering post; for the pilgrims a cloth shelter, a pole of
strips, a cairn with a lamp; for the drovers a thorn fold, a felt tent, a rack of skins. The prompt
asked for each piece "whole and separate, with clear empty space between", so the pieces are found
by the empty columns between them -- the same contract the hut sheet keeps.

Each piece is trimmed to its own bounds and scaled to stand beside the traveller (about 160 px tall on
this grid): the first, the shelter, to 176 px, and the others to 120. Written to `assets/camps/<kind>-<n>.png`,
numbered left to right, which `game/campArt.ts` loads. Resampled smoothly and never quantised --
the owner's ruling on art.

    python tools/build-camps.py
"""

from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "assets" / "source" / "camps"
OUT = ROOT / "assets" / "camps"
KINDS = ["adventurers", "dacoits", "pilgrims", "drovers"]
# A tent is taller than a person: the traveller stands about 160 px on this grid, and a hut's 88
# read as a toy beside him when first drawn.
SHELTER_HEIGHT = 176
PROP_HEIGHT = 120
# Pieces whose size is not the default, by the owner's word. The drovers' felt tent is the middle
# piece and the smallest of the three as painted (owner, 2 October 2026); their thorn fold, on the
# left, is the big piece and lies on the ground under the others.
HEIGHTS = {("drovers", 1): 176, ("drovers", 2): 100, ("drovers", 3): 120}
# A column counts as empty when almost none of it is painted. A stray speck must not join two props.
EMPTY_COLUMN = 3


def pieces(sheet: Image.Image) -> list[Image.Image]:
    alpha = np.asarray(sheet.split()[-1])
    painted = (alpha > 24).sum(axis=0) > EMPTY_COLUMN
    runs, start = [], None
    for x, on in enumerate(painted):
        if on and start is None:
            start = x
        elif not on and start is not None:
            runs.append((start, x))
            start = None
    if start is not None:
        runs.append((start, len(painted)))
    # Narrow runs are specks the painter left, not props.
    runs = [r for r in runs if r[1] - r[0] > sheet.width // 20]
    out = []
    for x0, x1 in runs:
        piece = sheet.crop((x0, 0, x1, sheet.height))
        out.append(piece.crop(piece.getbbox()))
    return out


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for kind in KINDS:
        sheet = Image.open(SOURCE / f"camp-{kind}.png").convert("RGBA")
        found = pieces(sheet)
        assert len(found) == 3, f"camp-{kind}.png: expected 3 props, found {len(found)}"
        for i, piece in enumerate(found, start=1):
            target = HEIGHTS.get((kind, i), SHELTER_HEIGHT if i == 1 else PROP_HEIGHT)
            scale = target / piece.height
            size = (max(1, round(piece.width * scale)), target)
            built = piece.resize(size, Image.LANCZOS)
            built.save(OUT / f"{kind}-{i}.png", optimize=True)
            print(f"  ok camp-{kind}.png piece {i}: {piece.width}x{piece.height} -> {size[0]}x{size[1]}")


if __name__ == "__main__":
    main()
