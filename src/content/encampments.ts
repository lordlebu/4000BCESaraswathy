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
