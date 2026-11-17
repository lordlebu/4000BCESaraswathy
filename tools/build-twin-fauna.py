"""Small outlined valley animals; Beedu alone uses a finer 48x32 SNES grid.

Reproducible source artwork. No changes to movement, hit areas, or runtime atlas sizes.
"""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
INK = '#382a25'
CREAM = '#f3dba9'
LIGHT = '#fff0ce'
TAN = '#c28c50'
RUST = '#ad683d'
BROWN = '#866044'


def animal(kind, facing):
    im = Image.new('RGBA', (32, 32))
    d = ImageDraw.Draw(im)
    bird = kind in ('monsoon-crane', 'tethys-pelican')
    fox = kind == 'desert-fox'
    coat = CREAM if bird else TAN if fox else BROWN
    side = facing in ('right', 'left')
    back = facing == 'up'

    def oval(b, c, edge=INK):
        d.ellipse(b, fill=c, outline=edge)

    def poly(points, c):
        d.polygon(points, fill=c, outline=INK)

    def eye(x, y):
        d.rectangle((x, y, x+1, y+2), fill=INK)
        d.point((x, y), fill=LIGHT)

    if not bird:
        if side:
            # A sweeping tail and large ears distinguish the fox from the round otter.
            poly([(12,22),(5,14),(1,13),(2,21),(6,25),(13,26)], TAN if fox else BROWN)
            if fox: d.polygon([(1,13),(5,14),(5,19),(2,18)], fill=CREAM)
            oval((7,16,25,28), coat)
            for x in (11,20): oval((x,25,x+4,30), BROWN)
            oval((17,9,30,24), coat)
            if fox:
                poly([(17,14),(18,3),(23,10)], TAN)
                poly([(24,11),(29,4),(30,16)], TAN)
                d.line([(19,7),(20,11)], fill=RUST)
                d.line([(28,8),(27,12)], fill=RUST)
            else:
                oval((17,8,22,13), BROWN); oval((25,8,30,13), BROWN)
            oval((23,17,31,23), CREAM)
            eye(26,14); d.rectangle((30,18,31,19), fill=INK)
            d.arc((24,18,29,21), 10,150, fill=BROWN)
            d.line([(10,19),(15,18),(18,19)], fill=CREAM if fox else TAN)
        else:
            oval((8,17,25,29), coat)
            oval((8,26,14,30), BROWN); oval((20,26,26,30), BROWN)
            oval((6,6,27,25), coat)
            if fox:
                poly([(7,14),(7,2),(15,8)], TAN);poly([(19,8),(26,2),(27,14)], TAN)
                d.line([(9,6),(10,10)], fill=RUST);d.line([(24,6),(23,10)], fill=RUST)
            else:
                oval((5,7,12,14), BROWN);oval((22,7,29,14), BROWN)
            if not back:
                oval((10,15,24,24), CREAM)
                eye(11,12);eye(22,12)
                d.rectangle((16,17,18,18), fill=INK)
                d.line([(17,19),(17,21),(15,21)], fill=BROWN)
            else:
                d.arc((10,9,23,21), 205,315, fill=TAN if not fox else CREAM)
                oval((14,23,20,29), CREAM if fox else BROWN)
    else:
        for x in ((12,21) if side else (12,21)):
            d.line([(x,22),(x,29),(x+3,29)], fill=INK, width=2)
            d.line([(x,24),(x,28)], fill=TAN)
        oval((5 if side else 7,15,25,25), CREAM)
        oval((8 if side else 10,17,21,23), '#b2aaa0')
        if side:
            d.rounded_rectangle((21,9,25,20), radius=2, fill=CREAM, outline=INK)
            oval((17,3,29,14), CREAM)
            poly([(27,9),(31,10),(27,12)], TAN)
            if kind=='tethys-pelican':
                poly([(24,12),(31,11),(27,18),(23,15)], '#ddb877')
            else: d.rectangle((20,3,24,4), fill=RUST)
            eye(24,7)
        else:
            d.rounded_rectangle((13,11,20,21), radius=2, fill=CREAM, outline=INK)
            oval((9,3,25,16), CREAM)
            if kind=='monsoon-crane':d.rectangle((14,3,20,4), fill=RUST)
            if not back:
                eye(12,8);eye(21,8)
                poly([(15,11),(19,11),(17,17 if kind=='tethys-pelican' else 14)], TAN)
            else: d.arc((12,5,22,14), 205,315,fill='#b2aaa0')
    if facing=='left': im=im.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    return im


def beedu(facing, pose):
    im=Image.new('RGBA',(48,32));d=ImageDraw.Draw(im)
    edge='#35353d';dark='#6c797b';mid='#9eaba2';light='#d1d9b8';rim='#eef0cd'
    lift=[0,-2,2,3][pose]
    if facing<2:
        # One continuous rounded diamond: lobed cephalic fins, curved wings and a whip tail.
        d.line([(24,18),(24,25),(26,29),(25,31)], fill=edge, width=2)
        d.line([(24,20),(25,26),(27,29)],fill=dark)
        wings=[(24,7),(20,8),(16,11),(9,10+lift),(2,8+lift),(5,17),
               (12,22),(20,22),(24,25),(28,22),(36,22),(43,17),(46,8+lift),
               (39,10+lift),(32,11),(28,8)]
        d.polygon(wings,fill=dark,outline=edge)
        d.polygon([(24,8),(18,12),(7,12+lift),(12,18),(22,20),(24,23),
                   (26,20),(36,18),(41,12+lift),(30,12)],fill=mid)
        d.polygon([(24,9),(20,13),(12,13),(18,17),(24,20),(30,17),(36,13),(28,13)],fill=light)
        d.line([(6,11+lift),(12,13+lift),(17,13)],fill=rim)
        d.line([(31,13),(36,13+lift),(42,11+lift)],fill=rim)
        d.rounded_rectangle((21,6,27,17),radius=3,fill=light,outline=dark)
        d.line([(21,9),(20,5),(22,4)],fill=edge,width=2)
        d.line([(27,9),(28,5),(26,4)],fill=edge,width=2)
        if facing==0:
            d.point((21,10),fill=edge);d.point((27,10),fill=edge)
        else:
            d.line([(24,9),(24,18)],fill=mid)
        if facing==0:im=im.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
    else:
        d.line([(23,17),(12,19),(4,19),(1,17)],fill=edge,width=2)
        d.line([(5,19),(13,20),(22,18)],fill=dark)
        d.polygon([(18,16),(24,12),(34,12),(41,15),(45,15),(44,18),(35,21),(23,20)],fill=mid,outline=edge)
        d.polygon([(24,15),(28,4+lift),(32,3+lift),(34,15)],fill=mid,outline=edge)
        d.polygon([(27,14),(30,6+lift),(32,7+lift),(32,16)],fill=light)
        d.polygon([(26,19),(32,26-lift),(36,25-lift),(35,19)],fill=dark,outline=edge)
        d.line([(24,17),(34,16),(41,17)],fill=rim)
        d.point((40,15),fill=edge);d.line([(42,14),(44,12)],fill=edge)
        if facing==3:im=im.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    return im


def tram(facing, pose):
    im=Image.new('RGBA',(48,40));d=ImageDraw.Draw(im)
    step=[0,1,0,-1][pose]
    def oval(b,c):d.ellipse(b,fill=c,outline=INK)
    if facing<2:
        # Long legs still identify an ostrich; the fluffy body and bright eye soften it.
        for x,phase in [(34,step),(40,-step)]:
            d.line([(x,24),(x+phase,30),(x-phase,35),(x-phase+3,35)],fill=INK,width=2)
            d.line([(x,25),(x+phase,30)],fill=TAN)
        d.line([(22,26),(34,25)],fill=BROWN,width=2)
        oval((29,17,43,28),CREAM)
        oval((30,19,39,26),'#62534a')
        d.line([(39,19),(40,10)],fill=INK,width=4)
        d.line([(40,18),(41,11)],fill=CREAM,width=2)
        oval((37,5,45,13),CREAM)
        d.polygon([(44,9),(47,10),(44,11)],fill=TAN)
        d.rectangle((42,8,43,10),fill=INK);d.point((42,8),fill=LIGHT)
        d.line([(38,5),(40,3),(42,5)],fill=BROWN)
        d.line([(31,24),(42,23)],fill=RUST,width=2)
        d.rounded_rectangle((3,17,24,32),radius=2,fill=RUST,outline=INK)
        d.rectangle((5,19,22,30),fill=TAN)
        for x in (7,16):
            d.rounded_rectangle((x,20,x+4,25),radius=1,fill='#648a88',outline=BROWN)
        d.rounded_rectangle((2,14,25,18),radius=2,fill=CREAM,outline=INK)
        d.line([(5,15),(22,15)],fill=LIGHT)
        for x in (7,19):
            oval((x-2,30,x+3,36),BROWN);d.point((x,33),fill=CREAM)
        if facing==1:im=im.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    else:
        for x in (21,26):
            d.line([(x,21),(x+step,27),(x+step+2,27)],fill=INK,width=2)
        oval((17,14,30,24),CREAM)
        d.line([(24,16),(24,10)],fill=INK,width=4)
        d.line([(24,16),(24,10)],fill=CREAM,width=2)
        oval((19,4,29,13),CREAM)
        if facing==2:
            for x in (21,26):d.rectangle((x,7,x+1,9),fill=INK);d.point((x,7),fill=LIGHT)
            d.polygon([(23,10),(26,10),(24,13)],fill=TAN)
        else:d.arc((21,6,27,11),190,350,fill=TAN)
        d.line([(21,4),(24,2),(27,4)],fill=BROWN)
        d.line([(18,20),(29,20)],fill=RUST)
        d.line([(24,25),(24,29)],fill=BROWN,width=2)
        d.rounded_rectangle((13,28,34,37),radius=2,fill=RUST,outline=INK)
        d.rounded_rectangle((12,26,35,30),radius=2,fill=CREAM,outline=INK)
        d.rectangle((16,31,20,34),fill='#648a88');d.rectangle((27,31,31,34),fill='#648a88')
        for x in (13,32):d.rectangle((x,34,x+2,39),fill=INK)
    return im


def build():
    for kind in ('desert-fox','river-otter','monsoon-crane','tethys-pelican'):
        for facing in ('right','left','down','up'):
            animal(kind,facing).resize((128,128),Image.Resampling.NEAREST).save(
                ROOT/'assets/wanderers'/f'{kind}-{facing}.png',optimize=True)
    atlas=Image.new('RGBA',(384,256))
    for facing in range(4):
        for pose in range(4):
            atlas.paste(beedu(facing,pose).resize((96,64),Image.Resampling.NEAREST),(pose*96,facing*64))
    atlas.save(ROOT/'assets/twins/beedu-nes.png',optimize=True)
    transport=Image.new('RGBA',(768,640))
    for facing in range(4):
        for pose in range(4):
            transport.paste(tram(facing,pose).resize((192,160),Image.Resampling.NEAREST),
                            (pose*192,facing*160))
    transport.save(ROOT/'assets/twins/tram-walk.png',optimize=True)
    still=Image.new('RGBA',(768,160))
    for facing in range(4):
        still.paste(tram(facing,0).resize((192,160),Image.Resampling.NEAREST),(facing*192,0))
    still.save(ROOT/'assets/twins/tram.png',optimize=True)
    print('Built cute animal views, compact SNES Beedu poses and the ostrich tram.')


if __name__=='__main__': build()
