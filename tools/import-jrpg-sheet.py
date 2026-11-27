"""Crop and point-resize a reviewed 4x5 sheet; never quantize colours or alpha.

The compact RGBA source is tracked, the large original and review captures stay ignored.
Rows: south, north, east, west walking poses, then four seated directions.
"""
import argparse
from pathlib import Path
from PIL import Image


def runs(values):
    out=[];start=None
    for i,on in enumerate([*values,False]):
        if on and start is None:start=i
        elif not on and start is not None:out.append((start,i));start=None
    return out


def import_sheet(source, destination, width, standing_height=None):
    im=Image.open(source).convert('RGBA')
    alpha=im.getchannel('A')
    # Alpha is used to locate the artwork only; output samples retain their original RGBA.
    rows=[r for r in runs([alpha.crop((0,y,im.width,y+1)).getextrema()[1]>=128
                          for y in range(im.height)]) if r[1]-r[0]>20]
    if len(rows)!=5:raise ValueError(f'Expected five separated rows, got {rows}')
    boxes=[]
    for y0,y1 in rows:
        for col in range(4):
            left=round(col*im.width/4);right=round((col+1)*im.width/4)
            region=alpha.crop((left,y0,right,y1))
            bounds=region.point(lambda a:255 if a>=128 else 0).getbbox()
            if bounds is None:raise ValueError('Empty sprite cell')
            x0,top,x1,bottom=bounds
            boxes.append((left+x0,y0+top,left+x1,y0+bottom))
    # One scale for every pose avoids breathing/stride frames changing body size.
    scale=min((width-2)/max(b[2]-b[0] for b in boxes),
              (standing_height or 38)/max(b[3]-b[1] for b in boxes[:16]))
    compact=Image.new('RGBA',(width*4,40*5))
    for index,box in enumerate(boxes):
        sprite=im.crop(box)
        pose_scale = min((width-2)/sprite.width, standing_height/sprite.height) if standing_height and index < 16 else scale
        sprite=sprite.resize((max(1,round(sprite.width*pose_scale)),max(1,round(sprite.height*pose_scale))),
                             Image.Resampling.NEAREST)
        if sprite.height>40:raise ValueError('Seated pose exceeds cell height')
        x=(index%4)*width+(width-sprite.width)//2;y=(index//4)*40+39-sprite.height
        compact.paste(sprite,(x,y))
    Path(destination).parent.mkdir(parents=True,exist_ok=True)
    compact.save(destination,optimize=True)
    print(f'{source}: 20 frames -> {destination}; RGBA samples preserved, no colour reduction')


if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('source');parser.add_argument('destination')
    parser.add_argument('--width',type=int,default=26)
    parser.add_argument('--standing-height',type=int,choices=range(1,40))
    args=parser.parse_args()
    import_sheet(args.source,args.destination,args.width,args.standing_height)
