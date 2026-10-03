"""The owner's paintings for the Strait and the Shallows (3 October 2026), made ready for the builder.

Only technical faults are repaired -- never a style choice (docs/art-handover.md). One kind here:
**painted paper edges**, a picture of a picture once the card draws its own. Measured from outside
in as the first row and column where under 85% of pixels are still the paper's colour, then trimmed
a little past it: the dugout's deckle frame (~83 px on a 1200-wide raw) and the thin torn edges of
the rest (~10-14 px on 1200, ~6 on 512).

**The two firsts are left as painted.** Both are vignettes that fade into the paper by design, as
the princess's teaching is, and trimming to the vignette would cut the canoe's bow and the
carriage's far rail. Both raws are already 4:3.

The small tool sparkle in a corner is left, as the handover's standing instruction says: at the
built size it reads as a highlight. Writes truecolour raws; the builder resamples and encodes.

    python tools/intake-strait-paintings.py
    node tools/build-plates.js --events
    node tools/build-plates.js --scenes
"""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
DUMP = ROOT / "assets" / "source" / "dump"
EVENTS = ROOT / "assets" / "source" / "events"
SCENES = ROOT / "assets" / "source" / "scenes"

# name in the dump -> (where it goes, the name the game looks it up by, crop box or None)
WORK = {
    # Canon's `field_map.firsts`: Thrali lends the dugout, and Hesh sees you aboard the line.
    "first-afloat-lothal.png": (EVENTS, "first-afloat-lothal.png", None),
    "first-ride-aravali.png": (EVENTS, "first-ride-aravali.png", None),
    # Canon's happening on first arriving at the First Pier: a woman at the rim watching the strait.
    "happening_the_strait_from_the_rim.png": (EVENTS, "happening_the_strait_from_the_rim.png", (30, 26, 1170, 870)),
    # Nights: afloat, and a bedroll up high. The dawn is the owner's lady on the ridge, which a sky
    # island's night shares (`NIGHT_GROUND_GROUP` in `ui/scenes.ts`).
    "rest-dugout.png": (SCENES, "rest-dugout.png", (100, 100, 1100, 810)),
    "rest-bedroll-high-midnight.png": (SCENES, "rest-bedroll-high-midnight.png", (30, 26, 1170, 870)),
    "rest-bedroll-high-dawn.png": (SCENES, "rest-bedroll-high-dawn.png", (12, 11, 500, 377)),
    "rest-bedroll-snow-midnight.png": (SCENES, "rest-bedroll-snow-midnight.png", (12, 11, 500, 376)),
}


def main() -> None:
    for folder in (EVENTS, SCENES):
        folder.mkdir(parents=True, exist_ok=True)
    for src, (folder, name, box) in WORK.items():
        img = Image.open(DUMP / src)
        print(f"{src} -> {folder.name}/{name}")
        if box:
            img = img.crop(box)
            print(f"  paper edge trimmed to {box}")
        img.convert("RGB").save(folder / name)


if __name__ == "__main__":
    main()
