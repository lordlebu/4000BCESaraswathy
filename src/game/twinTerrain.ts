import {tileHash} from '../world/rng';
import {inTwinHighlands} from '../world/twinHighlands';
import {twinGroundArt} from './twinArt';
import type {Tile,World} from '../world/types';

export const MAX_TWIN_TERRAIN_FRAMES=768;

export const TWIN_TURF = {
  sage:{base:'#8c9c7b',shade:'#78876c',light:'#a0ad8d',stone:'#9c9e8b',hill:'#92947b',rock:'#858c81',snow:'#cbd1c4'},
  lichen:{base:'#899e91',shade:'#738a80',light:'#a0b1a2',stone:'#9aa49c',hill:'#8c998b',rock:'#818d8a',snow:'#cbd4cf'},
  olive:{base:'#9c9f79',shade:'#838969',light:'#afb18e',stone:'#a4a18b',hill:'#a09b7f',rock:'#8d9183',snow:'#d0d1bf'},
} as const;
export type TwinTurf=keyof typeof TWIN_TURF;
export const TERRAIN_STEP = [[0,-1],[1,0],[0,1],[-1,0]] as const;
type Surface='sand'|'turf'|'hill'|'rock'|'snow'|'water'|'wet'|'shore';
const surface=(t:Tile):Surface|null=>({desert:'sand',plains:'turf',forest:'turf',hills:'hill',mountains:'rock',snow:'snow',river:'water',sea:'water',wetland:'wet',coast:'shore'} as Record<string,Surface>)[t.biome]??null;
const height=(t:Tile)=>t.biome==='snow'?3:t.biome==='mountains'?2:t.biome==='hills'?1:0;
export type TerrainEdge={side:number;from:Surface;to:Surface;rise:number};
export interface TwinTerrainCell {
  art:{key:string;frame:number};highland:boolean;surface:Surface|null;variant:number;edges:TerrainEdge[];key:string;
}

/** Presentation only: no elevation, biome, RNG stream, collision or saved-ground changes. */
export function twinTerrainCell(world:World,tile:Tile):TwinTerrainCell{
  const variant=tileHash(world.seed,tile.x,tile.y,'tile-variant')%4;
  const art=twinGroundArt(world,tile,variant),from=surface(tile),edges:TerrainEdge[]=[];
  const highland=Boolean(world.twinRegion&&inTwinHighlands(tile)&&['plains','hills','mountains','snow'].includes(tile.biome));
  if(world.twinRegion&&from)for(const [side,[dx,dy]] of TERRAIN_STEP.entries()){
    const next=world.tiles[tile.y+dy]?.[tile.x+dx],to=next&&surface(next);
    if(!next||!to)continue;
    const rise=from==='water'||to==='water'?0:Math.sign(height(next)-height(tile));
    if(from!==to||rise)edges.push({side,from,to,rise});
  }
  const key=[art.key,art.frame,Number(highland),variant,...edges.map(e=>`${e.side}${e.to}${e.rise}`)].join(':');
  return {art,highland,surface:from,variant,edges,key};
}

export function terrainColour(surface:Surface,palette:TwinTurf):string{
  const p=TWIN_TURF[palette];
  return {sand:'#bea77a',turf:p.base,hill:p.hill,rock:p.rock,snow:p.snow,water:'#638e91',wet:'#84977b',shore:'#b6ac86'}[surface];
}
