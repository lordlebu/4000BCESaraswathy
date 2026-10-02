// Camps that come and go, where the roads do not reach.
//
// **The Settling In plan's Phase 3.** The owner: "for sections which do not have roads we will need
// events -- maybe have adventurer or dacoit camps prop up in a single tile and then disappear, with
// an event triggering and people talking about it." A camp pitches on one tile for a few days and
// is gone, and there is usually a gap before the next. People on the road talk about it while it is
// there (`rumours.ts`), and walking up to it opens its scene (`camp` in `happenings.ts`).
//
// **Nothing is saved.** Where and when a camp stands is a pure function of the seed, the map and the
// day, like a traveller's position and a wandering animal's. The same seed puts the same drovers in
// the same hollow on every machine, and adding them cost no save version.
//
// **Dacoits are people with wants, never a threat.** The owner's ruling, Q1: they hold a ford for a
// toll you talk your way past, or they have robbed somebody you will meet. They never touch the
// player and nothing can be lost to them -- every choice at a camp is takeable and none is worse.

import type { Point, World } from '../world/types';
import { isWalkable } from '../world/generate';
import { tileHash } from '../world/rng';
import { Heap } from '../world/heap';
import { orthogonalNeighbours } from '../world/rivers';
import { stepCostOn } from './species';

export type CampKind = 'adventurers' | 'dacoits' | 'pilgrims' | 'drovers';

export const CAMP_KINDS: readonly CampKind[] = ['adventurers', 'dacoits', 'pilgrims', 'drovers'];

export interface Encampment {
  /** Stable for one camp's stay: `<map>:<cycle>`. What "seen" is kept against. */
  id: string;
  kind: CampKind;
  at: Point;
  /** The first day it stands, and the day after its last. */
  from: number;
  to: number;
  /** The nearest place, for a sentence: "out past the Marsh Shrine". */
  near: string | null;
}

/** How many days make one camp's turn: its stay and the quiet after it. */
export const CYCLE_DAYS = 6;
/** How long a camp stands. */
export const STAY_DAYS = 3;
/** The first day a camp can stand. The first day of a journey belongs to the map, as it does for events. */
export const FIRST_DAY = 1;
/** How far from any place a camp pitches: out of the way, where nobody would already be. */
export const AWAY_FROM_PLACES = 5;
/** How far from any road, so a camp is somewhere the roads do not reach. */
export const AWAY_FROM_ROADS = 3;

/** Ground a camp pitches on: dry, and not built on. */
const CAMP_GROUND = new Set(['plains', 'forest', 'hills', 'desert', 'settlement', 'snow']);

const candidates = new WeakMap<World, Map<string, Point[]>>();

/**
 * Where a camp could pitch on this map: dry ground, off every way, away from places and roads.
 *
 * Ranked furthest-from-a-road first, so the camps fill the parts the roads leave out, which is the
 * owner's point. Cached on the world, since it is a pure function of the ground.
 */
export function campGround(world: World, places: readonly Point[]): Point[] {
  let known = candidates.get(world);
  if (!known) candidates.set(world, (known = new Map()));
  const key = places.map((p) => `${p.x},${p.y}`).join(';');
  const had = known.get(key);
  if (had) return had;

  const roads: Point[] = [];
  for (const row of world.tiles) for (const t of row) if (t.road || t.track) roads.push({ x: t.x, y: t.y });
  const far = (p: Point, from: readonly Point[], d: number) =>
    from.every((q) => Math.max(Math.abs(p.x - q.x), Math.abs(p.y - q.y)) >= d);
  const toRoad = (p: Point) =>
    roads.reduce((best, q) => Math.min(best, Math.max(Math.abs(p.x - q.x), Math.abs(p.y - q.y))), Infinity);

  const out: { p: Point; d: number }[] = [];
  for (const row of world.tiles) {
    for (const t of row) {
      if (!CAMP_GROUND.has(t.biome) || !isWalkable(t) || t.road || t.ford || t.bridge || t.track) continue;
      const p = { x: t.x, y: t.y };
      if (!far(p, places, AWAY_FROM_PLACES)) continue;
      const d = toRoad(p);
      if (d < AWAY_FROM_ROADS) continue;
      out.push({ p, d });
    }
  }
  out.sort((a, b) => b.d - a.d || a.p.y - b.p.y || a.p.x - b.p.x);
  const ranked = out.map((o) => o.p);
  known.set(key, ranked);
  return ranked;
}

/**
 * The camp standing on this map today, or null.
 *
 * One at a time. Each turn of `CYCLE_DAYS` has a stay of `STAY_DAYS` starting on a seeded day within
 * it; the kind and the tile are seeded too, the tile from the better-hidden half of the ground.
 */
export function encampmentOn(
  world: World,
  fieldMapId: string,
  places: readonly { poiId: string; at: Point }[],
  day: number
): Encampment | null {
  if (day < FIRST_DAY) return null;
  const cycle = Math.floor(day / CYCLE_DAYS);
  const hash = (salt: string) => tileHash(world.seed, cycle, 0, `camp:${fieldMapId}:${salt}`);
  const from = cycle * CYCLE_DAYS + (hash('start') % (CYCLE_DAYS - STAY_DAYS + 1));
  const to = from + STAY_DAYS;
  if (day < Math.max(from, FIRST_DAY) || day >= to) return null;

  const ground = campGround(world, places.map((p) => p.at));
  if (ground.length === 0) return null;
  const hidden = ground.slice(0, Math.max(1, Math.ceil(ground.length / 2)));
  const at = hidden[hash('tile') % hidden.length]!;
  const kind = CAMP_KINDS[hash('kind') % CAMP_KINDS.length]!;

  let near: string | null = null;
  let best = Infinity;
  for (const p of places) {
    const d = Math.max(Math.abs(p.at.x - at.x), Math.abs(p.at.y - at.y));
    if (d < best) {
      best = d;
      near = p.poiId;
    }
  }
  return { id: `${fieldMapId}:${cycle}`, kind, at, from, to, near };
}

/** Whether the player is close enough to have walked up to it: beside it or on it. */
export function atCamp(camp: Encampment, player: Point): boolean {
  return Math.max(Math.abs(camp.at.x - player.x), Math.abs(camp.at.y - player.y)) <= 1;
}

/**
 * How many of the tiles round the fire a camp's own things stand on: its shelter and the things set
 * about the fire. The scene draws them there (`CAMP_LAYOUT` in `game/campArt.ts`, which
 * `test/campLife.test.ts` holds to this), and nobody at the camp may stand on one.
 */
export const PROPS_AROUND: Readonly<Record<CampKind, number>> = {
  adventurers: 3,
  dacoits: 3,
  pilgrims: 3,
  drovers: 2
};

/**
 * Where a camp's things stand and its people can: the fire, then the tiles round it in the order
 * the camp's own seed lays them out.
 *
 * **Moved here from the scene so the people and the props agree.** `pitchCamp` drew the shelter
 * and the things about the fire on these tiles before anybody lived at a camp; a person placed by a
 * second copy of the rule would sooner or later stand inside the tent. The shelter takes a tile
 * behind the fire, the rest to either side, each in a seeded order so two camps are not laid out
 * alike, and only walkable ground off the road.
 */
export function campSpots(world: World, camp: Encampment): { fire: Point; around: Point[] } {
  const open = (d: Point): boolean => {
    const tile = world.tiles[camp.at.y + d.y]?.[camp.at.x + d.x];
    return tile !== undefined && isWalkable(tile) && !tile.road;
  };
  const shuffled = (ds: Point[], salt: string) =>
    ds
      .map((d) => ({ d, r: tileHash(world.seed, camp.at.x + d.x, camp.at.y + d.y, `${salt}:${camp.id}`) }))
      .sort((a, b) => a.r - b.r)
      .map(({ d }) => d);
  const back = shuffled([{ x: 0, y: -1 }, { x: -1, y: -1 }, { x: 1, y: -1 }], 'camp-back').filter(open);
  const sides = shuffled([{ x: -1, y: 0 }, { x: 1, y: 0 }, { x: -1, y: 1 }, { x: 1, y: 1 }], 'camp-side').filter(open);
  const shelterAt = back[0] ?? sides[0];
  const rest = [...sides, ...back].filter((d) => d !== shelterAt);
  const around = [shelterAt, ...rest]
    .filter((d): d is Point => d !== undefined)
    .map((d) => ({ x: camp.at.x + d.x, y: camp.at.y + d.y }));
  return { fire: camp.at, around };
}

/** The way in to a camp from the road: where it leaves the road, and every tile to the fire. */
export interface WayIn {
  /** The road tile it leaves from. */
  turnOff: Point;
  /** From the turn-off to the camp's own tile, both ends included. */
  tiles: Point[];
  /** What it costs to walk, in the same steps `stepCostOn` prices the walker's own. */
  cost: number;
}

const ways = new WeakMap<World, Map<string, WayIn | null>>();

/**
 * The cheapest walk to a camp from a road somebody walks.
 *
 * **Priced by the ground, so it goes the way a person would.** Woods, shallows and hills cost what
 * they cost the player; mountains and rivers more, and deep water and the railway not at all. `wayBetween` cannot
 * be used for this: its flat eight-to-one off the road prices a mountain like a meadow, and the way
 * it finds walks straight over the top.
 *
 * **From a road somebody walks, not any road.** A camp's runner meets travellers where it leaves the
 * road, and its visitors turn off there, so the turn-off has to be on a traveller's way. `walked`
 * is those road tiles as `x,y` keys; any road at all is the fallback when nobody walks this map.
 *
 * One search outward from the fire, stopping at the first road tile it reaches -- the cheapest
 * turn-off and the way to it at once. Cached on the world and the camp.
 */
export function wayIn(world: World, camp: Encampment, walked: ReadonlySet<string>): WayIn | null {
  let known = ways.get(world);
  if (!known) ways.set(world, (known = new Map()));
  const cacheKey = `${camp.id}@${camp.at.x},${camp.at.y}`;
  if (known.has(cacheKey)) return known.get(cacheKey)!;
  // A road somebody walks, on foot, first. Failing that, the nearest road of any kind on foot. And
  // failing both, no way at all: **never along the railway**. On the Aravali about two camps in five
  // sit on ground the line is the only link to -- no road, no place and no start reachable on foot --
  // and the sea under the trestles is not travelled, on the owner's word of 2 October 2026. How the
  // line and the ropes onto the sky islands should work is deferred to its own rethink
  // (`docs/living-camps.md`, "Deferred"); until then such a camp has no trodden way, no runner and
  // no visitor.
  const way = searchWayIn(world, camp, walked) ?? (walked.size > 0 ? searchWayIn(world, camp, new Set()) : null);
  known.set(cacheKey, way);
  return way;
}

function searchWayIn(world: World, camp: Encampment, walked: ReadonlySet<string>): WayIn | null {

  const key = (p: Point) => `${p.x},${p.y}`;
  const isTurnOff = (p: Point): boolean => {
    const t = world.tiles[p.y]?.[p.x];
    if (!t || !t.road) return false;
    return walked.size === 0 || walked.has(key(p));
  };
  const best = new Map<string, number>([[key(camp.at), 0]]);
  const toward = new Map<string, Point>();
  // The same total order `findPath` keeps, so the way is the same on every machine.
  const frontier = new Heap<{ at: Point; cost: number; seq: number }>(
    (a, b) => a.cost - b.cost || a.at.y - b.at.y || a.at.x - b.at.x || a.seq - b.seq
  );
  frontier.push({ at: camp.at, cost: 0, seq: 0 });
  let seq = 1;
  let found: { at: Point; cost: number } | null = null;
  while (frontier.size) {
    const { at, cost } = frontier.pop()!;
    if (cost > (best.get(key(at)) ?? Infinity)) continue;
    if (isTurnOff(at)) {
      found = { at, cost };
      break;
    }
    // Searching outward, so stepping from here to a neighbour is the walker stepping from that
    // neighbour onto here: the price is this tile's.
    const here = world.tiles[at.y]![at.x]!;
    const step = Math.max(stepCostOn(here), 0.5);
    for (const next of orthogonalNeighbours(at, world.width, world.height)) {
      const tile = world.tiles[next.y]![next.x]!;
      // Never along the railway: on the Aravali the line's trestles are walkable over open sea, and a
      // way in that took them ran out across the strait and over the sky islands.
      if (!isWalkable(tile) || tile.track) continue;
      const total = cost + step;
      if (total >= (best.get(key(next)) ?? Infinity)) continue;
      best.set(key(next), total);
      toward.set(key(next), at);
      frontier.push({ at: next, cost: total, seq: seq++ });
    }
  }
  if (!found) return null;
  const tiles: Point[] = [found.at];
  let step = toward.get(key(found.at));
  while (step) {
    tiles.push(step);
    step = toward.get(key(step));
  }
  return { turnOff: found.at, tiles, cost: found.cost };
}
