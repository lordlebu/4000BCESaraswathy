import type Phaser from 'phaser';
import type {World} from '../world/types';
import {TILE_SIZE} from './tileTextures';
import {terrainAtlasLayout,terrainColourFor,twinTerrainProfile,type TerrainPalette,type TerrainRenderProfile,type TwinTerrainCell,type TwinTurf} from './twinTerrain';

const PIXELS=32,COLUMNS=32;

/** All bands/patterns are baked once into one native-pixel atlas. Still one quad per ground tile. */
export function bakeTwinTerrain(scene:Phaser.Scene,world:World,palette:TwinTurf){
  return bakeTerrainProfile(scene, world, twinTerrainProfile(palette), 'twins-terrain-surface');
}

export function bakeTerrainProfile(scene: Phaser.Scene, world: World, profile: TerrainRenderProfile, key: string) {
  const {cells,unique}=terrainAtlasLayout(world,profile);
  const entries=[...unique.values()];
  // The previous scene's tile images are gone on re-entry. Reuse one bounded atlas slot.
  if(scene.textures.exists(key))scene.textures.remove(key);
  const atlas=scene.textures.createCanvas(key,COLUMNS*PIXELS,Math.ceil(entries.length/COLUMNS)*PIXELS);
  if(!atlas)throw new Error('Could not create twin-valley terrain atlas');
  const ctx=atlas.getContext();ctx.imageSmoothingEnabled=false;
  const frames=new Map<string,number>();
  for(const [frame,cell] of entries.entries()){
    const x=frame%COLUMNS*PIXELS,y=Math.floor(frame/COLUMNS)*PIXELS;
    ctx.save();ctx.translate(x,y);ctx.beginPath();ctx.rect(0,0,PIXELS,PIXELS);ctx.clip();
    paintTerrainCell(ctx,cell,profile.palette,scene);
    ctx.restore();atlas.add(frame,0,x,y,PIXELS,PIXELS);frames.set(cell.key,frame);
  }
  atlas.refresh();
  return {key,frames:cells.map(row=>row.map(cell=>frames.get(cell.key)!)),count:entries.length,
    bytes:COLUMNS*PIXELS*Math.ceil(entries.length/COLUMNS)*PIXELS*4,tileSize:TILE_SIZE};
}

function paintTerrainCell(ctx:CanvasRenderingContext2D,cell:TwinTerrainCell,p:TerrainPalette,scene:Phaser.Scene){
  const source=scene.textures.getFrame(cell.art.key,cell.art.frame);
  ctx.drawImage(source.source.image as CanvasImageSource,source.cutX,source.cutY,source.cutWidth,source.cutHeight,0,0,PIXELS,PIXELS);
  if(cell.highland&&cell.surface){
    ctx.fillStyle=terrainColourFor(cell.surface,p);ctx.fillRect(0,0,PIXELS,PIXELS);
    // Few broad pixel clusters, not checkerboard dithering or detailed grass blades.
    for(let i=0;i<9;i++){
      const x=(i*11+cell.variant*7)%30,y=(i*7+cell.variant*11)%30;
      ctx.globalAlpha=.3;ctx.fillStyle=i%3===0?p.stone:i%2?p.light:p.shade;
      ctx.fillRect(x,y,i%3===0?3:4,2);if(i%3===1)ctx.fillRect(x+1,y-1,2,1);
    }
    ctx.globalAlpha=1;
  }
  for(const edge of cell.edges){
    const water=edge.from==='water'||edge.to==='water';
    const drySeam=!water&&(edge.from==='sand'||edge.to==='sand');
    const width=water?6:drySeam?14:8;
    ctx.fillStyle=terrainColourFor(edge.to,p);
    // An earthy transition tile, then the feathered edge: avoids a bright green rectangle at sand.
    if(drySeam){ctx.globalAlpha=edge.to==='sand'?.12:.06;ctx.fillRect(0,0,32,32);}
    for(let along=0;along<32;along++){
      const reach=width+((Math.floor(along/4)+cell.variant)%3)-1;
      for(let d=0;d<reach;d++){
        const [x,y]=edgePoint(edge.side,along,d);
        // Broad stepped feather: the two sides meet at a shared mix, then recover their own ground.
        ctx.globalAlpha=.48*(1-Math.floor(d/2)/Math.ceil(reach/2));ctx.fillRect(x,y,1,1);
      }
    }
    // A land lip stays pale, a lower slope/water bank shades inward. No rock wall inside a river.
    if(edge.rise||water){
      ctx.fillStyle=edge.from==='water'?'#324f59':edge.rise>0?'#454f40':'#ddd8b5';
      for(let d=0;d<5;d++){
        ctx.globalAlpha=(edge.from==='water'?.18:edge.rise>0?.16:.10)*(1-d/5);
        for(let along=0;along<32;along++){const [x,y]=edgePoint(edge.side,along,d);ctx.fillRect(x,y,1,1);}
      }
    }
    ctx.globalAlpha=1;
  }
}

function edgePoint(side:number,along:number,depth:number):[number,number]{
  return side===0?[along,depth]:side===1?[31-depth,along]:side===2?[along,31-depth]:[depth,along];
}
