import { CAVE_POI } from '../content/twinStories';
import { isWalkable } from '../world/generate';
import type { FieldMapWorld } from '../world/fieldMap';
import type { Placement } from './scenePlan';
import type { TwinResident } from './twinResidents';
import { depthFor, ROW_SLOT } from './frames';

export const CAVE_TURN_MS = 45_000;
export const CAVE_PEOPLE = ['npc_mirlepa', 'npc_yamantaka'] as const;
const SOLID = new Set(['twinHouses', 'twinHousesDetail', 'twinHomesPainted', 'twinObjects',
  'twinDetails', 'twinCourtyard', 'twinEnvironment', 'twinStories', 'twinCaveProps']);
const key = (p: {x:number;y:number}) => `${p.x},${p.y}`;

/** Six five-day arrangements repeat over a thirty-day journey month. No OS calendar. */
export function cavePropFrames(day:number):number[] {
  const phase = Math.floor(((Math.floor(day) % 30) + 30) % 30 / 5);
  return [(phase % 2) * 3, 1 + (Math.floor(phase / 2) % 2) * 3,
    (phase === 1 || phase === 4) ? 2 : 5];
}

export function planCaveProps(built:FieldMapWorld, day=0):Placement[] {
  if (!built.world.twinRegion) return [];
  const cave = built.placed.find(p => p.poi.id === CAVE_POI)?.at;
  if (!cave) return [];
  const frames = cavePropFrames(day);
  return [[-2,-1],[-2,2],[-1,1]].flatMap(([dx,dy], i) => {
    const x=cave.x+dx!, y=cave.y+dy!, tile=built.world.tiles[y]?.[x];
    return tile && isWalkable(tile) && !['river','sea','wetland'].includes(tile.biome)
      && !tile.road && !tile.track && !tile.bridge
      ? [{sheet:'twinCaveProps' as const, frame:frames[i]!, x,y,depth:depthFor(y,ROW_SLOT.undergrowth)}] : [];
  });
}

export interface CaveWalk {npcId:string; points:{x:number;y:number}[]}
/** Cache once per resident refresh. Short cardinal routes stay on opposite sides of the cave,
 * avoiding scenery, every other resident and the entrance. Saved POI anchors remain authoritative.
 */
export function planCaveWalks(built:FieldMapWorld, scenery:readonly Placement[], residents:readonly TwinResident[]):CaveWalk[] {
  if (!built.world.twinRegion) return [];
  const cave=built.placed.find(p=>p.poi.id===CAVE_POI)?.at;
  if (!cave) return [];
  const blocked=new Set(scenery.filter(p=>SOLID.has(p.sheet)).map(key));
  for (const p of built.placed) blocked.add(key(p.at));
  blocked.add(key({x:cave.x,y:cave.y+1}));
  return CAVE_PEOPLE.flatMap((npcId,index) => {
    const home=residents.find(r=>r.npcId===npcId);
    if (!home) return [];
    const occupied=new Set(residents.filter(r=>r!==home).map(key));
    const seen=new Set([key(home)]), queue=[[{x:home.x,y:home.y}]];
    let route=queue[0]!;
    while(queue.length) {
      const path=queue.shift()!, end=path[path.length-1]!;
      if(path.length>route.length) route=path;
      if(path.length===4) continue;
      for(const [dx,dy] of [[0,1],[-1,0],[1,0],[0,-1]]) {
        const p={x:end.x+dx!,y:end.y+dy!}, k=key(p), tile=built.world.tiles[p.y]?.[p.x];
        if(seen.has(k)||blocked.has(k)||occupied.has(k)||!tile||!isWalkable(tile)
          ||['river','sea','wetland'].includes(tile.biome)||tile.road||tile.track||tile.bridge
          ||Math.abs(p.x-cave.x)>4||Math.abs(p.y-cave.y)>4
          ||(index===0 ? p.x>=cave.x : p.x<=cave.x)) continue;
        seen.add(k);queue.push([...path,p]);
      }
    }
    // Return along the same safe corridor; never cut diagonally through scenery.
    return [{npcId,points:[...route,...route.slice(0,-1).reverse()]}];
  });
}

/** One walks three gentle out-and-back loops while the other sits, then they exchange roles. */
export function cavePose(walk:CaveWalk, clockMs:number):{x:number;y:number;frame:number;sitting:boolean} {
  const index=CAVE_PEOPLE.indexOf(walk.npcId as typeof CAVE_PEOPLE[number]);
  const clock=Math.max(0,clockMs), turn=Math.floor(clock/CAVE_TURN_MS);
  const sitting=turn%2!==index || walk.points.length<2;
  const home=walk.points[0]!;
  if(sitting) return {...home,frame:17,sitting:true}; // Both use generated south-facing seated poses.
  const progress=(clock%CAVE_TURN_MS)/(CAVE_TURN_MS/3);
  const step=(progress%1)*(walk.points.length-1), segment=Math.floor(step), t=step-segment;
  const a=walk.points[segment]!, b=walk.points[segment+1]!;
  const facing=b.y<a.y?4:b.y>a.y?0:b.x<a.x?12:8;
  return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,
    frame:facing+Math.floor(clock/220)%4,sitting:false};
}
