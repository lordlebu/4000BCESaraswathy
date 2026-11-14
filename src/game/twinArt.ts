// Map-specific art and placements. Assets are requested only when this region is entered.
import type Phaser from 'phaser';
import ground from '../../assets/twins/ground.png?no-inline';
import objects from '../../assets/twins/objects.png?no-inline';
import houses from '../../assets/twins/houses.png?no-inline';
import routes from '../../assets/twins/routes.png?no-inline';
import tram from '../../assets/twins/tram.png?no-inline';
import { cityEdges, districtAt } from '../world/twinCities';
import { tileHash } from '../world/rng';
import { depthFor, ROW_SLOT } from './frames';
import type { FieldMapWorld } from '../world/fieldMap';
import type { Tile, World } from '../world/types';
import type { Placement } from './scenePlan';

export const TWIN_KEYS = { ground:'twins-ground', houses:'twins-houses', objects:'twins-objects', routes:'twins-routes', tram:'twins-tram' };
export function loadTwinArt(scene: Phaser.Scene): void {
  for (const [key,url,w,h] of [[TWIN_KEYS.ground,ground,128,128],[TWIN_KEYS.houses,houses,80,88],[TWIN_KEYS.objects,objects,128,160],
    [TWIN_KEYS.routes,routes,128,128],[TWIN_KEYS.tram,tram,192,160]] as const) {
    if (!scene.textures.exists(key)) scene.load.spritesheet(key,url,{frameWidth:w,frameHeight:h});
  }
}
export function twinGroundFrame(world:World,tile:Tile,variant:number):number {
  const district=world.twinRegion && districtAt(world.twinRegion,tile);
  const index=tile.biome==='settlement' ? (district?.id==='mohenjodaro'?8:7)
    : ({desert:0,hills:1,plains:2,river:3,wetland:4,coast:5,sea:6,landmark:5} as Record<string,number>)[tile.biome]??0;
  return index*4+variant%4;
}
export function planTwinScene(built:FieldMapWorld,finished:ReadonlySet<string>=new Set()):Placement[] {
  const {world,placed}=built;const region=world.twinRegion!;const out:Placement[]=[];
  const clear=new Set<string>();
  // A modest doorstep in front of each place, leaving Dwarka-sized towns room for homes.
  for(const {at} of placed){clear.add(`${at.x},${at.y}`);clear.add(`${at.x},${at.y+1}`);}
  const add=(sheet:'twinHouses'|'twinObjects'|'twinRoutes',frame:number,x:number,y:number,name?:string)=>out.push({sheet,frame,x,y,depth:sheet==='twinRoutes'?70:depthFor(y,ROW_SLOT.undergrowth),...(name?{name}:{})});
  const neighbours=(x:number,y:number,flag:'road'|'track')=>[[0,-1],[1,0],[0,1],[-1,0]].reduce((mask,[dx,dy],i)=>mask|(world.tiles[y+dy!]?.[x+dx!]?.[flag]?1<<i:0),0);
  for(const row of world.tiles)for(const tile of row){
    const {x,y,biome}=tile;const hash=tileHash(world.seed,x,y,'twin-scenery');
    if(tile.road||tile.track){
      if(tile.bridge)add('twinObjects',18,x,y);
      add('twinRoutes',(tile.track?16:0)+neighbours(x,y,tile.track?'track':'road'),x,y);
      continue;
    }
    const edge=cityEdges(world,tile);
    if(edge.wall)add('twinObjects',24+(districtAt(region,tile)?.id==='mohenjodaro'?16:0)+edge.wall,x,y);
    if(edge.natural)add('twinObjects',56+edge.natural,x,y);
    if(clear.has(`${x},${y}`))continue;
    if(biome==='settlement'&&hash%3!==0){
      const brick=districtAt(region,tile)?.id==='mohenjodaro';
      add('twinHouses',(brick?4:0)+hash%4,x,y);
    } else if(biome==='desert'&&hash%17===0)add('twinObjects',14,x,y);
    else if(biome==='hills'&&hash%9===0)add('twinObjects',13,x,y);
    else if(biome==='wetland'&&hash%5===0)add('twinObjects',12,x,y);
    else if(biome==='plains'&&hash%13===0)add('twinObjects',hash%2?10:11,x,y);
  }
  const frames=[10,0,8,16,17,19,15,16,18,23,12,10];
  placed.forEach(({poi,at},i)=>{const frame=frames[i]??23;add(frame<10?'twinHouses':'twinObjects',frame,at.x,at.y,`poi:${poi.id}`);});
  // Knowledge changes the actual place, not just its prose.
  if(finished.has('discovery_twin_shade'))add('twinObjects',21,19,17);
  if(finished.has('discovery_twin_drains'))add('twinObjects',19,48,37);
  if(finished.has('discovery_twin_banks'))add('twinObjects',22,33,28);
  return out;
}
