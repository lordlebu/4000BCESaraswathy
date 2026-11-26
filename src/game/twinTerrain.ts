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
export type TerrainPalette = { [Role in keyof typeof TWIN_TURF.sage]: string };
export const TERRAIN_STEP = [[0,-1],[1,0],[0,1],[-1,0]] as const;
type Surface='sand'|'turf'|'hill'|'rock'|'snow'|'water'|'wet'|'shore';
const surface=(t:Tile):Surface|null=>({desert:'sand',plains:'turf',forest:'turf',hills:'hill',mountains:'rock',snow:'snow',river:'water',sea:'water',wetland:'wet',coast:'shore'} as Record<string,Surface>)[t.biome]??null;
const height=(t:Tile)=>t.biome==='snow'?3:t.biome==='mountains'?2:t.biome==='hills'?1:0;
export type TerrainEdge={side:number;from:Surface;to:Surface;rise:number};
export interface TwinTerrainCell {
  art:{key:string;frame:number};highland:boolean;surface:Surface|null;variant:number;edges:TerrainEdge[];key:string;
}

export interface TerrainRenderProfile {
  palette: TerrainPalette;
  art: (world: World, tile: Tile, variant: number) => TwinTerrainCell['art'];
  highland: (tile: Tile) => boolean;
}

export function twinTerrainProfile(palette: TwinTurf): TerrainRenderProfile {
  return {
    palette: TWIN_TURF[palette], art: twinGroundArt,
    highland: tile => inTwinHighlands(tile) && ['plains','hills','mountains','snow'].includes(tile.biome)
  };
}

/** Presentation only: no elevation, biome, RNG stream, collision or saved-ground changes. */
export function profileTerrainCell(world:World,tile:Tile,profile:TerrainRenderProfile):TwinTerrainCell{
  const variant=tileHash(world.seed,tile.x,tile.y,'tile-variant')%4;
  const art=profile.art(world,tile,variant),from=surface(tile),edges:TerrainEdge[]=[];
  const highland=profile.highland(tile);
  if(from)for(const [side,[dx,dy]] of TERRAIN_STEP.entries()){
    const next=world.tiles[tile.y+dy]?.[tile.x+dx],to=next&&surface(next);
    if(!next||!to)continue;
    const rise=from==='water'||to==='water'?0:Math.sign(height(next)-height(tile));
    if(from!==to||rise)edges.push({side,from,to,rise});
  }
  const key=[art.key,art.frame,Number(highland),variant,...edges.map(e=>`${e.side}${e.to}${e.rise}`)].join(':');
  return {art,highland,surface:from,variant,edges,key};
}

export function terrainAtlasLayout(world: World, profile: TerrainRenderProfile) {
  const unique = new Map<string, TwinTerrainCell>();
  let cells = world.tiles.map(row => row.map(tile => profileTerrainCell(world, tile, profile)));
  const index = () => { for (const row of cells) for (const cell of row) unique.set(cell.key, cell); };
  index();
  for (const limit of [1, 0]) {
    if (unique.size <= MAX_TWIN_TERRAIN_FRAMES) break;
    // Keep source terrain and reduce transition detail on unusually complex fields.
    unique.clear();
    cells = cells.map(row => row.map(cell => {
      const edges = cell.edges.slice(0, limit);
      const edge = edges[0];
      const key = [cell.art.key, cell.art.frame, cell.highland, cell.surface, edge?.side, edge?.to, edge?.rise].join(':');
      return {...cell, key, variant: 0, edges};
    }));
    index();
  }
  return {cells, unique};
}

const SAGE_PROFILE = twinTerrainProfile('sage');
export function twinTerrainCell(world:World,tile:Tile):TwinTerrainCell {
  return profileTerrainCell(world, tile, SAGE_PROFILE);
}

export function terrainColourFor(surface:Surface,p:TerrainPalette):string{
  return {sand:'#bea77a',turf:p.base,hill:p.hill,rock:p.rock,snow:p.snow,water:'#638e91',wet:'#84977b',shore:'#b6ac86'}[surface];
}

export function terrainColour(surface:Surface,palette:TwinTurf):string {
  return terrainColourFor(surface, TWIN_TURF[palette]);
}
