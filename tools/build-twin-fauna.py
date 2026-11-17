"""Reviewed NES JRPG animal/transport sources; Beedu retains its accepted SNES art.

Default rebuild changes animals/tram only. Pass --beedu explicitly to rebuild Beedu too.
No palette/alpha quantization: source RGBA pixels are copied and enlarged by nearest neighbour.
"""
import json
import sys
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent

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


def build():
    manifest=json.loads((ROOT/'tools/twin-fauna.json').read_text())
    for entry in manifest['animals']:
        source=Image.open(ROOT/entry['source']).convert('RGBA')
        if source.size!=(64,64):raise ValueError(f"{entry['id']}: expected a 2x2 atlas of 32px cells")
        for index,facing in enumerate(manifest['directionOrder']):
            x=(index%2)*32;y=(index//2)*32
            source.crop((x,y,x+32,y+32)).resize((128,128),Image.Resampling.NEAREST).save(
                ROOT/'assets/wanderers'/f"{entry['id']}-{facing}.png",optimize=True)
    source=Image.open(ROOT/manifest['tram']['source']).convert('RGBA')
    if source.size!=(192,160):raise ValueError('Tram: expected a 4x4 atlas of 48x40 cells')
    source.resize((768,640),Image.Resampling.NEAREST).save(ROOT/'assets/twins/tram-walk.png',optimize=True)
    still=Image.new('RGBA',(768,160))
    for facing in range(4):
        sprite=source.crop((0,facing*40,48,facing*40+40)).resize((192,160),Image.Resampling.NEAREST)
        still.paste(sprite,(facing*192,0))
    still.save(ROOT/'assets/twins/tram.png',optimize=True)
    if '--beedu' in sys.argv:
        atlas=Image.new('RGBA',(384,256))
        for facing in range(4):
            for pose in range(4):
                atlas.paste(beedu(facing,pose).resize((96,64),Image.Resampling.NEAREST),(pose*96,facing*64))
        atlas.save(ROOT/'assets/twins/beedu-nes.png',optimize=True)
    print('Built reviewed NES JRPG wildlife and ostrich tram; Beedu unchanged unless --beedu requested.')


if __name__=='__main__':build()
