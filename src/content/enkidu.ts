import { orthogonalNeighbours } from '../world/rivers';
import type { Point, World } from '../world/types';
import { caravanStageAt, type Encampment } from './encampments';
import { tileHash } from '../world/rng';
import type { Traveller } from './travellers';
import { TWIN_MAP } from '../world/twinGeneration';
import type { EventStranger } from './events';

export const ENKIDU_ID = 'npc_enkidu';
export const ENKIDU_MET = 'met:npc_enkidu';
export const ENKIDU_FOLLOWS = 'companion:npc_enkidu';

export const ENKIDU_JOINED = 'recruited:npc_enkidu';

export const ENKIDU_TRAVELLER: Traveller = {
  id: ENKIDU_ID, name: 'Enkidu', role: 'pangolin adventurer',
  npcId: ENKIDU_ID, art: 'enkidu', circuit: [], conveyance: null, culture: null, givenName: 'Enkidu',
  look: { body: 'enkidu', skin: 'as-painted', cloth: 'ochre', second: 'undyed' }
};

export function caravanCarriesEnkidu(seed: string, visitId: string): boolean {
  return tileHash(seed, 0, 0, `enkidu:guest:${visitId}`) % 10 === 0;
}

export function caravanEnkiduPosition(world: World, camp: Encampment, day: number): Point | null {
  if (!camp.caravan || !caravanCarriesEnkidu(world.seed, camp.caravan.id)) return null;
  const state = caravanStageAt(world, camp, day);
  if (!state || state.stage === 'aftermath') return null;
  const { route } = camp.caravan;
  if (state.stage === 'established' || state.stage === 'pitching' || state.stage === 'packing') {
    return orthogonalNeighbours(camp.at, world.width, world.height)
      .filter((p) => enkiduDry(world, p) && !route.slice(-2).some((r) => r.x === p.x && r.y === p.y)).at(-1)
      ?? camp.at;
  }
  const index = Math.round(state.routeProgress * (route.length - 1));
  const besideWagon = Math.max(0, Math.min(route.length - 1, index + (state.stage === 'departure' ? 2 : -2)));
  return route[besideWagon] ?? null;
}

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

export const ENKIDU_STRANGER: EventStranger = {
  id: `${TWIN_MAP}:${ENKIDU_ID}`, role: ENKIDU_TRAVELLER.role, givenName: 'Enkidu', culture: null,
  look: ENKIDU_TRAVELLER.look!
};
