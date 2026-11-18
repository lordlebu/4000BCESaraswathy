import type {World} from '../world/types';

export const OTTER_WAKE_LIMIT=8,OTTER_WAKE_MS=1200,OTTER_SWIM_MS=1800;
export interface WakePosition {x:number;y:number}
/** True only for a short real movement over open water, not a day-jump or a bridge deck. */
export function otterWakeStep(world:World,previous:WakePosition|null,next:WakePosition,tileSize=128):boolean{
  if(!previous)return false;
  const distance=Math.hypot(next.x-previous.x,next.y-previous.y);
  if(distance<6||distance>tileSize*1.25)return false;
  const wet=(p:WakePosition)=>{
    const tile=world.tiles[Math.floor((p.y-2)/tileSize)]?.[Math.floor(p.x/tileSize)];
    return Boolean(tile&&['river','sea'].includes(tile.biome)&&!tile.bridge&&!tile.road&&!tile.track);
  };
  return wet(previous)&&wet(next)&&wet({x:(previous.x+next.x)/2,y:(previous.y+next.y)/2});
}
