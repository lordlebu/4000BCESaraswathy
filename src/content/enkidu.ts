import { TWIN_MAP } from '../world/twinGeneration';
import { orthogonalNeighbours } from '../world/rivers';
import type { Point, World } from '../world/types';
import type { GameEvent } from './events';

export const ENKIDU_ID = 'npc_enkidu';
export const ENKIDU_MET = 'met:npc_enkidu';
export const ENKIDU_FOLLOWS = 'companion:npc_enkidu';

const DRY_LANDING = new Set(['plains', 'hills', 'desert', 'settlement', 'coast']);
export function enkiduDry(world: World, at: Point): boolean {
  const tile = world.tiles[at.y]?.[at.x];
  return !!tile && DRY_LANDING.has(tile.biome) && !tile.track;
}

export function enkiduHome(world: World, landing: Point, occupied: readonly Point[]): Point | null {
  const queue = [landing];
  const visited = new Set([`${landing.x},${landing.y}`]);
  for (let i = 0; i < queue.length; i++) {
    const at = queue[i]!;
    if (i > 0 && !occupied.some((p) => p.x === at.x && p.y === at.y)) return at;
    for (const next of orthogonalNeighbours(at, world.width, world.height)) {
      const key = `${next.x},${next.y}`;
      if (visited.has(key) || !enkiduDry(world, next)) continue;
      visited.add(key);
      queue.push(next);
    }
  }
  return null;
}

export function enkiduEncounter(flags: readonly string[]): GameEvent {
  const met = flags.includes(ENKIDU_MET);
  const following = flags.includes(ENKIDU_FOLLOWS);
  return {
    id: 'woven:enkidu',
    subjectId: ENKIDU_ID,
    title: 'Enkidu',
    occasion: 'road',
    once: false,
    art: 'woven-enkidu',
    conditions: { shelter: [], fieldMaps: [TWIN_MAP], fromDay: 0, requires: [], pois: [], camps: [] },
    stranger: {
      id: `${TWIN_MAP}:${ENKIDU_ID}`, role: 'pangolin adventurer', givenName: 'Enkidu', culture: null,
      look: { body: 'enkidu', skin: 'as-painted', cloth: 'ochre', second: 'undyed' }
    },
    prose: following ? 'Enkidu pats the dust off his goggles and looks back down the road.'
      : met ? 'Enkidu lifts his goggles when he sees you. He has been watching the boats come in.'
        : 'A small pangolin waves from the bank. “Enkidu,” he says, adjusting his bronze goggles. “Have you walked far?”',
    choices: [
      following
        ? { id: 'dismiss', label: 'Part ways for now', line: 'Enkidu heads back to his spot at Southern Landing.', needs: [], grants: [], clears: [ENKIDU_FOLLOWS] }
        : { id: 'invite', label: 'Invite Enkidu to travel', line: 'Enkidu pulls his goggles down and falls into step.', needs: [], grants: [], sets: [ENKIDU_MET, ENKIDU_FOLLOWS] },
      { id: 'talk', label: following ? 'Talk about the road' : 'Talk by the landing', line: 'Enkidu tells you which boats he can recognise by their wake.', needs: [], grants: [], sets: [ENKIDU_MET] }
    ]
  };
}
