"""Import reviewed grid sheets with cropping and nearest-neighbour resize only."""
import argparse
from pathlib import Path
from PIL import Image


def bands(values):
    found=[];start=None
    for i,on in enumerate([*values,False]):
        if on and start is None:start=i
        elif not on and start is not None:found.append((start,i));start=None
    return found


def import_sheet(source,destination,columns,rows,width,height,row_order=None):
    im=Image.open(source).convert('RGBA');alpha=im.getchannel('A')
    found=[b for b in bands([alpha.crop((0,y,im.width,y+1)).getextrema()[1]>=128
                            for y in range(im.height)]) if b[1]-b[0]>20]
    if len(found)!=rows:raise ValueError(f'Expected {rows} separated rows, got {found}')
    boxes=[]
    for top,bottom in found:
        for column in range(columns):
            left=round(column*im.width/columns);right=round((column+1)*im.width/columns)
            mask=alpha.crop((left,top,right,bottom)).point(lambda a:255 if a>=128 else 0)
            bounds=mask.getbbox()
            if bounds is None:raise ValueError('Empty sprite cell')
            x0,y0,x1,y1=bounds;boxes.append((left+x0,top+y0,left+x1,top+y1))
    # One scale across views/steps: no per-frame growth and no changed colour samples.
    scale=min((width-2)/max(b[2]-b[0] for b in boxes),
              (height-2)/max(b[3]-b[1] for b in boxes))
    out=Image.new('RGBA',(width*columns,height*rows))
    for index,box in enumerate(boxes):
        sprite=im.crop(box)
        sprite=sprite.resize((max(1,round(sprite.width*scale)),max(1,round(sprite.height*scale))),
                             Image.Resampling.NEAREST)
        row=index//columns
        target_row=row_order[row] if row_order else row
        out.paste(sprite,((index%columns)*width+(width-sprite.width)//2,
                          target_row*height+height-1-sprite.height))
    Path(destination).parent.mkdir(parents=True,exist_ok=True)
    out.save(destination,optimize=True)
    print(f'Imported {columns*rows} poses to {destination}; RGBA retained, no quantization')


if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('source');p.add_argument('destination')
    p.add_argument('--tram',action='store_true');a=p.parse_args()
    import_sheet(a.source,a.destination,4 if a.tram else 2,4 if a.tram else 2,
                 48 if a.tram else 32,40 if a.tram else 32,
                 [0,1,3,2] if a.tram else None)
