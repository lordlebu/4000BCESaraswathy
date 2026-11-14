"""Original SNES-inspired pixel drawings with stepped colour ramps and crisp pixels.

This file is the reproducible art source. No accepted artwork is edited or replaced.
Run python tools/build-twins.py. Pillow is a build dependency, never shipped.
"""
from pathlib import Path
from PIL import Image, ImageDraw

OUT=Path(__file__).resolve().parent.parent/'assets'/'twins'
OUT.mkdir(exist_ok=True)
P={'ink':'#403c39','sand':'#d9bd79','sand2':'#c6a263','light':'#ead59d','hill':'#9b8865',
   'grass':'#8c9b59','green':'#52774e','leaf':'#71935a','water':'#58939d','deep':'#3e707f',
   'mud':'#bb8c57','mud2':'#9d704d','brick':'#b56e50','brick2':'#8f5346','cream':'#e2c79a'}
def canvas(w=32,h=32):return Image.new('RGBA',(w,h))
def rect(d,box,c):d.rectangle(box,fill=P.get(c,c))
def finish(im,ground=False):
    # Work on a two-pixel grid in the final asset. Three light levels plus the
    # base colour make plaster, brick and foliage read as volumes at SNES scale.
    im=im.resize((im.width*2,im.height*2),Image.Resampling.NEAREST)
    src=im.copy();p=src.load();q=im.load()
    for y in range(im.height):
      for x in range(im.width):
        r,g,b,a=p[x,y]
        if not a:continue
        top=p[x,y-1] if y else (0,0,0,0)
        left=p[x-1,y] if x else (0,0,0,0)
        bottom=p[x,y+1] if y+1<im.height else (0,0,0,0)
        right=p[x+1,y] if x+1<im.width else (0,0,0,0)
        delta=0
        if not ground:
          if not top[3] or not left[3]:delta=18
          elif not bottom[3] or not right[3]:delta=-22
          elif top[:3]!=(r,g,b):delta=10
          elif right[:3]!=(r,g,b):delta=-12
        # Sparse, ordered clusters, never random grain; ground borders stay uniform.
        interior=3<x<im.width-4 and 3<y<im.height-4
        if delta==0 and interior and (x//4+y//4)%5==0:
          delta=5 if (x+y)%4==0 else -3 if (x+y)%4==2 else 0
        q[x,y]=(max(0,min(255,r+delta)),max(0,min(255,g+delta)),max(0,min(255,b+delta)),a)
    return im
def sheet(frames,w,h,name,cols=8):
    out=canvas(cols*w*2,((len(frames)+cols-1)//cols)*h*2)
    for i,f in enumerate(frames):out.paste(finish(f,name=='ground'),((i%cols)*w*2,(i//cols)*h*2))
    out=out.resize((out.width*2,out.height*2),Image.Resampling.NEAREST)
    out.save(OUT/(name+'.png'),optimize=True)

# Ground frame order is kept in twinArt.ts. All variant borders use the same base.
grounds=[]
for kind in range(12):
 for v in range(4):
    im=canvas();d=ImageDraw.Draw(im)
    c=['sand','hill','grass','water','green','light','deep','mud','brick','sand2','water','sand'][kind]
    rect(d,(0,0,31,31),c)
    for n in range(12):
      x=3+(n*11+v*3)%25;y=3+(n*7+v*5)%25
      if kind in (3,6,10):rect(d,(x,y,min(x+4,29),y),'cream' if n%5==0 else 'water')
      elif kind in (7,8):
        if n%3==0:rect(d,(x,y,min(x+2,29),y),'mud2' if kind==7 else 'brick2')
      elif kind in (2,4):rect(d,(x,y,x,y+1),'leaf')
      else:rect(d,(x,y,x+1,y),'sand2' if kind!=1 else 'ink')
    grounds.append(im)
sheet(grounds,32,32,'ground')

objects=[]
for i in range(72):
 im=canvas(32,40);d=ImageDraw.Draw(im)
 if i<10:
    brick=4<=i<8 or i==9;c='brick' if brick else 'mud';dark='brick2' if brick else 'mud2'
    left=3+i%2;right=28-i%3;top=10+i%3*2
    rect(d,(left,top+3,right,35),'ink');rect(d,(left+1,top+2,right-1,33),c)
    rect(d,(left,top,right,top+5),'cream');rect(d,(left+2,top+2,right-2,top+4),dark)
    rect(d,(13,25,18,35),'ink');rect(d,(5,22,8,25),dark);rect(d,(23,22,26,25),dark)
    if brick:
      for yy in range(top+8,33,4):
       for xx in range(left+2+(yy%8),right-2,7):rect(d,(xx,yy,xx+4,yy),dark)
      rect(d,(1,36,30,37),'brick2');rect(d,(5,34,27,35),'cream')
    elif i%2==0:
      rect(d,(7,top+6,23,23),dark);rect(d,(10,top+8,20,22),'sand');rect(d,(12,16,18,21),'green')
    if i>=8:
      rect(d,(10,4,24,19),(0,0,0,0));rect(d,(19,22,24,30),'leaf')
 elif i in (10,11):
    rect(d,(15,15,17,36),'mud2')
    if i==10:
      for x,y in [(2,10),(9,5),(17,5),(23,10)]:rect(d,(x,y,x+7,y+5),'green')
      rect(d,(14,11,19,19),'leaf')
    else:
      rect(d,(5,10,26,19),'green');rect(d,(8,7,23,22),'leaf');rect(d,(3,14,28,18),'green')
 elif i==12:
    for x in (6,12,19,25):rect(d,(x,21,x+1,36),'green');rect(d,(x,17,x+2,23),'mud2')
 elif i==13:
    rect(d,(7,28,25,36),'hill');rect(d,(10,25,21,30),'cream');rect(d,(7,35,25,36),'ink')
 elif i==14:
    for j in range(7):rect(d,(2+j*2,22-j,30-j,23-j),'sand2' if j%2==0 else 'light')
 elif i==15:
    rect(d,(4,25,28,35),'mud2')
    for y in (26,29,32):
      for x in (6,11,16,21,26):rect(d,(x,y,x+1,y+1),'leaf')
 elif i in (16,17):
    rect(d,(2,28,30,37),'brick' if i==17 else 'mud');rect(d,(2,26,30,28),'cream')
    rect(d,(5,12,6,27),'ink');rect(d,(25,12,26,27),'ink');rect(d,(3,10,28,14),'green')
 elif i==18:
    rect(d,(2,27,29,36),'hill');rect(d,(7,29,12,37),'deep');rect(d,(19,29,24,37),'deep');rect(d,(1,25,30,27),'cream')
 elif i==19: # wet drain, intentionally modest footprint
    rect(d,(2,28,29,34),'brick2');rect(d,(2,29,29,32),'water');rect(d,(3,27,28,28),'cream')
 elif i in (20,21):
    rect(d,(4,26,28,35),'mud');rect(d,(6,27,26,32),'cream')
    if i==21:rect(d,(7,24,25,27),'leaf')
 elif i==22:
    rect(d,(3,26,28,34),'brick2');rect(d,(5,27,26,32),'leaf')
 elif i==23:
    rect(d,(7,20,24,35),'mud');rect(d,(5,18,26,21),'cream');rect(d,(11,23,20,34),'ink')
 else:
    natural=i>=56;mask=(i-56 if natural else (i-24)%16)
    brick=40<=i<56
    wall='hill' if natural else 'brick' if brick else 'mud'
    dark='ink' if natural else 'brick2' if brick else 'mud2'
    # The wall follows the cell's edges; a house remains clear in the centre.
    for bit,box in [(1,(0,6,31,11)),(2,(28,7,31,38)),(4,(0,33,31,38)),(8,(0,7,3,38))]:
      if not mask&bit:continue
      rect(d,box,dark)
      x0,y0,x1,y1=box
      rect(d,(x0,y0,x1,max(y0,y1-2)),wall)
      rect(d,(x0,y0,x1,y0),'cream' if not natural else 'light')
      if bit in (1,4):
        for x in range(3,31,7):rect(d,(x,y0+2,x,y1),dark)
      elif not natural:
        for y in range(y0+4,y1,6):rect(d,(x0,y,x1,y),dark)
 objects.append(im)
sheet(objects,32,40,'objects')
# Same 80x88 frame contract as Lothal and Dwarka's huts, with no runtime resampling.
# Retain the roofline, courtyard and fired-brick shapes of the accepted first draft.
houses=[im.crop((1,7,31,38)).resize((20,22),Image.Resampling.NEAREST) for im in objects[:10]]
sheet(houses,20,22,'houses')

# Sixteen neighbour masks each for road and railway, plus a clear stone bridge deck.
overlays=[]
for rail in (False,True):
 for mask in range(16):
    im=canvas();d=ImageDraw.Draw(im)
    width=5 if rail else 8
    rect(d,(16-width,16-width,16+width,16+width),'sand2' if rail else 'light')
    for bit,box in [(1,(16-width,0,16+width,16)),(2,(16,16-width,31,16+width)),(4,(16-width,16,16+width,31)),(8,(0,16-width,16,16+width))]:
      if mask&bit:rect(d,box,'sand2' if rail else 'light')
    if rail:
      for n in range(2,32,5):
        if mask&5:rect(d,(11,n,21,n+1),'mud2')
        if mask&10:rect(d,(n,11,n+1,21),'mud2')
      if mask&5:rect(d,(13,0,13,31),'ink');rect(d,(19,0,19,31),'ink')
      if mask&10:rect(d,(0,13,31,13),'ink');rect(d,(0,19,31,19),'ink')
    overlays.append(im)
sheet(overlays,32,32,'routes')

# Four directions: carriage and harnessed ostrich are one registered transport image.
trams=[]
for direction in range(4):
 im=canvas(48,40);d=ImageDraw.Draw(im)
 rect(d,(4,17,25,31),'ink');rect(d,(5,15,24,28),'brick');rect(d,(5,13,24,17),'cream')
 for x in (8,19):rect(d,(x,19,x+2,24),'deep');rect(d,(x,30,x+3,33),'ink')
 rect(d,(25,23,33,24),'mud2');rect(d,(32,15,42,24),'ink');rect(d,(33,14,41,19),'cream')
 rect(d,(40,7,42,18),'mud');rect(d,(39,5,44,9),'cream');rect(d,(44,7,47,8),'mud2')
 rect(d,(34,24,35,32),'mud');rect(d,(39,24,40,32),'mud');rect(d,(34,32,37,33),'ink');rect(d,(39,32,42,33),'ink')
 rect(d,(32,21,41,22),'brick')
 if direction==1:im=im.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
 if direction in (2,3):
   im=im.rotate(90 if direction==2 else -90,expand=True,resample=Image.Resampling.NEAREST).resize((48,40),Image.Resampling.NEAREST)
 trams.append(im)
sheet(trams,48,40,'tram',4)
print('Built twins: 48 terrain frames, 10 hut-scale houses, 72 objects, 32 route pieces, four tram views.')

# Species-specific map silhouettes; never let the generic whale-like stand-in
# imply that a fox or a coastal bird is a large fish walking through the desert.
wildlife=OUT.parent/'wanderers'
for animal in ('desert-fox','river-otter','monsoon-crane','tethys-pelican'):
 for facing in ('right','left','down','up'):
    im=canvas(32,32);d=ImageDraw.Draw(im)
    bird=animal in ('monsoon-crane','tethys-pelican')
    if facing in ('right','left'):
      if not bird:
        c='mud' if animal=='desert-fox' else 'mud2'
        d.ellipse((7,13,24,23),fill=P[c]);d.ellipse((21,10,29,19),fill=P[c])
        d.polygon([(8,17),(1,10),(2,20),(11,23)],fill=P[c])
        rect(d,(0,10,3,14),'cream' if animal=='desert-fox' else c)
        for x in (10,20):rect(d,(x,21,x+2,27),'ink')
        if animal=='desert-fox':
          d.polygon([(22,12),(23,5),(26,12)],fill=P[c]);d.polygon([(26,12),(29,6),(29,15)],fill=P[c])
        else:rect(d,(21,10,23,12),'mud')
        rect(d,(27,13,28,14),'ink');rect(d,(29,16,31,17),'ink');rect(d,(15,15,21,18),'sand2')
      else:
        d.ellipse((6,12,24,23),fill=P['cream']);d.ellipse((8,14,20,20),fill=P['hill'])
        rect(d,(23,6,25,18),'cream');rect(d,(22,4,27,8),'cream')
        rect(d,(26,6,31,7),'mud');rect(d,(25,5,25,5),'ink')
        if animal=='tethys-pelican':d.polygon([(26,8),(31,8),(27,13)],fill=P['sand2'])
        else:rect(d,(23,3,25,4),'brick')
        for x in (12,20):rect(d,(x,22,x,29),'mud2');rect(d,(x,29,x+3,29),'mud2')
      if facing=='left':im=im.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    else:
      c='cream' if bird else 'mud' if animal=='desert-fox' else 'mud2'
      d.ellipse((10,11,22,25),fill=P[c]);d.ellipse((12,6,20,15),fill=P[c])
      rect(d,(11,24,13,29),'mud2');rect(d,(19,24,21,29),'mud2')
      if facing=='down':
        rect(d,(13,9,13,10),'ink');rect(d,(19,9,19,10),'ink')
        rect(d,(15,12,17,16),'mud2' if bird else 'ink')
      else:rect(d,(14,8,18,11),'hill' if bird else 'sand2')
      if animal=='desert-fox':
        d.polygon([(11,8),(12,2),(15,8)],fill=P[c]);d.polygon([(18,8),(21,2),(21,9)],fill=P[c])
    finish(im).resize((128,128),Image.Resampling.NEAREST).save(wildlife/(animal+'-'+facing+'.png'),optimize=True)

# Notebook illustrations are built from the same original drawings, with exact lookup names.
# This avoids the old generic place painting implying the wrong city's architecture.
import json
ROOT=OUT.parent.parent
places=json.loads((ROOT/'data/canon/places.json').read_text())
kept_path=ROOT/'src/ui/art-kept.json'
kept=json.loads(kept_path.read_text())
def illustration(folder,name,image,size):
    target=ROOT/'src/ui'/folder/(name+'.png')
    finish(image).resize(size,Image.Resampling.NEAREST).save(target,optimize=True)
    key=folder+'/'+name+'.png'
    if key not in kept['kept']:kept['kept'].append(key)

for n,npc in enumerate(p for p in places['npcs'] if p['id'].startswith('npc_twin_')):
    im=canvas();d=ImageDraw.Draw(im)
    rect(d,(0,0,31,31),'cream');rect(d,(9,7,22,20),'mud');rect(d,(8,5,23,10),'ink')
    rect(d,(7,22,25,31),'green' if n%2 else 'brick');rect(d,(12,13,13,14),'ink');rect(d,(19,13,20,14),'ink')
    rect(d,(13,18,18,18),'mud2');rect(d,(7,6,24,8),'light' if n%2 else 'water')
    # Trade mark: carried tool, with a distinct handle/head arrangement per role.
    rect(d,(26,18,27,31),'ink');rect(d,(24,18+n%3,30,20+n%3),'hill' if n%2 else 'mud2')
    illustration('portraits',npc['id'][4:].replace('_','-'),im,(256,256))

city_pois=[p for p in places['points_of_interest'] if p['field_map']=='field_map_twins']
for n,poi in enumerate(city_pois):
    im=canvas(128,96);d=ImageDraw.Draw(im)
    rect(d,(0,0,127,95),'sand');rect(d,(0,0,127,25),'cream')
    river=poi['id'] in ('poi_reed_junction','poi_twin_cove','poi_twin_landing','poi_twin_causeway','poi_drain_court')
    if river:
      rect(d,(64,25,90,95),'water');rect(d,(67,30,69,93),'deep')
    for x,y in [(4,36),(32,27),(93,35),(13,63),(90,66)]:
      brick=poi['id'] in ('poi_brick_quarter','poi_drain_court','poi_planted_ruins','poi_twin_landing')
      frame=12 if river and x>60 else (4+n%4 if brick else n%4)
      im.alpha_composite(objects[frame],(x,y))
    if poi['id']=='poi_desert_ground':
      rect(d,(0,26,127,95),'sand')
      for x,y in [(4,36),(32,27),(93,35),(13,55),(90,56)]:im.alpha_composite(objects[14],(x,y))
    illustration('places',poi['id'],im,(512,384))
for route in ('journey-aravali-twins','journey-lothal-twins'):
    im=canvas(128,96);d=ImageDraw.Draw(im);rect(d,(0,0,127,95),'sand');rect(d,(68,0,93,95),'water');
    im.alpha_composite(objects[0],(10,12));im.alpha_composite(objects[4],(94,46));im.alpha_composite(trams[0],(27,50));
    illustration('events',route,im,(512,384))
for n,event in enumerate(h for h in places['happenings'] if h['id'].startswith('happening_twin_')):
    im=canvas(128,96);d=ImageDraw.Draw(im);rect(d,(0,0,127,95),'sand');rect(d,(0,0,127,23),'cream')
    if any(k in event['id'] for k in ('bank','cove','drain')):rect(d,(61,24,84,95),'water')
    im.alpha_composite(objects[n%8],(12,30));im.alpha_composite(objects[10+n%3],(88,20))
    if 'ostrich' in event['id'] or 'arrival' in event['id']:im.alpha_composite(trams[0],(44,52))
    else:
      rect(d,(53,53,61,61),'mud');rect(d,(51,62,63,82),'green');rect(d,(52,82,55,93),'ink');rect(d,(59,82,62,93),'ink')
    illustration('events',event['id'],im,(512,384))
kept_path.write_text(json.dumps(kept,ensure_ascii=False,indent=2)+'\n')
print('Built 8 portraits, 12 place views, and 12 event illustrations; retained in the art manifest.')
