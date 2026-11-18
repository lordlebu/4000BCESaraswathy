import {lampSites} from './roadLight';
import {depthFor,ROW_SLOT} from './frames';
import type {FieldMapWorld} from '../world/fieldMap';
import type {Placement} from './scenePlan';
import type {World} from '../world/types';

/** The painted abutments include transparent gutters; overlap dry banks by a quarter tile. */
export const railSpanWidth=(tiles:number)=>tiles*128+64;

/** Only the twin map's horizontal RAIL crossing. Road bridges and older-map art stay accepted. */
export function planTwinRailBridges(world:World):Placement[]{
  if(!world.twinRegion)return [];
  const out:Placement[]=[];
  for(let y=0;y<world.height;y++)for(let x=0;x<world.width;x++){
    const wetRail=(at:number)=>{const t=world.tiles[y]?.[at];return t?.track&&t.bridge&&['river','sea'].includes(t.biome);};
    if(!wetRail(x)||wetRail(x-1))continue;
    let end=x;while(wetRail(end+1))end++;
    const span=end-x+1;if(span<2)continue;
    const centre=x+(span-1)/2,owner=Math.floor(centre);
    out.push({sheet:'twinRailBridge',frame:0,x:owner,y,spanTiles:span,offset:{x:centre-owner,y:0},depth:69,name:'rail:jrpg-span'});
    // The approved painting's stone abutments need continuous original rails across their top.
    out.push({sheet:'twinRoutes',frame:26,x,y,depth:70,crop:{x:0,y:0,width:48,height:128},name:'rail:connection'});
    out.push({sheet:'twinRoutes',frame:26,x:end,y,depth:70,crop:{x:80,y:0,width:48,height:128},name:'rail:connection'});
    x=end;
  }
  return out;
}

/** The older-map lamp planner, on dry approaches rather than floating at a bridge's water edge. */
export function planTwinLamps(built:FieldMapWorld):Placement[]{
  if(!built.world.twinRegion)return [];
  const tiles=built.world.tiles.map(row=>row.map(t=>t.bridge||['river','sea'].includes(t.biome)?{...t,road:false}:t));
  const taken=new Set(built.placed.map(p=>`${p.at.x},${p.at.y}`));
  taken.add(`${built.world.landmark.x},${built.world.landmark.y}`);
  return lampSites({...built.world,tiles}).filter(p=>!taken.has(`${p.x},${p.y}`))
    .map(p=>({sheet:'twinLamp',frame:0,...p,offset:{x:.34,y:0},depth:depthFor(p.y,ROW_SLOT.marker)}));
}
