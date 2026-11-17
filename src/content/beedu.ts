// One rare ambient animal. Position is derived from a supplied clock, never a frame counter.
import {tileHash} from '../world/rng';
import type {Point,World} from '../world/types';
export const BEEDU_CYCLE_MS=300_000;
type Route={points:Point[];lengths:number[];total:number};
const routes=new WeakMap<World,Route|null>();
export function beeduRoute(world:World):Route|null{
 if(routes.has(world))return routes.get(world)!;
 let spawn:Point|undefined;
 for(let r=0;r<=7&&!spawn;r++)for(let dy=-r;dy<=r&&!spawn;dy++)for(let dx=-r;dx<=r;dx++){
  const t=world.tiles[39+dy]?.[9+dx];
  if(t?.biome==='desert'&&!t.road&&!t.track){spawn={x:t.x+.5,y:t.y+.5};break;}
 }
 // A delta channel can replace the coast at the requested column. Use the nearest
 // actual shore tile instead of silently disabling every flight on that seed.
 const shore=(column:number)=>{
  for(let r=0;r<=4;r++)for(const x of r?[column-r,column+r]:[column]){
   const tile=world.tiles.find(row=>row[x]?.biome==='coast')?.[x];
   if(tile)return tile;
  }
  return undefined;
 };
 const west=shore(8),east=shore(24);
 if(!world.twinRegion||!spawn||!west||!east){routes.set(world,null);return null;}
 const stops=[spawn,{x:west.x+.5,y:west.y+1},{x:east.x+.5,y:east.y+1},{x:21.5,y:42.5}];
 const points:Point[]=[];
 for(let i=0;i<stops.length;i++)for(let j=0;j<16;j++){
  const a=stops[(i+3)%4]!,b=stops[i]!,c=stops[(i+1)%4]!,d=stops[(i+2)%4]!,t=j/16;
  const axis=(k:'x'|'y')=>.5*((2*b[k])+(-a[k]+c[k])*t+(2*a[k]-5*b[k]+4*c[k]-d[k])*t*t+(-a[k]+3*b[k]-3*c[k]+d[k])*t*t*t);
  points.push({x:axis('x'),y:axis('y')});
 }
 points.push({...points[0]!});
 if(points.some(p=>{const t=world.tiles[Math.floor(p.y)]?.[Math.floor(p.x)];return !t||t.track||t.biome==='settlement';})){
  routes.set(world,null);return null;
 }
 const lengths=[0];let total=0;
 for(let i=1;i<points.length;i++){total+=Math.hypot(points[i]!.x-points[i-1]!.x,points[i]!.y-points[i-1]!.y);lengths.push(total);}
 const route={points,lengths,total};routes.set(world,route);return route;
}
export interface BeeduPose extends Point{
 state:'hidden'|'sand'|'emerging'|'gliding'|'descending'|'burrowing';
 height:number;alpha:number;sand:number;frame:number;flightId:string;
}
export function beeduAt(world:World,nowMs:number,reduced=false,review=false):BeeduPose|null{
 const route=beeduRoute(world);if(!route)return null;
 const clock=nowMs+(review?157_000:tileHash(world.seed,0,0,'beedu-phase')%BEEDU_CYCLE_MS);
 const age=((clock%BEEDU_CYCLE_MS)+BEEDU_CYCLE_MS)%BEEDU_CYCLE_MS;
 const s=age-150_000,cycle=Math.floor(clock/BEEDU_CYCLE_MS);
 const state:BeeduPose['state']=s<0?'hidden':s<3_000?'sand':s<7_000?'emerging':s<143_000?'gliding':s<148_000?'descending':'burrowing';
 const along=Math.max(0,Math.min(1,(s-7_000)/136_000)),distance=along*route.total;
 let i=0;while(i<route.points.length-2&&route.lengths[i+1]!<distance)i++;
 const a=route.points[i]!,b=route.points[i+1]!,span=route.lengths[i+1]!-route.lengths[i]!;
 const f=span?(distance-route.lengths[i]!)/span:0;
 const dx=b.x-a.x,dy=b.y-a.y;
 const facing=Math.abs(dx)>Math.abs(dy)?(dx>0?2:3):(dy>0?0:1);
 const height=state==='emerging'?(s-3_000)/4_000*1.2:state==='gliding'?1.2+(reduced?0:Math.sin(s/2500)*.05):state==='descending'?(148_000-s)/5_000*1.2:0;
 return{x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f,state,height,
  alpha:state==='hidden'||state==='sand'?0:state==='burrowing'?(150_000-s)/2_000:1,
  sand:['sand','emerging','burrowing'].includes(state)?(reduced?.2:.65):0,
  frame:facing*4+(['emerging','descending','burrowing'].includes(state)?3:reduced?0:Math.floor(nowMs/320)%3),
  flightId:`${world.seed}:${cycle}`};
}
