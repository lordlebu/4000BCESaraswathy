"""
The Aravali strait's traffic, drawn in code: two ships, a lodestone drone, and a whale calf's back
and spout.

Drawn the way `draw-river-art.py` drew the dugout the owner kept: at half resolution, banded
shading, one art pixel of ink round the silhouette, then doubled. Every view faces right; the game
mirrors the ships and the drone for west, and the whale and its spout are only ever seen one way at
a time anyway. If painted art arrives it replaces these files and nothing downstream changes.

Sizes on the map, against a 128 px tile:

    ship-kelpfang     384 x 192   three tiles long, a caravel's length
    ship-fishing      192 x 128   a tile and a half, the dugout's length
    drone             112 x  80   under a tile
    whale-calf-back   240 x  64   two tiles of back, cut flat at the waterline
    whale-spout        56 x  80   raised over the blowhole and let fall

Pillow, and run by hand; nothing in CI calls it:

    python tools/draw-strait-art.py
"""

import math
import random
from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "assets" / "source" / "strait"
MAGENTA = (255, 0, 255, 255)
CLEAR = (0, 0, 0, 0)


def outline(im: Image.Image, ink) -> Image.Image:
    """One art pixel of ink round everything that is not transparent, as the figures have."""
    px = im.load()
    w, h = im.size
    solid = {(x, y) for x in range(w) for y in range(h) if px[x, y][3] > 0}
    for x in range(w):
        for y in range(h):
            if (x, y) in solid:
                continue
            if any((x + dx, y + dy) in solid for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                px[x, y] = ink
    return im


def band(d: float, colours):
    """Pick a shade from light to dark by a 0..1 depth, in even steps."""
    return colours[min(len(colours) - 1, int(d * len(colours)))]


# --- the Kelpfang-type outrigger ------------------------------------------------------------

def kelpfang() -> Image.Image:
    """A living outrigger the length of a caravel: grown hull, coral crust, a float, two sails."""
    rng = random.Random(3)
    w, h = 192, 96
    im = Image.new("RGBA", (w, h), CLEAR)
    px = im.load()
    d = ImageDraw.Draw(im)

    water = 80
    x0, x1 = 18, 176                        # stern, bow
    wood = [(104, 76, 54, 255), (82, 58, 42, 255), (64, 45, 34, 255), (48, 34, 27, 255)]
    grain = (118, 90, 64, 255)
    rim = (150, 116, 80, 255)

    def sheer(x):
        t = (x - x0) / (x1 - x0)
        return 62 - max(0.0, (t - 0.8) / 0.2) ** 1.6 * 16 - max(0.0, (0.12 - t) / 0.12) ** 2 * 6

    def bottom(x):
        t = (x - x0) / (x1 - x0)
        # The bow rakes up out of the water; the stern is cut short.
        return water - max(0.0, (t - 0.9) / 0.1) ** 1.2 * 12 - max(0.0, (0.03 - t) / 0.03) * 4

    for x in range(x0, x1 + 1):
        top, bot = round(sheer(x)), round(bottom(x))
        for y in range(top, bot + 1):
            px[x, y] = band((y - top) / max(1, bot - top), wood)
        px[x, top] = rim
    # Grain that is still growing: long wavering lines down the hull.
    for g in (0.35, 0.62):
        phase = rng.random() * 6
        for x in range(x0 + 3, x1 - 8):
            top, bot = sheer(x), bottom(x)
            y = round(top + (bot - top) * g + math.sin(x / 9 + phase))
            if rng.random() < 0.85 and top + 1 < y < bot - 1:
                px[x, y] = grain
    # Coral along the waterline, rose and cream, in clumps.
    coral = [(214, 152, 140, 255), (232, 214, 184, 255), (190, 128, 120, 255)]
    x = x0 + 4
    while x < x1 - 12:
        run = rng.randint(4, 10)
        lift = rng.randint(2, 3)
        for i in range(run):
            hump = round(lift * math.sin(math.pi * (i + 0.5) / run))
            for y in range(water - hump, water + 1):
                if px[x + i, y][3]:
                    px[x + i, y] = coral[(x + i + y) % 3]
        x += run + rng.randint(3, 9)

    # The deck house at the stern: lashed wood under a thatch.
    d.rectangle([30, 50, 54, 61], fill=(146, 104, 66, 255))
    for y in (53, 57):
        d.line([30, y, 54, y], fill=(118, 82, 52, 255))
    d.polygon([(27, 50), (42, 43), (57, 50)], fill=(184, 148, 88, 255))
    d.line([30, 47, 54, 47], fill=(160, 124, 72, 255))
    d.rectangle([40, 54, 44, 61], fill=(52, 36, 26, 255))

    # Two masts with yards, and tall woven sails bellied by a wind from astern.
    mast = (120, 86, 56, 255)

    def sail(left, right, top, low, colours, mast_x):
        for y in range(top, low + 1):
            t = (y - top) / (low - top)
            belly = round(math.sin(math.pi * t) * 6)
            for x in range(left, right + belly + 1):
                s = (x - left) / max(1, right + belly - left)
                c = colours[0] if s < 0.55 else colours[1]
                if (y - top) % 5 == 0:
                    c = colours[2]                # the weave, a seam every few rows
                px[x, y] = c
        d.line([left - 2, top - 1, right + 3, top - 1], fill=mast, width=2)   # yard
        d.line([mast_x, top - 4, mast_x, 62], fill=mast, width=2)

    sail(66, 98, 12, 52, [(200, 156, 84, 255), (174, 128, 62, 255), (156, 112, 52, 255)], 70)
    sail(110, 140, 20, 54, [(88, 102, 150, 255), (68, 80, 124, 255), (58, 68, 108, 255)], 114)

    # Green shoots at the prow: the hull is still alive.
    leaf = [(98, 146, 72, 255), (128, 172, 88, 255)]
    for sx, sy, n in ((172, 50, 6), (176, 47, 5), (168, 52, 4)):
        for i in range(n):
            px[sx + round(math.sin(i / 1.6) * 1.5), sy - i] = leaf[i % 2]
    im = outline(im, (34, 22, 16, 255))

    # The float on the near side, lower than the hull, and the two booms that carry it.
    float_im = Image.new("RGBA", (w, h), CLEAR)
    fd = ImageDraw.Draw(float_im)
    fpx = float_im.load()
    boom = (176, 136, 92, 255)
    for bx in (66, 128):
        pts = [(bx + i * 0.4, 64 + (i / 18) ** 1.3 * 20) for i in range(19)]
        fd.line(pts, fill=boom, width=2)
    for x in range(46, 152):
        t = (x - 46) / 105
        half = 3.4 * math.sin(math.pi * t) ** 0.4
        for y in range(round(88 - half), round(88 + half) + 1):
            fpx[x, y] = (196, 150, 136, 255) if y > 88 else coral[0] if (x * 7 + y * 3) % 5 else coral[1]
        fpx[x, round(88 - half)] = (238, 222, 196, 255)
    float_im = outline(float_im, (34, 22, 16, 255))
    im.alpha_composite(float_im)
    return im


# --- the small fishing boat -----------------------------------------------------------------

def fishing() -> Image.Image:
    """A sewn-plank boat for two, a patched madder sail, a net in the bow, a steering oar."""
    rng = random.Random(5)
    w, h = 96, 64
    im = Image.new("RGBA", (w, h), CLEAR)
    px = im.load()
    d = ImageDraw.Draw(im)
    water = 56
    x0, x1 = 10, 86
    planks = [(158, 112, 70, 255), (134, 94, 58, 255), (110, 76, 46, 255)]
    stitch = (226, 202, 156, 255)

    def sheer(x):
        t = (x - x0) / (x1 - x0)
        return 43 - max(0.0, (t - 0.72) / 0.28) ** 1.5 * 8 - max(0.0, (0.15 - t) / 0.15) ** 2 * 4

    def bottom(x):
        t = (x - x0) / (x1 - x0)
        return water - max(0.0, (t - 0.86) / 0.14) ** 1.3 * 10 - max(0.0, (0.06 - t) / 0.06) * 5

    for x in range(x0, x1 + 1):
        top, bot = round(sheer(x)), round(bottom(x))
        for y in range(top, bot + 1):
            k = min(2, int(3 * (y - top) / max(1, bot - top + 1)))
            px[x, y] = planks[k]
        px[x, top] = (196, 150, 98, 255)
        # Rows of cord stitching at the two plank seams.
        for k in (1, 2):
            y = round(top + (bot - top) * k / 3)
            if x % 3 == 0 and top < y < bot:
                px[x, y] = stitch

    # The mast, the yard and boom, and a square sail of patched madder cloth.
    mast = (112, 80, 52, 255)
    d.line([50, 6, 50, 43], fill=mast, width=2)
    sail_box = (37, 10, 65, 33)
    madder = [(176, 76, 60, 255), (152, 62, 50, 255)]
    for y in range(sail_box[1], sail_box[3] + 1):
        belly = round(math.sin(math.pi * (y - sail_box[1]) / (sail_box[3] - sail_box[1])) * 3)
        for x in range(sail_box[0], sail_box[2] + belly + 1):
            px[x, y] = madder[0] if x < 54 else madder[1]
    d.rectangle([40, 14, 46, 19], fill=(204, 118, 88, 255))       # a lighter patch
    d.rectangle([56, 24, 61, 29], fill=(132, 54, 44, 255))         # a darker one
    d.line([35, 9, 68, 9], fill=mast, width=1)
    d.line([35, 34, 68, 34], fill=mast, width=1)

    # The net heaped in the bow, and two baskets.
    for x in range(64, 79):
        hgt = round(4 * math.sin(math.pi * (x - 64) / 14))
        for y in range(sheer(x).__round__() - hgt, sheer(x).__round__()):
            px[x, y] = (186, 162, 116, 255) if (x + y) % 2 else (150, 128, 88, 255)
    for bx in (56, 61):
        d.rectangle([bx, 37, bx + 3, 41], fill=(196, 160, 96, 255))
        d.line([bx, 39, bx + 3, 39], fill=(160, 124, 70, 255))

    im = outline(im, (34, 22, 16, 255))
    # The steering oar, over the stern quarter, drawn after the outline so it stays slim.
    d = ImageDraw.Draw(im)
    d.line([18, 33, 6, 55], fill=(150, 108, 68, 255), width=2)
    d.polygon([(4, 52), (9, 54), (6, 61), (2, 59)], fill=(170, 124, 78, 255), outline=(34, 22, 16, 255))
    return im


# --- the lodestone drone --------------------------------------------------------------------

def drone() -> Image.Image:
    """Lodestone in a bamboo cradle, indigo fins, a quartz lens, a turmeric streamer."""
    w, h = 56, 40
    im = Image.new("RGBA", (w, h), CLEAR)
    px = im.load()
    d = ImageDraw.Draw(im)
    stone = [(118, 122, 130, 255), (92, 96, 104, 255), (70, 74, 82, 255), (50, 52, 60, 255)]
    cx, cy, rx, ry = 30, 20, 13, 10
    # Fins first, so the body sits over their roots: two above, one below, stretched indigo cloth.
    indigo, indigo_lit = (70, 84, 140, 255), (98, 112, 166, 255)
    d.polygon([(18, 13), (24, 10), (19, 2), (13, 5)], fill=indigo)
    d.polygon([(27, 11), (33, 10), (30, 2), (25, 3)], fill=indigo_lit)
    d.polygon([(18, 27), (24, 30), (19, 37), (13, 34)], fill=indigo)
    for x in range(cx - rx, cx + rx + 1):
        for y in range(cy - ry, cy + ry + 1):
            e = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
            if e <= 1:
                light = (y - (cy - ry)) / (2 * ry) * 0.8 + max(0.0, (cx - x) / rx) * 0.2
                px[x, y] = band(light, stone)
    for x, y in ((24, 16), (34, 24), (29, 26), (37, 14), (22, 22)):
        px[x, y] = (42, 44, 52, 255)                     # specks in the ore
    # The cradle: two bamboo hoops with their nodes, and a lacquered red keel rail.
    bamboo, node = (212, 190, 138, 255), (172, 150, 98, 255)
    for x in (23, 36):
        d.line([x, cy - ry + 1, x, cy + ry - 1], fill=bamboo, width=2)
        px[x, cy - 3] = px[x + 1, cy - 3] = node
        px[x, cy + 4] = px[x + 1, cy + 4] = node
    d.line([16, 31, 44, 31], fill=(156, 62, 46, 255), width=2)
    d.line([20, 29, 20, 31], fill=(156, 62, 46, 255))
    d.line([40, 29, 40, 31], fill=(156, 62, 46, 255))
    # The quartz lens at the front, ringed in brass.
    d.ellipse([40, 15, 47, 23], fill=(176, 140, 72, 255))
    d.ellipse([41, 16, 46, 22], fill=(206, 222, 230, 255))
    px[42, 17] = px[43, 17] = (250, 252, 252, 255)
    im = outline(im, (30, 28, 34, 255))
    # The streamer, after the outline: a turmeric ribbon trailing behind in the wind.
    px = im.load()
    for i in range(16):
        x = 16 - i
        y = 20 + round(math.sin(i / 2.4) * 3)
        if 0 <= x < w:
            px[x, y] = (228, 176, 54, 255)
            px[x, y + 1] = (186, 136, 38, 255)
    return im


# --- the whale calf -------------------------------------------------------------------------

def whale_back() -> Image.Image:
    """A Tethys Leviathan Calf's back breaking the surface, cut flat where the sea is."""
    rng = random.Random(9)
    w, h = 120, 32
    im = Image.new("RGBA", (w, h), CLEAR)
    px = im.load()
    base = 30
    x0, x1 = 6, 114
    slate = [(140, 150, 158, 255), (96, 106, 116, 255), (86, 96, 106, 255), (110, 120, 128, 255), (142, 150, 156, 255)]

    def top(x):
        t = (x - x0) / (x1 - x0)
        # Higher toward the head on the right, a long low run to the tail on the left.
        return base - 20 * math.sin(math.pi * t) ** 0.8 * (0.75 + 0.25 * t)

    for x in range(x0, x1 + 1):
        t0 = round(top(x))
        for y in range(t0, base + 1):
            d = (y - t0) / max(1, base - t0)
            px[x, y] = slate[0] if y == t0 else band(d, slate[1:])
    # The dorsal fin, small and curved back, behind the middle.
    for i in range(7):
        y = round(top(46)) - i
        for x in range(46 - i // 2, 52 - i):
            px[x, y] = slate[2]
    # The blowhole near the head, and water running off the skin.
    bh = round(top(94))
    px[93, bh + 1] = px[94, bh + 1] = (40, 46, 54, 255)
    for _ in range(14):
        x = rng.randint(x0 + 6, x1 - 6)
        y0 = round(top(x)) + 2
        for y in range(y0, min(base, y0 + rng.randint(2, 6))):
            px[x, y] = (196, 220, 228, 255)
    im = outline(im, (30, 34, 42, 255))
    # The waterline is the game's to draw: no outline along the bottom edge.
    px = im.load()
    for x in range(w):
        if px[x, base + 1][3]:
            px[x, base + 1] = CLEAR
    return im


def whale_spout() -> Image.Image:
    """The spout alone: a narrow plume opening into a soft cloud, and droplets falling."""
    rng = random.Random(13)
    w, h = 28, 40
    im = Image.new("RGBA", (w, h), CLEAR)
    d = ImageDraw.Draw(im)
    spray = [(244, 248, 250, 255), (214, 226, 234, 255), (180, 198, 210, 255)]
    d.polygon([(12, 39), (16, 39), (19, 20), (9, 20)], fill=spray[1])
    d.line([14, 38, 14, 22], fill=spray[0])
    for cx, cy, r, c in ((14, 12, 8, 1), (9, 15, 5, 2), (19, 15, 5, 2), (14, 9, 6, 0), (11, 7, 4, 0), (17, 8, 4, 0)):
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=spray[c])
    im = outline(im, (150, 172, 186, 255))
    px = im.load()
    for _ in range(9):
        x, y = rng.choice([rng.randint(1, 6), rng.randint(21, 26)]), rng.randint(14, 30)
        px[x, y] = spray[1]
    return im


def save(name: str, im: Image.Image) -> None:
    big = im.resize((im.width * 2, im.height * 2), Image.NEAREST)
    keyed = Image.new("RGBA", big.size, MAGENTA)
    keyed.alpha_composite(big)
    OUT.mkdir(parents=True, exist_ok=True)
    keyed.convert("RGB").save(OUT / f"{name}.png")
    print(f"wrote assets/source/strait/{name}.png  {big.width}x{big.height}")


if __name__ == "__main__":
    save("ship-kelpfang", kelpfang())
    save("ship-fishing", fishing())
    save("drone", drone())
    save("whale-calf-back", whale_back())
    save("whale-spout", whale_spout())
