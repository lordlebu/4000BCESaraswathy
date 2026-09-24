"""
The river bridge, the dugout and the road lamp, drawn in code.

**These are the art, not placeholders for it.** The owner asked for a painted bridge, a dugout
and a road lamp, the prompts were written (see the Roads and Wet Ground plan), and the code-drawn
versions were looked at on the game's own tiles and kept. If painted art arrives later it replaces
the files this writes, and nothing downstream changes: `tools/build-river-craft.js` reads whatever
is in `assets/source/`.

Two rules the drawings keep, because the builder depends on them:

  * **The bridge is flat, straight overhead, and carries no shadow.** North-south pieces are the
    east-west ones turned a quarter, and a shadow turned with them would fall east. So the height
    -- the south faces and the shadow on the water -- is added by the builder after turning, and
    the light comes from the north whichever way a bridge runs.
  * **The dugout is three-quarter view, bow to the right**, like the travellers who sit in it, with
    two end-on views for north and south. The game flips the side view for west; there is no
    rotation, so it may carry its own shading -- and its signs, which read mirrored going west, as
    a carving does from the boat's other side.

Pillow, and run by hand; nothing in CI calls it:

    python tools/draw-river-art.py
"""

import random
from pathlib import Path

from PIL import Image, ImageDraw

SOURCE = Path(__file__).resolve().parent.parent / "assets" / "source"
MAGENTA = (255, 0, 255, 255)
random.seed(7)


def bridge() -> Image.Image:
    """A timber footbridge three tiles long, overhead, on transparency. 384 x 128."""
    w, h = 384, 128
    top, bot = 40, 88  # a 48 px deck through the vertical centre, as wide as the road band
    foot = 34          # stone footing at each bank
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)

    # Stone footings: fitted blocks, each with a lit north edge.
    for x0 in (0, w - foot):
        d.rectangle([x0, top - 10, x0 + foot - 1, bot + 9], fill=(96, 90, 78, 255))
        y, row = top - 10, 0
        while y < bot + 10:
            bh = random.choice([9, 10, 11])
            x = x0 + (0 if row % 2 == 0 else -6)
            while x < x0 + foot:
                bw = random.choice([10, 12, 14])
                a, bx = max(x, x0) + 1, min(x + bw, x0 + foot - 1) - 1
                y1 = min(y + bh, bot + 9) - 1
                if bx > a and y1 > y + 1:
                    colour = random.choice([(150, 142, 122), (136, 128, 110), (160, 152, 132), (128, 120, 102)])
                    d.rectangle([a, y + 1, bx, y1], fill=colour + (255,))
                    d.line([(a, y + 1), (bx, y + 1)], fill=(184, 176, 152, 255))
                x += bw
            y += bh
            row += 1

    # Planks laid across the span, each with grain, a lit edge, nail heads and a gap.
    x = foot
    while x < w - foot:
        pw = random.choice([10, 11, 12])
        right = min(x + pw - 2, w - foot - 1)
        base = random.choice([(156, 112, 66), (142, 102, 60), (166, 120, 72), (148, 106, 62)])
        d.rectangle([x, top, right, bot], fill=base + (255,))
        for _ in range(3):
            gy = random.randrange(top + 6, bot - 6)
            d.line([(x + 1, gy), (max(x + 1, right - 1), gy + random.choice([-1, 0, 1]))], fill=(122, 86, 48, 255))
        d.line([(x, top), (x, bot)], fill=(186, 142, 90, 255))
        d.point([(x + 3, top + 9), (x + 3, bot - 9)], fill=(70, 52, 36, 255))
        gap = min(x + pw - 1, w - foot - 1)
        d.line([(gap, top), (gap, bot)], fill=(60, 40, 24, 255))
        x += pw

    # A rail along each side, and posts along the rails.
    for y0 in (top - 2, bot - 5):
        d.rectangle([foot - 4, y0, w - foot + 3, y0 + 6], fill=(96, 64, 36, 255))
        d.line([(foot - 4, y0), (w - foot + 3, y0)], fill=(140, 98, 56, 255))
    for px in range(foot, w - foot + 1, 40):
        for y0 in (top - 5, bot - 7):
            d.rectangle([px - 4, y0, px + 4, y0 + 10], fill=(78, 52, 30, 255))
            d.rectangle([px - 4, y0, px + 4, y0 + 3], fill=(126, 88, 52, 255))
    return im


# The dugout is drawn on a grid of doubled pixels, and small. It was 256 x 128 at single pixels:
# two whole tiles long, finer-grained than the 4x figure sitting in it, and with its hollow drawn
# as an ellipse that rose above the gunwale -- the opening floated over the hull instead of being
# cut into it. Now the opening is the lens *between* the two gunwales, so it cannot leave the rim.
DUGOUT_ART = (96, 36)      # art pixels; doubled on the way out to 192 x 72, a tile and a half long
DUGOUT_RIM = 15            # the near gunwale amidships, in art pixels (30 in the built image)
DUGOUT_ENDS = (3, 92)      # stern and bow

# Indus signs, five art pixels tall, scored along the strake in light brown. The seals of the
# Saraswati run right to left, and so does this: read from the bow. Warli was the other thing asked
# for and was set aside -- it is a far later tradition than 4000 BCE, and these are the period's
# own marks. Six signs is a length the seals keep to: most inscriptions are five or fewer.
INDUS_SIGNS = [
    ["#.#.#", "#.#.#", "#####", "..#..", "..#.."],   # the comb, or trident
    [".###.", "#...#", "#.#.#", "#...#", ".###."],   # the wheel: a ring with a hub
    ["#...#", "#...#", "#...#", ".#.#.", "..#.."],   # the jar, the commonest sign of all
    [".#.", "###", ".#.", "#.#", "#.#"],             # the man
    ["..#..", ".###.", "#.#.#", ".###.", "#...#"],   # the fish
    ["#.#", "#.#", "#.#", "#.#", "#.#"],             # strokes: a numeral
]


def dugout() -> Image.Image:
    """An empty dugout, side view, bow right, three-quarter from above, on magenta. 192 x 72."""
    import math
    rng = random.Random(11)
    w, h = DUGOUT_ART
    x0, x1 = DUGOUT_ENDS
    ink, rim_lit, sign = (38, 24, 16, 255), (190, 138, 84, 255), (214, 172, 116, 255)
    side = [(140, 92, 54, 255), (112, 72, 42, 255), (82, 52, 30, 255), (60, 38, 22, 255)]
    inside = [(98, 64, 38, 255), (70, 46, 28, 255), (40, 27, 19, 255)]
    grain, end_grain = (94, 60, 34, 255), (150, 104, 62, 255)

    def t_of(x: float) -> float:
        return min(max((x - x0) / (x1 - x0), 0.0), 1.0)

    def near(x: float) -> float:
        """The near gunwale: level amidships, sweeping up to the bow, a touch up at the stern."""
        t = t_of(x)
        return DUGOUT_RIM - max(0.0, (t - 0.78) / 0.22) ** 2 * 7 - max(0.0, (0.1 - t) / 0.1) ** 2 * 2

    def far(x: float) -> float:
        """The far gunwale, seen over the hollow from a little above: the lens closes at the ends."""
        return near(x) - 7 * math.sin(math.pi * t_of(x)) ** 0.6

    def keel(x: float) -> float:
        """A round-bottomed log: deepest amidships, a raked cut up to the bow, a short blunt stern."""
        t = t_of(x)
        return near(x) + max(2.0, 14 * min(1.0, t / 0.08) ** 0.5 * min(1.0, (1 - t) / 0.24) ** 0.8)

    im = Image.new("RGBA", (w, h), MAGENTA)
    px = im.load()
    cols = {x: (round(far(x)), round(near(x)), round(keel(x))) for x in range(x0, x1 + 1)}
    for x, (f, n, k) in cols.items():
        # The opening: the far wall's inside face, then the floor in the near wall's shadow.
        for y in range(f, n):
            d = (y - f) / max(1, n - f)
            px[x, y] = inside[0] if d < 0.35 else inside[1] if d < 0.7 else inside[2]
        # The near side, lit under the gunwale and darkening as it turns under toward the keel.
        for y in range(n, k + 1):
            d = (y - n) / max(1, k - n)
            px[x, y] = side[0] if d < 0.22 else side[1] if d < 0.62 else side[2] if d < 0.88 else side[3]
    # Grain running with the log.
    for g in (0.42, 0.7):
        for x in range(x0 + 4, x1 - 6):
            f, n, k = cols[x]
            y = round(n + (k - n) * g)
            if rng.random() < 0.8 and n + 2 < y < k - 1:
                px[x, y] = grain
    # Both gunwales lit along their tops.
    for x, (f, n, k) in cols.items():
        px[x, n] = rim_lit
        if f < n:
            px[x, f] = rim_lit
    # The stern is cut square, and shows the log's end grain.
    for y in range(cols[x0][1], cols[x0][2] + 1):
        px[x0, y] = px[x0 + 1, y] = end_grain
    # One art pixel of ink around the whole silhouette, as the figures have.
    solid = {(x, y) for x in range(w) for y in range(h) if px[x, y] != MAGENTA}
    for x in range(w):
        for y in range(h):
            if (x, y) not in solid and any((x + dx, y + dy) in solid
                                           for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                px[x, y] = ink
    # The signs, amidships, three art pixels under the gunwale.
    x = 26
    for glyph in INDUS_SIGNS:
        gw = len(glyph[0])
        top = max(cols[c][1] for c in range(x, x + gw)) + 3
        for j, row in enumerate(glyph):
            for i, c in enumerate(row):
                if c == "#":
                    px[x + i, top + j] = sign
        x += gw + 3
    return im.resize((w * 2, h * 2), Image.NEAREST)


def dugout_end(bow_near: bool) -> Image.Image:
    """
    The dugout end-on, on magenta, for paddling north (stern toward you) and south (bow toward
    you). 104 x 200: as long on screen as the side view, since the game's three-quarter view barely
    foreshortens, and a beam that clears the seated figure's knees. Drawn round first, it read as a
    bowl -- the fault the side view had just been redrawn for.
    """
    import math
    rng = random.Random(5)
    w, h = 52, 100
    top, bot = 4, 84        # the rim, far end to near end
    half, ext = 23, 10      # half the beam inside the rim; how much of the near end's outside shows
    cx = (w - 1) / 2
    ink, rim_lit, sign = (38, 24, 16, 255), (190, 138, 84, 255), (214, 172, 116, 255)
    side = [(140, 92, 54, 255), (112, 72, 42, 255), (82, 52, 30, 255), (60, 38, 22, 255)]
    inside = [(98, 64, 38, 255), (70, 46, 28, 255), (40, 27, 19, 255)]
    end_grain, ring, adze = (150, 104, 62, 255), (120, 80, 46, 255), (58, 38, 25, 255)

    def hw(y: float) -> float:
        """Half the opening's width at row y: a pointed bow, and a stern cut square."""
        s = (y - top) / (bot - top)
        if not 0 <= s <= 1:
            return -1
        v = math.sin(math.pi * s) ** 0.45
        if bow_near and s < 0.5:
            v = max(v, 0.3)
        if not bow_near and s > 0.5:
            v = max(v, 0.42)
        return half * v

    im = Image.new("RGBA", (w, h), MAGENTA)
    px = im.load()
    widest = (top + bot) // 2
    # The near end's outside, under its rim: the lower half of the opening, dropped by `ext`.
    for y in range(widest + 1, bot + ext + 1):
        for x in range(w):
            for d in range(ext + 1):
                if y - d > widest and abs(x - cx) <= hw(y - d):
                    f = d / ext
                    px[x, y] = side[0] if f < 0.25 else side[1] if f < 0.6 else side[2] if f < 0.9 else side[3]
                    break
    # The opening: the far end's inside face, the side walls' inside faces, the floor between.
    for y in range(top, bot + 1):
        r, s = hw(y), (y - top) / (bot - top)
        for x in range(w):
            dx = abs(x - cx)
            if dx <= r:
                px[x, y] = inside[0] if s < 0.12 else inside[1] if (s < 0.18 or dx > r - 2.5) else inside[2]
    # Adze marks across the floor.
    for y in range(top + 12, bot - 6, 5):
        r = hw(y)
        for x in range(round(cx - r + 5), round(cx + r - 5), 6):
            xx = x + rng.choice((0, 1, 2))
            if px[xx, y] == inside[2] and px[xx + 2, y] == inside[2]:
                px[xx, y] = px[xx + 1, y] = px[xx + 2, y] = adze
    # The rim, lit all round.
    for y in range(top, bot + 1):
        r = hw(y)
        for x in range(w):
            dx = abs(x - cx)
            if r - 1.5 < dx <= r or (y in (top, bot) and dx <= r):
                px[x, y] = rim_lit
    if bow_near:
        # The fish, on the bow: the same sign that runs along the side, where it would be seen first.
        glyph = INDUS_SIGNS[4]
        x0, y0 = round(cx) - 2, bot + 3
        for j, row in enumerate(glyph):
            for i, c in enumerate(row):
                if c == "#":
                    px[x0 + i, y0 + j] = sign
    else:
        # The stern, square and toward you: the log's end grain, and its growth rings.
        r = hw(bot)
        for y in range(bot + 1, bot + ext):
            for x in range(w):
                if abs(x - cx) <= r - 1:
                    px[x, y] = end_grain
        for x in range(round(cx - r + 3), round(cx + r - 2), 4):
            px[x, bot + ext // 2] = ring
    solid = {(x, y) for x in range(w) for y in range(h) if px[x, y] != MAGENTA}
    for x in range(w):
        for y in range(h):
            if (x, y) not in solid and any((x + dx, y + dy) in solid
                                           for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                px[x, y] = ink
    return im.resize((w * 2, h * 2), Image.NEAREST)


def lamp_post() -> Image.Image:
    """A roadside oil lamp on a timber post, three-quarter view, standing on its base. 64 x 128."""
    w, h = 64, 128
    im = Image.new("RGBA", (w, h), MAGENTA)
    d = ImageDraw.Draw(im)
    px, base = 26, h - 4
    # A fitted stone foot, lit on top.
    d.rectangle([px - 12, base - 8, px + 12, base], fill=(118, 110, 94, 255))
    d.line([(px - 12, base - 8), (px + 12, base - 8)], fill=(158, 150, 128, 255))
    # The post: timber, lit on its west side, darker on its east.
    d.rectangle([px - 5, base - 88, px + 5, base - 8], fill=(92, 64, 38, 255))
    d.rectangle([px - 5, base - 88, px - 2, base - 8], fill=(118, 84, 50, 255))
    d.rectangle([px + 3, base - 88, px + 5, base - 8], fill=(70, 48, 28, 255))
    d.rectangle([px - 6, base - 91, px + 6, base - 88], fill=(126, 90, 54, 255))
    # The bracket, and a clay lamp hanging from it.
    d.rectangle([px + 5, base - 84, px + 22, base - 80], fill=(92, 64, 38, 255))
    d.line([(px + 20, base - 80), (px + 20, base - 74)], fill=(60, 42, 26, 255))
    d.polygon([(px + 12, base - 74), (px + 30, base - 74), (px + 27, base - 62), (px + 15, base - 62)],
              fill=(170, 88, 52, 255))
    d.rectangle([px + 14, base - 74, px + 28, base - 72], fill=(198, 112, 68, 255))
    d.line([(px + 15, base - 66), (px + 27, base - 66)], fill=(138, 68, 40, 255))
    # A small flame: the lamp is trimmed and burning. Its light at night is drawn by the game.
    d.ellipse([px + 18, base - 82, px + 24, base - 73], fill=(255, 208, 110, 255))
    d.ellipse([px + 19, base - 79, px + 23, base - 74], fill=(255, 244, 200, 255))
    return im


if __name__ == "__main__":
    SOURCE.mkdir(parents=True, exist_ok=True)
    bridge().save(SOURCE / "river-bridge.png")
    dugout().save(SOURCE / "dugout.png")
    dugout_end(bow_near=False).save(SOURCE / "dugout-north.png")
    dugout_end(bow_near=True).save(SOURCE / "dugout-south.png")
    lamp_post().save(SOURCE / "lamp-post.png")
    print("wrote river-bridge.png, the three dugouts and lamp-post.png in assets/source/")
