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
  * **The dugout is three-quarter view, bow to the right**, like the travellers who sit in it. The
    game flips it for west; there is no rotation, so it may carry its own shading.

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


def dugout() -> Image.Image:
    """An empty dugout, side view, bow right, three-quarter from above, on magenta. 256 x 128."""
    w, h = 256, 128
    im = Image.new("RGBA", (w, h), MAGENTA)
    d = ImageDraw.Draw(im)
    rim = 58  # the gunwale; the hull fills the lower two thirds
    d.polygon([(10, rim + 2), (40, rim - 2), (200, rim - 6), (236, rim - 12), (250, rim - 8), (252, rim + 2),
               (244, rim + 26), (226, h - 16), (140, h - 8), (40, h - 10), (16, h - 22), (6, rim + 18)],
              fill=(58, 36, 22, 255))
    d.polygon([(14, rim + 4), (42, rim + 1), (200, rim - 3), (234, rim - 8), (246, rim - 5), (247, rim + 3),
               (240, rim + 24), (223, h - 19), (140, h - 11), (42, h - 13), (19, h - 24), (10, rim + 18)],
              fill=(104, 66, 38, 255))
    # A lit upper strake, a shade band, and the waterline.
    d.polygon([(14, rim + 4), (42, rim + 1), (200, rim - 3), (234, rim - 8), (246, rim - 5), (246, rim + 4),
               (236, rim + 10), (200, rim + 8), (42, rim + 12), (14, rim + 14)], fill=(138, 90, 52, 255))
    d.polygon([(19, h - 24), (42, h - 13), (140, h - 11), (223, h - 19), (230, h - 26), (140, h - 20), (42, h - 22)],
              fill=(76, 48, 28, 255))
    d.line([(24, h - 18), (140, h - 10), (222, h - 18)], fill=(40, 28, 20, 255), width=2)
    # Grain running with the log.
    for gy in (rim + 20, rim + 30, rim + 40):
        pts = [(gx, gy + random.choice([-1, 0, 0, 1]) - int((gx - 24) * 0.02)) for gx in range(24, 232, 8)]
        d.line(pts, fill=(86, 54, 30, 255), width=1)
    # The hollow, charred and adzed, seen from slightly above.
    d.ellipse([30, rim - 22, 222, rim + 8], fill=(34, 24, 18, 255))
    d.ellipse([36, rim - 18, 216, rim + 4], fill=(52, 34, 22, 255))
    for x in range(48, 206, 11):
        y = rim - 10 + random.choice([-2, 0, 2])
        d.arc([x, y - 5, x + 12, y + 6], 200, 340, fill=(84, 56, 34, 255), width=2)
        if random.random() < 0.5:
            d.point([(x + 5, y + 3)], fill=(24, 18, 14, 255))
    # The near lip of the hollow, lit, following the rim rather than crossing it.
    d.arc([30, rim - 22, 222, rim + 8], 10, 170, fill=(176, 122, 72, 255), width=3)
    # Blunt, adzed ends: a squared stern and a bow cut up at a slant, end grain showing.
    d.polygon([(6, rim + 2), (18, rim - 2), (22, rim + 20), (10, rim + 22)], fill=(90, 58, 34, 255))
    d.line([(9, rim + 6), (19, rim + 4)], fill=(120, 80, 46, 255))
    d.line([(10, rim + 12), (20, rim + 10)], fill=(120, 80, 46, 255))
    d.polygon([(226, rim - 8), (246, rim - 14), (252, rim - 4), (238, rim + 6)], fill=(126, 84, 48, 255))
    d.line([(232, rim - 6), (246, rim - 11)], fill=(150, 102, 60, 255))
    return im


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
    lamp_post().save(SOURCE / "lamp-post.png")
    print("wrote river-bridge.png, dugout.png and lamp-post.png in assets/source/")
