"""Additional original SNES pixel drawings; never rewrites the accepted first set.

Run with Pillow: python tools/build-twins-polish.py. Coordinates below are logical
pixels, enlarged only with nearest filtering. The game mixes both sets by seed.
"""
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / 'assets' / 'twins'
P = dict(ink='#50433b', sand='#d9bd79', sand2='#c6a263', light='#ead59d',
         hill='#9b8865', grass='#8c9b59', green='#52774e', leaf='#71935a',
         water='#58939d', deep='#3e707f', mud='#bb8c57', mud2='#9d704d',
         brick='#b56e50', brick2='#8f5346', cream='#e2c79a')

def canvas(w, h): return Image.new('RGBA', (w, h))
def colour(c): return P.get(c, c)
def box(d, xy, c): d.rectangle(xy, fill=colour(c))
def poly(d, xy, c): d.polygon(xy, fill=colour(c))
def line(d, xy, c, width=1): d.line(xy, fill=colour(c), width=width)
def ellipse(d, xy, c): d.ellipse(xy, fill=colour(c))
def atlas(frames, name, cols=8):
    w, h = frames[0].size
    im = canvas(w * cols, h * ((len(frames) + cols - 1) // cols))
    for i, frame in enumerate(frames): im.alpha_composite(frame, (i % cols * w, i // cols * h))
    im.resize((im.width * 2, im.height * 2), Image.Resampling.NEAREST).save(OUT / (name + '.png'), optimize=True)

# Forty logical pixels across: finer detail than the first set, same native 80x88.
homes = []
for n in range(8):
    im = canvas(40, 44); d = ImageDraw.Draw(im); brick = n >= 4
    front, side = ('brick', 'brick2') if brick else ('mud', 'mud2')
    ellipse(d, (3, 37, 38, 43), (57, 44, 35, 65))
    box(d, (5, 12, 34, 38), side); box(d, (6, 13, 30, 37), front)
    poly(d, [(5, 12), (10, 6), (32, 6), (35, 12)], 'cream')
    box(d, (9, 8, 31, 11), front); line(d, [(10, 7), (31, 7)], 'light')
    box(d, (5, 12, 35, 14), 'cream'); line(d, [(6, 15), (30, 15)], side)
    if brick:
        for y in range(18, 36, 4):
            line(d, [(7, y), (30, y)], 'brick2')
            for x in range(8 + (y // 4 % 2) * 4, 31, 8):
                line(d, [(x, y - 2), (x, y)], 'brick2')
        box(d, (4, 38, 36, 40), 'brick2'); line(d, [(6, 38), (34, 38)], 'cream')
    else:
        # Plaster chips and a sunken planted courtyard inside the parapet.
        box(d, (10, 16, 28, 25), 'mud2'); box(d, (12, 17, 26, 23), 'sand2')
        line(d, [(12, 17), (26, 17)], 'ink'); box(d, (10, 24, 28, 26), 'cream')
        ellipse(d, (17, 17, 23, 22), 'green'); box(d, (19, 17, 21, 19), 'leaf')
        for x, y in [(8, 29), (27, 33), (9, 18)]: box(d, (x, y, x + 1, y + 1), 'mud2')
    box(d, (16, 28, 23, 39), 'ink'); box(d, (17, 29, 22, 38), '#695044')
    line(d, [(16, 28), (23, 28)], 'cream'); box(d, (14, 39, 25, 40), 'sand2')
    for x in (8, 27):
        box(d, (x, 27, x + 3, 31), side); box(d, (x + 1, 28, x + 3, 30), 'ink')
    if n % 2:
        poly(d, [(14, 27), (24, 27), (26, 30), (12, 30)], '#b18d73')
        line(d, [(13, 30), (25, 30)], 'cream')
    if n % 4 >= 2:
        ellipse(d, (26, 7, 30, 10), 'brick2'); box(d, (27, 6, 29, 7), 'cream')
        ellipse(d, (9, 33, 13, 37), 'mud2'); ellipse(d, (9, 32, 13, 34), 'green')
    homes.append(im)
atlas(homes, 'houses-detail')

# New prop silhouettes; accepted original palms, reeds, dunes and rocks remain in use.
props = []
for n in range(12):
    im = canvas(64, 80); d = ImageDraw.Draw(im)
    if n == 0:
        for band in range(15):
            y = 61 - band
            x = 3 + band * 2
            poly(d, [(x, y), (30, y - band // 3), (61 - band, y + 3), (x, y + 3)],
                 ['sand2', 'sand', 'light'][min(2, band // 6)])
        line(d, [(24, 46), (31, 43), (47, 49)], 'light')
        for x in range(8, 52, 6): line(d, [(x, 65), (x + 5, 65)], 'sand2')
    elif n == 1:
        poly(d, [(9, 68), (14, 48), (31, 39), (52, 49), (57, 68)], 'hill')
        poly(d, [(14, 48), (31, 39), (36, 51), (21, 61), (9, 68)], 'cream')
        poly(d, [(36, 51), (52, 49), (57, 68), (28, 70)], 'mud2')
        line(d, [(14, 48), (31, 39), (52, 49)], 'light')
        line(d, [(37, 52), (41, 61), (38, 67)], 'ink')
        box(d, (11, 70, 55, 72), (57, 44, 35, 70))
    elif n in (2, 3):
        poly(d, [(29, 70), (32, 33), (36, 29), (34, 70)], 'mud2')
        line(d, [(30, 69), (33, 36)], 'cream')
        if n == 2:
            for x, y in [(5, 31), (12, 21), (23, 16), (40, 17), (51, 24), (57, 34)]:
                poly(d, [(32, 32), (x, y), (x + 1, y + 7), (32, 35)], 'green')
                line(d, [(33, 31), (x, y)], 'leaf')
            ellipse(d, (28, 29, 35, 36), 'leaf')
            for y in range(40, 68, 6): line(d, [(31, y), (34, y - 1)], 'ink')
        else:
            for x, y, r in [(8, 29, 13), (17, 22, 15), (32, 21, 15), (42, 29, 14), (22, 31, 16)]:
                ellipse(d, (x, y, x + r, y + 13), 'green')
                ellipse(d, (x + 1, y, x + r - 2, y + 6), 'leaf')
            for x in range(13, 50, 7): box(d, (x, 31, x + 1, 32), 'grass')
    elif n == 4:
        for x, rise in [(11, 8), (19, 3), (28, 11), (37, 4), (47, 9)]:
            line(d, [(x, 72), (x - 2, 43 - rise)], 'green', 2)
            box(d, (x - 3, 37 - rise, x - 1, 47 - rise), 'mud2')
            line(d, [(x, 65), (x + 6, 54)], 'leaf')
            line(d, [(x, 65), (x - 6, 57)], 'leaf')
    elif n == 5:
        box(d, (8, 61, 55, 71), 'mud2'); line(d, [(8, 61), (55, 61)], 'cream')
        for y in (63, 67):
            for x in range(12, 52, 6): ellipse(d, (x, y, x + 3, y + 2), 'leaf')
        for x in (10, 52): box(d, (x, 36, x + 1, 61), 'mud2')
        poly(d, [(8, 35), (54, 35), (57, 42), (5, 42)], '#b9a581')
        for x in range(11, 52, 7): line(d, [(x, 36), (x - 2, 41)], 'cream')
    elif n == 6:
        ellipse(d, (17, 48, 48, 71), 'mud2'); box(d, (18, 55, 47, 65), 'hill')
        ellipse(d, (16, 46, 49, 58), 'cream'); ellipse(d, (20, 48, 45, 55), 'deep')
        line(d, [(23, 51), (41, 51)], 'water'); line(d, [(25, 53), (34, 53)], 'light')
    elif n == 7:
        # Gate posts stay on the edges, leaving the middle of the road open.
        for x in (2, 55):
            box(d, (x, 30, x + 6, 74), 'mud2'); box(d, (x, 30, x + 4, 72), 'mud')
            box(d, (x - 1, 29, x + 7, 32), 'cream')
            for y in range(38, 72, 7): line(d, [(x, y), (x + 6, y)], 'mud2')
        for x in (12, 48): box(d, (x, 70, x + 2, 72), 'hill')
    elif n == 8:
        for x, y in [(9, 70), (24, 66), (39, 72), (48, 64)]:
            poly(d, [(x, y), (x + 3, y - 4), (x + 8, y - 2), (x + 9, y + 2)], 'mud2')
            line(d, [(x + 3, y - 4), (x + 8, y - 2)], 'cream')
    elif n == 9:
        ellipse(d, (12, 55, 54, 72), 'mud2'); ellipse(d, (16, 57, 50, 67), 'ink')
        for x, y in [(23, 59), (32, 58), (40, 60)]: ellipse(d, (x, y, x + 5, y + 7), 'cream')
        for x in range(12, 51, 5): line(d, [(x, 68), (x + 8, 71)], 'light')
    elif n == 10:
        for x in (10, 53): box(d, (x, 38, x + 2, 71), 'mud2')
        box(d, (8, 38, 57, 41), 'cream')
        for x in range(14, 52, 5):
            line(d, [(x, 42), (x - 2, 58)], 'sand2', 2)
        poly(d, [(8, 62), (18, 69), (46, 69), (57, 62), (48, 73), (17, 73)], 'mud2')
        line(d, [(12, 63), (52, 63)], 'cream')
    else:
        box(d, (8, 50, 55, 70), 'mud2'); box(d, (9, 50, 52, 65), 'mud')
        box(d, (6, 48, 56, 51), 'cream'); box(d, (15, 68, 48, 73), 'sand2')
        for x in range(12, 53, 7): line(d, [(x, 53), (x + 3, 64)], 'mud2')
        box(d, (17, 69, 45, 71), 'light')
    props.append(im)
atlas(props, 'details')

# Ground overlays: 16 bank masks, 16 cliff masks, and two quiet water-glint frames.
rims = []
for kind in range(2):
 for mask in range(16):
    im = canvas(64, 64); d = ImageDraw.Draw(im)
    for bit in (1, 2, 4, 8):
      if not mask & bit: continue
      for along in range(64):
        rag = (along // 5 + along // 13) % 3
        for across in range(5 + rag if kind == 0 else 9 + rag):
          x, y = ((along, across) if bit == 1 else (63 - across, along) if bit == 2 else (along, 63 - across) if bit == 4 else (across, along))
          palette = ['sand2', 'mud2', 'deep'] if kind == 0 else ['cream', 'hill', 'mud2', 'ink']
          c = palette[min(len(palette) - 1, across // (2 if kind == 0 else 3))]
          box(d, (x, y, x, y), c)
    rims.append(im)
for phase in range(2):
    im = canvas(64, 64); d = ImageDraw.Draw(im)
    for x, y in [(9, 17), (37, 39), (18, 52)]:
        line(d, [(x + phase, y), (x + 8 + phase, y)], (226, 199, 154, 65))
        line(d, [(x + 2, y + 2), (x + 6, y + 2)], (62, 112, 127, 70))
    rims.append(im)
atlas(rims, 'rims')

# Four directions, four poses each. Proper end-on views instead of rotating a cart.
poses = []
for facing in range(4):
 for step in range(4):
    im = canvas(96, 80); d = ImageDraw.Draw(im); lift = step % 2
    if facing < 2:
        box(d, (7, 35 + lift, 48, 60 + lift), 'brick2')
        box(d, (8, 33 + lift, 47, 55 + lift), 'brick')
        box(d, (6, 29 + lift, 49, 35 + lift), 'cream')
        for x in (14, 36):
            ellipse(d, (x, 56, x + 10, 66), 'ink'); ellipse(d, (x + 3, 59, x + 7, 63), 'hill')
            line(d, [(x + 5, 57), (x + 5 + (step % 2) * 3, 65)], 'cream')
        for x in (14, 30): box(d, (x, 39 + lift, x + 8, 48 + lift), 'deep')
        line(d, [(48, 47), (67, 47)], 'mud2', 2)
        ellipse(d, (61, 32 + lift, 83, 49 + lift), 'ink')
        ellipse(d, (64, 29 + lift, 81, 41 + lift), 'cream')
        box(d, (80, 15 + lift, 84, 36 + lift), 'mud')
        ellipse(d, (77, 10 + lift, 88, 18 + lift), 'cream')
        box(d, (87, 14 + lift, 94, 16 + lift), 'mud2'); box(d, (85, 12 + lift, 85, 12 + lift), 'ink')
        for leg, phase in [(68, step), (78, step + 2)]:
            shift = [-4, 0, 4, 0][phase % 4]
            line(d, [(leg, 48), (leg + shift, 65), (leg + shift + 5, 66)], 'mud', 2)
        line(d, [(62, 44 + lift), (82, 44 + lift)], 'brick', 2)
        if facing == 1: im = im.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    else:
        bird_y, cart_y = (18, 43) if facing == 2 else (45, 18)
        box(d, (31, cart_y, 64, cart_y + 24), 'brick2')
        box(d, (34, cart_y + 2, 61, cart_y + 20), 'brick')
        box(d, (30, cart_y, 65, cart_y + 3), 'cream')
        for x in (29, 62): box(d, (x, cart_y + 9, x + 4, cart_y + 21), 'ink')
        ellipse(d, (40, bird_y, 56, bird_y + 13), 'cream')
        box(d, (46, bird_y - 12, 50, bird_y + 1), 'mud')
        ellipse(d, (44, bird_y - 16, 53, bird_y - 9), 'cream')
        for x, shift in [(43, step % 2 * 3), (53, (step + 1) % 2 * 3)]:
            line(d, [(x, bird_y + 12), (x, bird_y + 20 + shift)], 'mud', 2)
        line(d, [(38, bird_y + 8), (59, bird_y + 8)], 'brick', 2)
    poses.append(im)
atlas(poses, 'tram-walk', 4)
print('Built additional art: 8 homes, 12 props, 34 bank/cliff/glint masks, 16 tram poses.')

# Additional notebook art is authored here, rather than changing any accepted plate.
import json
ROOT = OUT.parent.parent
kept_path = ROOT / 'src/ui/art-kept.json'
kept = json.loads(kept_path.read_text())
def illustration(folder, name, im, size):
    target = ROOT / 'src/ui' / folder / (name + '.png')
    im.resize(size, Image.Resampling.NEAREST).save(target, optimize=True)
    key = folder + '/' + name + '.png'
    if key not in kept['kept']: kept['kept'].append(key)

for i, name in enumerate(['reedwright-irekha', 'cove-watcher-ulenna']):
    im = canvas(64, 64); d = ImageDraw.Draw(im)
    box(d, (0, 0, 63, 63), 'cream'); ellipse(d, (7, 4, 58, 64), 'sand2')
    box(d, (18, 15, 45, 40), 'mud2'); box(d, (21, 17, 42, 41), 'mud')
    box(d, (17, 10, 46, 20), 'ink'); box(d, (16, 13, 47, 16), 'light')
    box(d, (24, 25, 26, 26), 'ink'); box(d, (37, 25, 39, 26), 'ink')
    line(d, [(31, 28), (30, 33), (33, 33)], 'mud2'); line(d, [(27, 37), (36, 37)], 'mud2')
    poly(d, [(18, 44), (27, 42), (36, 42), (46, 45), (51, 64), (13, 64)], 'brick' if i == 0 else 'green')
    line(d, [(27, 44), (32, 49), (36, 44)], 'cream', 2)
    if i == 0:
        for x in (50, 53, 56): line(d, [(x, 63), (x - 3, 42)], 'light')
    else:
        box(d, (50, 36, 52, 63), 'mud2'); box(d, (47, 35, 55, 37), 'cream')
    illustration('portraits', name, im, (256, 256))

def view(kind):
    im = canvas(256, 192); d = ImageDraw.Draw(im)
    box(d, (0, 0, 255, 191), 'sand'); box(d, (0, 0, 255, 48), 'cream')
    if kind != 'dune':
        poly(d, [(0, 100), (96, 88), (158, 107), (255, 83), (255, 191), (0, 191)], 'water')
        for x in range(8, 250, 29): line(d, [(x, 150), (x + 12, 150)], 'light')
    if kind == 'dune':
        for x, y in [(6, 55), (69, 40), (174, 61), (23, 113), (179, 116)]: im.alpha_composite(props[0], (x, y))
        im.alpha_composite(props[11], (94, 75))
    elif kind == 'reed':
        for x, y in [(9, 54), (63, 65), (194, 47)]: im.alpha_composite(props[4], (x, y))
        im.alpha_composite(props[10], (120, 60))
    else:
        for x, y in [(7, 45), (104, 59), (191, 42)]: im.alpha_composite(props[9], (x, y))
        im.alpha_composite(props[1], (45, 61)); im.alpha_composite(props[4], (168, 84))
    return im

for key, kind in [('poi_dune_windbreak','dune'),('poi_reedwright_bank','reed'),('poi_nesting_cove','nest')]:
    illustration('places', key, view(kind), (512,384))
for key, kind in [('windbreak','dune'),('seam','reed'),('tide_room','nest'),('reed_return','reed'),('bird_return','nest'),('courtyard_return','dune')]:
    im = view(kind)
    if key == 'courtyard_return':
        d = ImageDraw.Draw(im); box(d, (0, 49, 255, 191), 'mud')
        for x in (15, 85, 197): im.alpha_composite(homes[0], (x, 65))
        im.alpha_composite(props[3], (113, 52)); im.alpha_composite(props[5], (122, 105))
    illustration('events', 'happening_valley_' + key, im, (512,384))
kept_path.write_text(json.dumps(kept,ensure_ascii=False,indent=2)+'\n')
print('Built two portraits, three place views and six event plates for the expansion.')
