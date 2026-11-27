import { band } from '../world/classify';
import { orthogonalNeighbours } from '../world/rivers';
import { tileHash } from '../world/rng';
import type { Point, World } from '../world/types';
import { TWIN_MAP } from '../world/twinGeneration';
import type { ElamiteRole } from './elamitePeople';
import { CAMP_DAY } from './tiers';

export interface CaravanSchedule {
  revision: 2;
  firstCycle: number;
}

export function caravanSchedule(firstCycle = 0): CaravanSchedule {
  return { revision: 2, firstCycle };
}

export interface CaravanVisit {
  id: string;
  wagon: 'covered' | 'open';
  cargoLayout: 0 | 1;
  thirdRole: Exclude<ElamiteRole, 'master' | 'handler'>;
  route: readonly Point[];
}

export type CaravanStage = 'arrival' | 'travelling' | 'pitching' | 'established' | 'packing' | 'departure' | 'aftermath';

const THIRD_ROLES = ['seal-keeper', 'textile-merchant', 'artisan', 'apprentice', 'wool-dresser'] as const;
const WAGON_GROUND = new Set(['plains', 'hills', 'desert']);
const OFFSETS = [-1, 0, 1] as const;

const distance = (a: Point, b: Point) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
const routeCache = new WeakMap<World, Map<string, readonly Point[] | null>>();
const key = (p: Point) => `${p.x},${p.y}`;

/**
 * The centered three-by-three envelope covers the coupled cart and animal in either orientation
 * and through a right-angle turn. The only permitted overhang is off the western entry edge.
 */
function wagonFits(world: World, at: Point, protectedPlaces: readonly Point[]): boolean {
  const center = world.tiles[at.y]?.[at.x];
  if (!center) return false;
  for (const dy of OFFSETS) {
    for (const dx of OFFSETS) {
      const p = { x: at.x + dx, y: at.y + dy };
      if (p.x < 0) continue;
      const tile = world.tiles[p.y]?.[p.x];
      if (!tile || !WAGON_GROUND.has(tile.biome) || tile.track || tile.bridge || tile.ford || tile.plank ||
          band(tile.elevation) !== band(center.elevation) ||
          protectedPlaces.some((place) => distance(place, p) < 2)) return false;
    }
  }
  return true;
}

/** Shortest westbound route through the baked map. Reversing it gives the arrival route. */
export function westernCaravanRoute(
  world: World, campsite: Point, places: readonly Point[]
): readonly Point[] | null {
  const protectedPlaces = [...places, ...(world.twinRegion?.residentialLots ?? [])];
  if (campsite.x < 2 || !wagonFits(world, campsite, protectedPlaces)) return null;

  const previous = new Map<string, Point | null>([[key(campsite), null]]);
  const queue = [campsite];
  for (let i = 0; i < queue.length; i++) {
    const at = queue[i]!;
    if (at.x === 0) {
      const route: Point[] = [];
      for (let p: Point | null = at; p; p = previous.get(key(p)) ?? null) route.push(p);
      return route;
    }
    for (const next of orthogonalNeighbours(at, world.width, world.height)) {
      const nextKey = key(next);
      if (previous.has(nextKey) || !wagonFits(world, next, protectedPlaces)) continue;
      previous.set(nextKey, at);
      queue.push(next);
    }
  }
  return null;
}

export function elamiteCaravanVisit(
  world: World, fieldMapId: string, cycle: number, schedule: CaravanSchedule,
  campsites: readonly Point[], places: readonly Point[]
): CaravanVisit | null {
  if (fieldMapId !== TWIN_MAP || !world.twinRegion || cycle < schedule.firstCycle) return null;
  const roll = (salt: string) => tileHash(world.seed, cycle, 0, `elamite:v${schedule.revision}:${salt}`);
  if (roll('visit') % 4 !== 0) return null;
  let routes = routeCache.get(world);
  if (!routes) routeCache.set(world, (routes = new Map()));
  const protectedKey = places.map(key).join(';');
  for (const campsite of campsites) {
    const cacheKey = `${key(campsite)}:${protectedKey}`;
    if (!routes.has(cacheKey)) routes.set(cacheKey, westernCaravanRoute(world, campsite, places));
    const route = routes.get(cacheKey);
    if (!route) continue;
    return {
      id: `${fieldMapId}:${cycle}:elamite-v${schedule.revision}`,
      wagon: roll('wagon') % 2 === 0 ? 'covered' : 'open',
      cargoLayout: roll('cargo') % 2 === 0 ? 0 : 1,
      thirdRole: THIRD_ROLES[roll('roster') % THIRD_ROLES.length]!,
      route
    };
  }
  return null;
}

/** Reconstruct the visible stage without keeping timers or storing a wagon position. */
export function caravanStage(
  from: number, to: number, day: number, hour: number
): { stage: CaravanStage; routeProgress: number } | null {
  if (day < from || day >= to) return null;
  if (day === from && hour >= 6 && hour < CAMP_DAY.pitched) {
    if (hour < 7) return { stage: 'arrival', routeProgress: 0 };
    if (hour < 9) return { stage: 'travelling', routeProgress: (hour - 7) / 2 };
    return { stage: 'pitching', routeProgress: 1 };
  }
  // Journey days are counted from dawn. Hours after midnight belong to the same visit day.
  if (day === to - 1 && hour < 6) return { stage: 'aftermath', routeProgress: 0 };
  if (day === to - 1 && hour >= CAMP_DAY.strike) {
    if (hour < 16) return { stage: 'packing', routeProgress: 1 };
    if (hour < 19) return { stage: 'departure', routeProgress: (19 - hour) / 3 };
    return { stage: 'aftermath', routeProgress: 0 };
  }
  return { stage: 'established', routeProgress: 1 };
}
