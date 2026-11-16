import type { FieldMapWorld } from '../world/fieldMap';
import type { Placement } from './scenePlan';
import { depthFor, ROW_SLOT } from './frames';

const WATER=new Set(['river','sea']);
const HOUSE_ROWS:Record<number,readonly number[]>={
 '-3':[0],'-2':[-1,0,1],'-1':[-2,-1,1,2],
 '0':[-3,-2,-1,1,2,3],'1':[-2,-1,1,2],'2':[-1,0,1],'3':[0]
};
/** Fixed residential bands around open courts. Seeded art varies, building lots do not. */
export function twinHouseLot(x:number,y:number,cx:number,cy:number):boolean{
 return HOUSE_ROWS[y-cy]?.includes(x-cx)??false;
}
// Authored offsets describe use of space, not a random scattering of decorative objects.
const FURNISHINGS:Record<string,readonly (readonly [number,number,number])[]>={
 poi_harappa_court:[[-1,1,0],[1,1,1]],
 poi_earthen_workshop:[[-1,0,2],[0,-1,3]],
 poi_nesting_ruins:[[1,0,1]],
 poi_harappa_station:[[-1,0,3],[1,0,1]],
 poi_brick_quarter:[[-2,0,5],[-1,-1,0]],
 poi_drain_court:[[-3,0,5]],
 poi_planted_ruins:[[0,-1,0]],
 poi_twin_landing:[[1,0,4],[-1,0,1]],
 poi_reedwright_bank:[[-1,0,3],[0,1,6]],
 poi_nesting_cove:[[-1,0,7]],
 poi_desert_ground:[[1,0,3]]
};
export function twinFurnishings(built:FieldMapWorld):Placement[]{
 const out:Placement[]=[],occupied=new Set(built.placed.map(p=>`${p.at.x},${p.at.y}`));
 for(const {poi,at} of built.placed)for(const [dx,dy,frame] of FURNISHINGS[poi.id]??[]){
  const x=at.x+dx,y=at.y+dy,key=`${x},${y}`,t=built.world.tiles[y]?.[x];
  if(!t||t.road||t.track||occupied.has(key)||!['settlement','desert','plains','wetland','coast'].includes(t.biome))continue;
  if(frame===6&&![[0,-1],[1,0],[0,1],[-1,0]].some(([a,b])=>WATER.has(built.world.tiles[y+b!]?.[x+a!]?.biome??'')))continue;
  out.push({sheet:'twinEnvironment',frame,x,y,depth:frame===0||frame===7?74:depthFor(y,ROW_SLOT.undergrowth)});
  occupied.add(key);
 }
 return out;
}
export function twinBankDepth(built:FieldMapWorld):Placement[]{
 const out:Placement[]=[];
 for(const row of built.world.tiles)for(const t of row){
  if(!WATER.has(t.biome)||t.bridge)continue;
  const mask=[[0,-1],[1,0],[0,1],[-1,0]].reduce((m,[dx,dy],i)=>{
   const next=built.world.tiles[t.y+dy!]?.[t.x+dx!];
   return next&&!WATER.has(next.biome)&&next.biome!=='wetland'?m|1<<i:m;
  },0);
  if(mask)out.push({sheet:'twinEnvironment',frame:8+mask,x:t.x,y:t.y,depth:62});
 }
 return out;
}
