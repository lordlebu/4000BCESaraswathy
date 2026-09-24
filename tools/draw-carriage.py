"""
The lodestone carriage end-on, for the ride along the Aravali line. Drawn in code.

**Why a second view.** `assets/source/carriage.png` is painted side-on, and `vehicles.png` is built
from it by `tools/build-terrain.js` -- but the Lodestone Line runs north to south, straight down one
column between the islands. A side-on car on that line would be crossing its own rails, the same
wrong-way fault the dugout had paddling north. From the game's three-quarter camera a car running
north or south shows its roof and its south end, and a car is the same at both ends, so one picture
serves both directions and nothing flips it.

Drawn on the side view's grid and in its colours: four screen pixels to an art pixel, timber roof
in planks, the dark end windows, the iron underframe, and the pale gap and shadow under it -- the
car floats on the lodestone rather than rolling, which is what the painted one already says.

**It carries a garden.** Potted plants stand along both eaves of the roof, and a flower box hangs
under each end window: the line is kept, and somebody who rides it every day keeps it green. The
pots sit inside the roof's outline, so the ink pass draws round them as part of the car.

Pillow, and run by hand; nothing in CI calls it. Writes the finished frame straight to `assets/`,
since there is nothing to key: it is drawn on transparency.

    python tools/draw-carriage.py
"""

from pathlib import Path

from PIL import Image

OUT = Path(__file__).resolve().parent.parent / "assets" / "carriage-end.png"

# The side view's own colours, sampled from `assets/vehicles.png`.
INK = (22, 16, 12, 255)
OUTLINE = (42, 28, 16, 255)
ROOF_LIT = (196, 150, 96, 255)
ROOF = (168, 114, 64, 255)
ROOF_SHADE = (140, 92, 50, 255)
PLANK = (122, 78, 42, 255)
WALL = (122, 78, 42, 255)
WALL_DARK = (78, 48, 26, 255)
POST = (58, 38, 22, 255)
GLASS = (36, 36, 36, 255)
IRON = (68, 68, 66, 255)
IRON_LIT = (102, 102, 98, 255)
RIVET = (140, 140, 134, 255)
SHADOW = (20, 26, 30, 110)
# The garden it carries: terracotta, and what grows in it.
POT = (176, 92, 56, 255)
POT_LIT = (212, 124, 78, 255)
POT_SHADE = (126, 62, 38, 255)
LEAF = (78, 128, 62, 255)
LEAF_LIT = (120, 170, 84, 255)
LEAF_DARK = (48, 88, 44, 255)
BLOOM = (226, 112, 128, 255)
BLOOM_GOLD = (236, 190, 84, 255)

W, H = 22, 48          # art pixels
SCALE = 4              # the painted carriage's own grid
ROOF_TOP, ROOF_END = 1, 31
END_FACE = (31, 41)    # the south end, under the eave
FRAME = (41, 44)       # iron underframe
SHADOW_ROWS = (45, 47) # the gap, then the shadow the car throws on what is under it


def draw() -> Image.Image:
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    px = im.load()

    def box(x0, y0, x1, y1, colour):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                px[x, y] = colour

    # The roof, running away up the screen: lit along the ridge, shaded at the eaves, planked across.
    box(1, ROOF_TOP, 20, ROOF_END, ROOF)
    box(8, ROOF_TOP, 13, ROOF_END, ROOF_LIT)
    box(1, ROOF_TOP, 3, ROOF_END, ROOF_SHADE)
    box(18, ROOF_TOP, 20, ROOF_END, ROOF_SHADE)
    for y in range(ROOF_TOP + 3, ROOF_END, 4):
        box(1, y, 20, y, PLANK)
    # The rounded far end: corners off.
    for x, y in ((1, ROOF_TOP), (20, ROOF_TOP)):
        px[x, y] = (0, 0, 0, 0)
    # The eave over the near end, a darker lip the end wall sits under.
    box(0, ROOF_END, 21, ROOF_END, OUTLINE)

    # The south end: vertical boards, a post at each corner, two windows either side of a door.
    y0, y1 = END_FACE
    box(1, y0, 20, y1, WALL)
    for x in range(3, 20, 3):
        box(x, y0, x, y1, WALL_DARK)
    box(1, y0, 2, y1, POST)
    box(19, y0, 20, y1, POST)
    box(4, y0 + 2, 6, y0 + 5, GLASS)
    box(15, y0 + 2, 17, y0 + 5, GLASS)
    box(9, y0 + 2, 12, y1, WALL_DARK)      # the door
    box(10, y0 + 3, 11, y0 + 5, GLASS)     # its light

    # The iron underframe, lit along its top edge, riveted.
    f0, f1 = FRAME
    box(2, f0, 19, f1, IRON)
    box(2, f0, 19, f0, IRON_LIT)
    for x in (4, 10, 17):
        px[x, f0 + 1] = RIVET

    # Potted plants along both eaves: a terracotta pot, lit on its left, and a leafy plant over it.
    # Three to a side, staggered so the two rows do not line up into a grid.
    def potted(x, y, bloom):
        box(x, y + 3, x + 2, y + 4, POT)
        px[x, y + 3] = POT_LIT
        box(x, y + 4, x + 2, y + 4, POT_SHADE)
        for lx, ly, colour in ((x + 1, y, LEAF_LIT), (x, y + 1, LEAF), (x + 1, y + 1, LEAF_LIT),
                               (x + 2, y + 1, LEAF_DARK), (x, y + 2, LEAF_DARK), (x + 1, y + 2, LEAF),
                               (x + 2, y + 2, LEAF)):
            px[lx, ly] = colour
        if bloom:
            px[x + 1, y] = bloom

    for i, y in enumerate((3, 12, 21)):
        potted(2, y, BLOOM if i == 1 else None)
    for i, y in enumerate((7, 16, 25)):
        potted(17, y, BLOOM_GOLD if i != 1 else None)

    # A flower box under each end window, spilling a little over its edge.
    for x in (3, 14):
        box(x, y0 + 6, x + 4, y0 + 7, POT)
        box(x, y0 + 7, x + 4, y0 + 7, POT_SHADE)
        for fx, colour in ((x, LEAF), (x + 1, BLOOM), (x + 2, LEAF_LIT), (x + 3, BLOOM_GOLD), (x + 4, LEAF)):
            px[fx, y0 + 5] = colour
        px[x + 4, y0 + 8] = LEAF_DARK

    # Outline the car: one art pixel of ink, as the painted side view has.
    solid = {(x, y) for x in range(W) for y in range(H) if px[x, y][3] == 255}
    for x in range(W):
        for y in range(H):
            if (x, y) not in solid and any((x + dx, y + dy) in solid
                                           for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                px[x, y] = INK

    # Floating: a gap of air, then its shadow, narrower than the car.
    s0, s1 = SHADOW_ROWS
    box(4, s0 + 1, 17, s1, SHADOW)
    return im.resize((W * SCALE, H * SCALE), Image.NEAREST)


if __name__ == "__main__":
    draw().save(OUT)
    print(f"wrote {OUT.relative_to(OUT.parent.parent)}: {W * SCALE} x {H * SCALE}")
