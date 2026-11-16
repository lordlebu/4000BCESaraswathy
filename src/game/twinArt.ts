// Map-specific art and placements. Assets are requested only when this region is entered.
import type Phaser from 'phaser';
import ground from '../../assets/twins/ground.png?no-inline';
import objects from '../../assets/twins/objects.png?no-inline';
import houses from '../../assets/twins/houses.png?no-inline';
import routes from '../../assets/twins/routes.png?no-inline';
import tram from '../../assets/twins/tram.png?no-inline';
import housesDetail from '../../assets/twins/houses-detail.png?no-inline';
import details from '../../assets/twins/details.png?no-inline';
import rims from '../../assets/twins/rims.png?no-inline';
import tramWalk from '../../assets/twins/tram-walk.png?no-inline';
import courtyardNeem from '../../assets/twins/courtyard-neem.png?no-inline';
import surfaces from '../../assets/twins/surfaces.png?no-inline';
import homesSnes from '../../assets/twins/homes-snes.png?no-inline';
import environment from '../../assets/twins/environment-nes.png?no-inline';
import {twinFurnishings,twinBankDepth,twinHouseLot} from './twinEnvironment';
import { cityEdges, districtAt } from '../world/twinCities';
import { planRiverBridges } from './riverBridges';
import { tileHash } from '../world/rng';
import { depthFor, ROW_SLOT } from './frames';
import type { FieldMapWorld } from '../world/fieldMap';
import type { Tile, World } from '../world/types';
import type { Placement } from './scenePlan';

export const TWIN_KEYS = { ground:'twins-ground', houses:'twins-houses', objects:'twins-objects', routes:'twins-routes', tram:'twins-tram',
  housesDetail:'twins-houses-detail', details:'twins-details', rims:'twins-rims', tramWalk:'twins-tram-walk', courtyard:'twins-courtyard' };
export function loadTwinArt(scene: Phaser.Scene): void {
  for (const [key,url,w,h] of [[TWIN_KEYS.ground,ground,128,128],[TWIN_KEYS.houses,houses,80,88],[TWIN_KEYS.objects,objects,128,160],
    [TWIN_KEYS.routes,routes,128,128],[TWIN_KEYS.tram,tram,192,160],
    [TWIN_KEYS.housesDetail,housesDetail,80,88],[TWIN_KEYS.details,details,128,160],
    [TWIN_KEYS.rims,rims,128,128],[TWIN_KEYS.tramWalk,tramWalk,192,160],
    [TWIN_KEYS.courtyard,courtyardNeem,192,192],
    ['twins-surfaces',surfaces,128,128],['twins-homes-painted',homesSnes,128,144],
    ['twins-environment',environment,128,128]] as const) {
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
  const furnishings=twinFurnishings(built);
  for(const p of furnishings)clear.add(`${p.x},${p.y}`);
  // A modest doorstep in front of each place, leaving Dwarka-sized towns room for homes.
  for(const {at} of placed){clear.add(`${at.x},${at.y}`);clear.add(`${at.x},${at.y+1}`);}
  // Make room for the neem canopy and the public court, including restored maps.
  // Reserve scenery only: the ground, roads and saved positions remain authoritative.
  const court = placed.find(p => p.poi.id === 'poi_harappa_court');
  if (court) for (let dy = -1; dy <= 0; dy++) for (let dx = -1; dx <= 1; dx++) {
    clear.add(`${court.at.x + dx},${court.at.y + dy}`);
  }
  const drain=placed.find(p=>p.poi.id==='poi_drain_court');
  if(drain)for(let dy=-2;dy<=2;dy++)clear.add(`${drain.at.x-1},${drain.at.y+dy}`);
  const add=(sheet:'twinHouses'|'twinHousesDetail'|'twinObjects'|'twinRoutes'|'twinDetails'|'twinRims',frame:number,x:number,y:number,name?:string)=>out.push({sheet,frame,x,y,depth:sheet==='twinRoutes'?70:sheet==='twinRims'?60:depthFor(y,ROW_SLOT.undergrowth),...(name?{name}:{})});
  const neighbours=(x:number,y:number,flag:'road'|'track')=>[[0,-1],[1,0],[0,1],[-1,0]].reduce((mask,[dx,dy],i)=>mask|(world.tiles[y+dy!]?.[x+dx!]?.[flag]?1<<i:0),0);
  const surface=(frame:number,x:number,y:number)=>out.push({sheet:'twinSurfaces',frame,x,y,depth:75});
  for(const row of world.tiles)for(const tile of row){
    const {x,y,biome}=tile;const hash=tileHash(world.seed,x,y,'twin-scenery');
    const keepOriginal=(hash>>>8)%3===0;
    const water=['river','sea'].includes(biome);
    const rimMask=[[0,-1],[1,0],[0,1],[-1,0]].reduce((mask,[dx,dy],i)=>{
      const next=world.tiles[y+dy!]?.[x+dx!];
      return mask|(next&&(water?!['river','sea'].includes(next.biome):biome==='hills'&&!['river','sea','wetland'].includes(next.biome)&&next.elevation<tile.elevation)?1<<i:0);
    },0);
    if(rimMask)add('twinRims',(water?0:16)+rimMask,x,y);
    if(water&&!tile.bridge&&hash%4===0)out.push({sheet:'twinRims',frame:32,x,y,depth:61,sway:{rest:32,lean:33,phase:hash%1200}});
    if(tile.road||tile.track){
      // Road decks use the shared directional bridge, without a road painted over it.
      if(tile.bridge&&tile.road&&!tile.track)continue;
      if(tile.bridge)add('twinObjects',18,x,y);
      add('twinRoutes',(tile.track?16:0)+neighbours(x,y,tile.track?'track':'road'),x,y);
      if(tile.road&&biome==='settlement'&&districtAt(region,tile)&&[[0,-1],[1,0],[0,1],[-1,0]].some(([dx,dy])=>{
        const next=world.tiles[y+dy!]?.[x+dx!];return next?.road&&!districtAt(region,next);
      }))add('twinDetails',7,x,y);
      continue;
    }
    const edge=cityEdges(world,tile);
    if(edge.wall)add('twinObjects',24+(districtAt(region,tile)?.id==='mohenjodaro'?16:0)+edge.wall,x,y);
    if(edge.natural)add('twinObjects',56+edge.natural,x,y);
    if(edge.wall&&hash%4===0)add('twinDetails',8,x,y);
    if(clear.has(`${x},${y}`))continue;
    const district=districtAt(region,tile);
    if(biome==='settlement'&&district&&twinHouseLot(x,y,district.x,district.y)){
      const brick=district.id==='mohenjodaro';
      surface(brick?1:0,x,y);
      if(!keepOriginal&&hash%5!==0){
        // Existing soft contact texture, tucked beneath the baseline rather than
        // a new full-screen lighting pass. Keep the map sprites themselves quiet.
        out.push({sheet:'contact',frame:0,x,y,offset:{x:0,y:.43},depth:depthFor(y,ROW_SLOT.underfoot)});
        out.push({sheet:'twinHomesPainted',frame:brick?1:0,x,y,
          depth:depthFor(y,ROW_SLOT.undergrowth)});
      }
      else add(keepOriginal?'twinHouses':'twinHousesDetail',(brick?4:0)+hash%4,x,y);
    } else if(biome==='desert'&&hash%17===0)add(keepOriginal?'twinObjects':'twinDetails',keepOriginal?14:0,x,y);
    else if(biome==='hills'&&hash%9===0)add(keepOriginal?'twinObjects':'twinDetails',keepOriginal?13:1,x,y);
    else if(biome==='wetland'&&hash%5===0)add(keepOriginal?'twinObjects':'twinDetails',keepOriginal?12:4,x,y);
    else if(biome==='plains'&&hash%13===0)add(keepOriginal?'twinObjects':'twinDetails',keepOriginal?(hash%2?10:11):(hash%2?2:3),x,y);
  }
  // Exclude railway supports from road-span adjacency and orientation decisions.
  const roadWorld={...world,tiles:world.tiles.map(row=>row.map(tile=>tile.bridge&&tile.track?{...tile,bridge:false}:tile))};
  out.push(...planRiverBridges(roadWorld));
  out.push(...furnishings,...twinBankDepth(built));
  // Follow the actual drain-court anchor on restored maps; leave its east bank
  // and all roads untouched. These covers are scenery, not collision geometry.
  if(drain)for(let dy=-2;dy<=2;dy++){
    const x=drain.at.x-1,y=drain.at.y+dy,t=world.tiles[y]?.[x];
    if(t?.biome==='settlement'&&!t.road&&!t.track)surface(2,x,y);
  }
  for(const row of world.tiles)for(const t of row){
    if(t.biome!=='desert'||t.road||t.track)continue;
    if([[0,-1],[1,0],[0,1],[-1,0]].some(([dx,dy])=>world.tiles[t.y+dy!]?.[t.x+dx!]?.biome==='hills'))surface(3,t.x,t.y);
  }
  // Canon's export sorts by id. A place's architecture must not depend on that order.
  const frames:Record<string,number>={poi_harappa_court:10,poi_earthen_workshop:0,poi_nesting_ruins:8,
    poi_harappa_station:16,poi_brick_quarter:17,poi_drain_court:19,poi_planted_ruins:15,
    poi_twin_landing:16,poi_twin_causeway:18,poi_desert_ground:23,poi_reed_junction:12,poi_twin_cove:10};
  const newFrames:Record<string,number>={poi_nesting_cove:9,poi_reedwright_bank:10,poi_dune_windbreak:11};
  placed.forEach(({poi,at})=>{
    if(poi.id==='poi_twin_causeway'){
      const deck=out.find(p=>p.sheet==='riverBridge'&&p.x===at.x&&p.y===at.y);
      if(deck){deck.name=`poi:${poi.id}`;return;}
    }
    if (poi.id === 'poi_harappa_court') {
      out.push({sheet:'twinCourtyard',frame:0,x:at.x,y:at.y,
        depth:depthFor(at.y,ROW_SLOT.undergrowth),name:`poi:${poi.id}`});
      // Furnish the public space only where there is dry ground off the walking routes.
      for (const [dx,dy,frame] of [[-1,0,5],[1,0,6],[-1,-1,8]] as const) {
        const x=at.x+dx,y=at.y+dy,tile=world.tiles[y]?.[x];
        if(tile?.biome==='settlement'&&!tile.road&&!tile.track)add('twinDetails',frame,x,y);
      }
      return;
    }
    const detail=newFrames[poi.id];
    if(detail!==undefined)add('twinDetails',detail,at.x,at.y,`poi:${poi.id}`);
    else {const frame=frames[poi.id]??23;add(frame<10?'twinHouses':'twinObjects',frame,at.x,at.y,`poi:${poi.id}`);}
  });
  // Knowledge changes the actual place, not just its prose.
  if(finished.has('discovery_twin_shade'))add('twinObjects',21,19,17);
  if(finished.has('discovery_twin_drains'))add('twinObjects',19,48,37);
  if(finished.has('discovery_twin_banks'))add('twinObjects',22,33,28);
  return out;
}
