import {inTwinHighlands} from '../world/twinHighlands';
import {tileHash} from '../world/rng';
import {districtAt} from '../world/twinCities';
import {depthFor,ROW_SLOT} from './frames';
import type {FieldMapWorld} from '../world/fieldMap';
import type {Tile} from '../world/types';
import type {Placement} from './scenePlan';

export const CAVE_BODY_PX=192,CAVE_ENTRANCE_PX=64,MAX_HIGHLAND_TREES=72,MAX_PATH_STONES=24;
export type TwinRoadMaterial='sand'|'stone'|'sandstone'|'brick';
export function twinRoadMaterial(built:FieldMapWorld,t:Tile):TwinRoadMaterial{
  const city=built.world.twinRegion&&districtAt(built.world.twinRegion,t);
  if(city)return city.id==='mohenjodaro'?'brick':'sandstone';
  if(inTwinHighlands(t)||['plains','forest','hills','wetland','coast','mountains','snow'].includes(t.biome))return 'stone';
  const desertStop=built.placed.some(p=>['poi_desert_ground','poi_dune_windbreak'].includes(p.poi.id)
    &&Math.abs(p.at.x-t.x)+Math.abs(p.at.y-t.y)<=3);
  return desertStop?'sand':'sandstone';
}

/** Existing leafy trees, a few snow conifers and small stones near grassy paths; no ground mutation. */
export function planHighlandLife(built:FieldMapWorld,clear:ReadonlySet<string>,occupied:ReadonlySet<string>=new Set()):Placement[]{
  const {world}=built;if(!world.twinRegion)return [];
  const trees:Placement[]=[],stones:Placement[]=[];
  for(const row of world.tiles)for(const t of row){
    if(clear.has(`${t.x},${t.y}`)||t.road||t.track||t.bridge)continue;
    const h=tileHash(world.seed,t.x,t.y,'highland-life');
    if(inTwinHighlands(t)&&['plains','hills','mountains','snow'].includes(t.biome)){
      const frozen=t.biome==='snow'||t.biome==='mountains';
      if(h%(frozen?13:8)===0)trees.push({sheet:frozen?'twinHighlandLife':'twinObjects',frame:frozen?1:11,
        x:t.x,y:t.y,depth:depthFor(t.y,ROW_SLOT.undergrowth),name:frozen?'highland:conifer':'highland:tree'});
    }
    if(!occupied.has(`${t.x},${t.y}`)&&t.biome==='plains'&&h%6===0&&[[0,-1],[1,0],[0,1],[-1,0],[0,-2],[2,0],[0,2],[-2,0]]
      .some(([dx,dy])=>world.tiles[t.y+dy!]?.[t.x+dx!]?.road)){
      stones.push({sheet:'twinObjects',frame:13,x:t.x,y:t.y,depth:depthFor(t.y,ROW_SLOT.underfoot),name:'highland:path-stone'});
    }
  }
  const rank=(p:Placement)=>tileHash(world.seed,p.x,p.y,'highland-life-budget');
  trees.sort((a,b)=>rank(a)-rank(b));stones.sort((a,b)=>rank(a)-rank(b));
  return [...trees.slice(0,MAX_HIGHLAND_TREES),...stones.slice(0,MAX_PATH_STONES)];
}
