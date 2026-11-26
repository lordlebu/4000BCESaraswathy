import type {FieldMapWorld} from '../world/fieldMap';
import {pointKey} from '../world/pathfind';
import {tileHash} from '../world/rng';
import type {Point, Tile} from '../world/types';
import {depthFor, ROW_SLOT} from './frames';
import type {Placement} from './scenePlan';
import {twinHome} from './twinEnvironment';
import {RELIEF_CAVE_LEFT, RELIEF_CAVE_RIGHT, RELIEF_CAVE_SKIRT, RELIEF_DIRECTIONS, planTwinSummits} from './twinRelief';
import {planTwinResidents} from './twinResidents';
import {bustSite} from './twinStoryArt';
import type {TwinSceneryReview} from './twinSceneryReview';

export const SITE = {
  yard:0, wornClay:1, brickCourt:2, sandLee:3, bankFloor:4, clippedGarden:5, stoneEdge:6, riverEdge:7,
  bench:8, pottery:9, brokenRooms:10, ruinWall:11, nest:12, plantedRooms:13, planter:14,
  drain:15, drainTrim:16, reedMargin:17, windbreak:18, scrub:19, reedBank:20, reedBundle:21,
  basket:22, reedMat:23, seat:24, earthenWall:25, brickWall:26, shadeTree:27
} as const;
export type SiteFrame = (typeof SITE)[keyof typeof SITE];
const DRY = new Set(['settlement','desert','plains','hills','forest','coast']);
const HOME_SHEETS = new Set(['twinHouses','twinHousesDetail','twinHomesPainted']);
const STRUCTURES = new Set([...HOME_SHEETS,'twinDetails','twinObjects','twinCourtyard','twinStories','twinEnvironment','twinCaveProps','twinHighlandLife']);
const DISTANCE = (a:Point,b:Point) => Math.abs(a.x-b.x)+Math.abs(a.y-b.y);

type Prop = {frame:SiteFrame; dx:number; dy:number; ground?:true; bank?:true; shadow?:Placement['twinShadow']};
type Site = {id:string; group:'civic'|'outlying'; anchor?:SiteFrame; floor:SiteFrame; props:Prop[]};
const LOCATIONS: readonly Site[] = [
  {id:'poi_earthen_workshop',group:'civic',floor:SITE.yard,props:[
    {frame:SITE.bench,dx:-1,dy:1,shadow:'contact'},{frame:SITE.pottery,dx:1,dy:1,shadow:'contact'},
    {frame:SITE.earthenWall,dx:-2,dy:0,shadow:'wall'}]},
  {id:'poi_nesting_ruins',group:'civic',anchor:SITE.brokenRooms,floor:SITE.wornClay,props:[
    {frame:SITE.ruinWall,dx:1,dy:-1,shadow:'wall'},{frame:SITE.nest,dx:1,dy:0},
    {frame:SITE.stoneEdge,dx:0,dy:-1,ground:true}]},
  {id:'poi_planted_ruins',group:'civic',anchor:SITE.plantedRooms,floor:SITE.brickCourt,props:[
    {frame:SITE.planter,dx:-1,dy:-1,shadow:'contact'},{frame:SITE.planter,dx:1,dy:-1,shadow:'contact'},
    {frame:SITE.brickWall,dx:-2,dy:0,shadow:'wall'}]},
  {id:'poi_drain_court',group:'civic',anchor:SITE.drain,floor:SITE.brickCourt,props:[
    {frame:SITE.drainTrim,dx:-1,dy:0,ground:true},{frame:SITE.drainTrim,dx:0,dy:-1,ground:true},
    {frame:SITE.reedMargin,dx:1,dy:1,bank:true},{frame:SITE.riverEdge,dx:1,dy:-1,ground:true,bank:true}]},
  {id:'poi_dune_windbreak',group:'outlying',anchor:SITE.windbreak,floor:SITE.sandLee,props:[
    {frame:SITE.scrub,dx:-2,dy:-1,shadow:'contact'},{frame:SITE.scrub,dx:1,dy:-1,shadow:'contact'},
    {frame:SITE.seat,dx:-1,dy:1,shadow:'contact'},{frame:SITE.sandLee,dx:-1,dy:-1,ground:true}]},
  {id:'poi_reedwright_bank',group:'outlying',anchor:SITE.reedBank,floor:SITE.bankFloor,props:[
    {frame:SITE.reedBundle,dx:-1,dy:-1,shadow:'contact'},{frame:SITE.basket,dx:-1,dy:1,shadow:'contact'},
    {frame:SITE.reedMat,dx:0,dy:-1,ground:true},{frame:SITE.reedMargin,dx:1,dy:1,bank:true}]}
];

function ground(frame:SiteFrame,p:Point,name:string):Placement {
  return {sheet:'twinSite',frame,...p,depth:73,name};
}
function prop(frame:SiteFrame,p:Point,name:string,twinShadow?:Placement['twinShadow']):Placement {
  return {sheet:'twinSite',frame,...p,depth:depthFor(p.y,ROW_SLOT.undergrowth),name,twinShadow};
}

export function planTwinScenery(built:FieldMapWorld,baseline:readonly Placement[],review:TwinSceneryReview):Placement[] {
  const {world,placed}=built;
  if(!world.twinRegion||!review.relief&&!review.civic&&!review.outlying)return [...baseline];
  const sites=new Map(LOCATIONS.filter(s=>review[s.group]).map(s=>[s.id,s]));
  const anchors=new Map(placed.map(p=>[p.poi.id,p.at]));
  const byName=new Map(baseline.filter(p=>p.name).map(p=>[p.name!,p]));
  const reserved=new Set(placed.map(p=>pointKey(p.at)));
  const transport=new Set(world.tiles.flat().filter(t=>t.road||t.track||t.bridge).map(pointKey));
  const occupancy=new Set([...reserved,...transport]);
  const cave=anchors.get('poi_northwest_cave_camp');
  const statue=bustSite(built);
  if(statue)occupancy.add(pointKey(statue));
  for(const p of baseline)if(STRUCTURES.has(p.sheet))occupancy.add(pointKey(p));
  for(const {at} of placed)occupancy.add(pointKey({x:at.x,y:at.y+1}));
  if(cave)for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++)occupancy.add(pointKey({x:cave.x+dx,y:cave.y+dy}));
  if(review.civic||review.outlying)for(let day=0;day<30;day+=5) {
    for(const p of planTwinResidents(built,baseline,day))occupancy.add(pointKey(p));
  }
  const neighbours=(p:Point)=>RELIEF_DIRECTIONS.map(([dx,dy])=>world.tiles[p.y+dy]?.[p.x+dx]);
  const nearBank=(t:Tile)=>neighbours(t).some(n=>n?.biome==='river'||n?.biome==='sea');
  const dry=(t:Tile|undefined):t is Tile=>!!t&&DRY.has(t.biome)&&!transport.has(pointKey(t));
  const planned:Placement[]=[];
  const floorCells=new Set<string>();
  const replace=new Map<string,Placement>();

  const addFloor=(frame:SiteFrame,t:Tile,name:string)=>{
    if(floorCells.has(pointKey(t)))return;
    floorCells.add(pointKey(t));planned.push(ground(frame,{x:t.x,y:t.y},name));
  };
  const addDetails=(center:Point,specs:Prop[],name:string,radius:number)=>{
    for(const detail of specs){
      const prefer={x:center.x+detail.dx,y:center.y+detail.dy};
      const options:Tile[]=[];
      for(let y=center.y-radius;y<=center.y+radius;y++)for(let x=center.x-radius;x<=center.x+radius;x++){
        const tile=world.tiles[y]?.[x];
        if(!tile||transport.has(pointKey(tile))||DISTANCE(tile,center)>radius)continue;
        if(!DRY.has(tile.biome)&&!(detail.bank&&tile.biome==='wetland'))continue;
        if(detail.bank&&!nearBank(tile))continue;
        if(detail.ground ? reserved.has(pointKey(tile))||floorCells.has(pointKey(tile)) : occupancy.has(pointKey(tile)))continue;
        // Only use the adjacent city's space when it belongs to this interaction anchor.
        if(placed.some(p=>pointKey(p.at)!==pointKey(center)&&DISTANCE(p.at,tile)<DISTANCE(center,tile)))continue;
        options.push(tile);
      }
      options.sort((a,b)=>DISTANCE(a,prefer)-DISTANCE(b,prefer)||a.y-b.y||a.x-b.x);
      const tile=options[0];if(!tile)continue;
      if(detail.ground)addFloor(detail.frame,tile,name);
      else {occupancy.add(pointKey(tile));planned.push(prop(detail.frame,{x:tile.x,y:tile.y},name,detail.shadow));}
    }
  };

  if(review.relief){
    planned.push(...planTwinSummits(world,occupancy));
    if(cave) {
      for(const [dx,frame] of [[0,RELIEF_CAVE_SKIRT],[-1,RELIEF_CAVE_LEFT],[1,RELIEF_CAVE_RIGHT]] as const){
        const foothill={x:cave.x+dx,y:cave.y-1};
        if(dry(world.tiles[foothill.y]?.[foothill.x]))planned.push({sheet:'twinRelief',frame,...foothill,depth:62,name:'highland:cave-skirt'});
      }
      const stream=world.twinRegion.channels?.[1]??world.rivers[0]?.path??[];
      for(const p of stream){
        if(DISTANCE(p,cave)>8)continue;
        for(const tile of neighbours(p))if(dry(tile)&&!occupancy.has(pointKey(tile)))addFloor(SITE.riverEdge,tile,'highland:meltwater');
      }
    }
  }

  for(const [id,site] of sites){
    const at=anchors.get(id);if(!at)continue;
    const name=`twin-site:${id}`;
    const original=byName.get(`poi:${id}`);
    if(site.anchor!==undefined&&original)replace.set(original.name!,prop(site.anchor,at,original.name!,site.anchor===SITE.windbreak?'wall':undefined));
    addDetails(at,site.props,name,3);
    for(const [dx,dy] of [[0,0],[-1,0],[1,0],[0,1]]){
      const tile=world.tiles[at.y+dy!]?.[at.x+dx!];
      if(dry(tile)&&(!reserved.has(pointKey(tile))||pointKey(tile)===pointKey(at)))addFloor(site.floor,tile,name);
    }
  }

  if(review.civic){
    for(const [id,edge] of [['poi_harappa_court',SITE.earthenWall],['poi_brick_quarter',SITE.brickWall]] as const){
      const at=anchors.get(id);if(!at)continue;
      const furniture:Prop[]=[{frame:edge,dx:-2,dy:1,shadow:'wall'},
        {frame:SITE.seat,dx:1,dy:1,shadow:'contact'},{frame:SITE.clippedGarden,dx:1,dy:2,ground:true}];
      if(id==='poi_brick_quarter')furniture.push({frame:SITE.shadeTree,dx:-1,dy:2,shadow:'tree'});
      addDetails(at,furniture,`twin-site:${id}`,3);
    }
    for(const district of world.twinRegion.districts){
      const rank=(p:Point)=>tileHash(world.seed,p.x,p.y,`twin-outskirts:${district.id}`);
      const candidates=world.tiles.flat().filter(t=>dry(t)&&!occupancy.has(pointKey(t))&&DISTANCE(t,district)>district.radius
        &&DISTANCE(t,district)<=district.radius+4&&t.biome!=='hills'&&t.biome!=='forest'&&t.biome!=='settlement'
        &&!placed.some(p=>DISTANCE(p.at,t)<3)&&!transport.has(pointKey({x:t.x,y:t.y-1}))
        &&!neighbours(t).some(n=>n?.track||n?.bridge))
        .sort((a,b)=>rank(a)-rank(b));
      const routeAdjacent=(p:Point)=>neighbours(p).some(n=>n?.road||dry(n)&&!occupancy.has(pointKey(n)));
      const centers:Point[]=[];
      for(const center of candidates){
        if(centers.length>=3)break;
        if(occupancy.has(pointKey(center))||centers.some(p=>DISTANCE(p,center)<5)||!routeAdjacent(center))continue;
        const layout=candidates.filter(t=>DISTANCE(t,center)<=2&&!occupancy.has(pointKey(t))&&routeAdjacent(t))
          .sort((a,b)=>DISTANCE(a,center)-DISTANCE(b,center)||rank(a)-rank(b)).slice(0,2+rank(center)%3);
        if(layout.length<2)continue;
        // A connected spur or an open shoulder must remain outside the house footprints.
        const blocked=new Set(layout.map(pointKey));
        if(!layout.every(p=>neighbours(p).some(n=>n?.road||dry(n)&&!occupancy.has(pointKey(n))&&!blocked.has(pointKey(n)))))continue;
        centers.push(center);
        for(const tile of layout){
          occupancy.add(pointKey(tile));
          planned.push({...twinHome(world.seed,tile.x,tile.y,district.id==='mohenjodaro'),name:'twin-site:outskirts',twinShadow:'house'});
          addFloor(district.id==='mohenjodaro'?SITE.brickCourt:SITE.yard,tile,'twin-site:outskirts');
        }
        const yard=candidates.find(t=>DISTANCE(t,center)<=2&&!occupancy.has(pointKey(t)));
        if(yard)addFloor(SITE.clippedGarden,yard,'twin-site:outskirts');
      }
      if(!centers.length){
        const yard=candidates.find(routeAdjacent);
        if(yard)addFloor(SITE.clippedGarden,yard,'twin-site:outskirts');
      }
    }
  }
  const cityCenters=['poi_harappa_court','poi_brick_quarter'].flatMap(id=>anchors.get(id)??[]);
  const cityHomes=new Set(review.civic?baseline.filter(p=>HOME_SHEETS.has(p.sheet)&&!p.name&&
    cityCenters.some(at=>DISTANCE(at,p)<=3)).map(pointKey):[]);
  return [...baseline.filter(p=>!(review.relief&&p.sheet==='twinHighlandForms')&&!(p.sheet==='contact'&&cityHomes.has(pointKey(p))))
    .map(p=>replace.get(p.name??'')??(cityHomes.has(pointKey(p))&&HOME_SHEETS.has(p.sheet)?{...p,twinShadow:'house' as const}:p)),...planned];
}
