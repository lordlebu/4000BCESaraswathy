// The Aravali strait's traffic: a ship that crosses, two fishing boats that work, two kites on ropes
// from the islands' edges, and a whale calf that surfaces. And two kites at Dwarka's caravan camp.
//
// **For looking at, and nothing else** (the owner's ruling, 3 October 2026). Nothing here can be
// boarded, tapped or talked to, and nothing is saved: where each thing is answers from the seed and
// the clock alone, the way a traveller's position does (`travellers.ts`), so it costs no save
// version. The scene draws it (`game/systems/StraitView.ts`); this file only says where.
//
// The rules, each the owner's word or what the ground needs:
//
//   - **The ship crosses the map edge to edge**, along a row of open water four deep, so its sails
//     never cross an island. It passes under the line, as canon says boats do.
//   - **The fishing boats work a loop** of open sea, clear of land and of the line by a tile, away
//     from the ship's lane. A loop is a rectangle walked round, so the boats are seen from all four
//     sides -- the side views, the stern going north and the bow coming south.
//   - **The kites fly on a rope of three or four tiles** from an island's edge, out over open water,
//     and neither kite nor rope comes near the track. Their shadows fall far below, on the water.
//   - **The whale surfaces in deep water**, two tiles from anything, away from the boats.
//   - **Nothing passes under an island.** Every tile a boat or the whale uses has open sea round it.
//
// Pure: no Phaser, no clock read here. The scene passes the time in.

import { tileHash } from '../world/rng';
import type { Point, World } from '../world/types';

export type StraitFacing = 'up' | 'down' | 'left' | 'right';

/** The maps with traffic of any kind: the strait itself, and Dwarka's caravan camp for the kites. */
export const STRAIT_MAP = 'field_map_aravali';
export const CARAVAN_MAP = 'field_map_dwarka';
export const CARAVAN_POI = 'poi_caravan_camp';

/** How long the ship takes to cross, as a share of a day, and how many times a day it does. */
export const CROSSING_DAYS = 0.12;
/** How long a fishing boat takes to go once round its loop, as a share of a day. */
export const LAP_DAYS = 0.08;
/** A kite's rope, in tiles, at rest. It breathes half a tile either side as the wind moves. */
export const KITE_REACH = 3.5;
/** How far below its kite a shadow falls, in tiles: the height it flies at, read as a drop. */
export const KITE_HEIGHT = 2;
/** A fishing loop's size, in tiles: six along, three across. */
const LOOP_W = 6;
const LOOP_H = 3;
/** How many places a whale may come up in. */
const WHALE_SPOTS = 6;

export interface FishingLoop {
  id: 'fishing-white' | 'fishing-madder';
  /** The rectangle walked round, inclusive tile corners. */
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** Where on its lap this boat starts the day, 0 to 1, so the two are not in step. */
  offset: number;
}

export interface Kite {
  id: 'kite-turmeric' | 'kite-striped';
  /** The tile the rope is tied to. */
  anchor: Point;
  /** Which way it flies out, a unit step. */
  out: Point;
}

export interface Strait {
  /** The row the ship's hull runs along, or null where there is no ship. */
  lane: number | null;
  loops: FishingLoop[];
  kites: Kite[];
  whaleSpots: Point[];
}

/** Where a boat is, in tiles (fractional: it moves between them), and which way it faces. */
export interface Placed {
  x: number;
  y: number;
  facing: StraitFacing;
}

const STEPS: readonly Point[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 }
];

function biomeAt(world: World, x: number, y: number): string | null {
  return world.tiles[y]?.[x]?.biome ?? null;
}

/** Open sea all round: every tile within `r` is sea, and, unless allowed, none of it is track. */
function openWater(world: World, x: number, y: number, r: number, track = false): boolean {
  for (let dy = -r; dy <= r; dy += 1) {
    for (let dx = -r; dx <= r; dx += 1) {
      const t = world.tiles[y + dy]?.[x + dx];
      if (!t || t.biome !== 'sea') return false;
      if (!track && t.track) return false;
    }
  }
  return true;
}

/** A whole row of sea, the line allowed: what a ship can cross on. */
function seaRow(world: World, y: number): boolean {
  if (y < 0 || y >= world.height) return false;
  return world.tiles[y]!.every((t) => t.biome === 'sea');
}

/**
 * The ship's lane: a row whose hull row, the two above it (the sails reach a tile and a half up)
 * and the one below are all open sea. The middle of the candidates, which on the Aravali is the
 * channel between the two islands -- where it is seen from the line.
 */
function laneOf(world: World): number | null {
  const rows: number[] = [];
  for (let y = 2; y < world.height - 1; y += 1) {
    if ([y - 2, y - 1, y, y + 1].every((r) => seaRow(world, r))) rows.push(y);
  }
  return rows.length > 0 ? rows[Math.floor(rows.length / 2)]! : null;
}

/** The fishing loops: rectangles of open water, a tile clear all round, away from the lane. */
function loopsOf(world: World, lane: number | null): FishingLoop[] {
  const fits = (x0: number, y0: number): boolean => {
    for (let y = y0; y < y0 + LOOP_H; y += 1) {
      if (lane !== null && Math.abs(y - lane) <= 3) return false;
      for (let x = x0; x < x0 + LOOP_W; x += 1) {
        const edge = y === y0 || y === y0 + LOOP_H - 1 || x === x0 || x === x0 + LOOP_W - 1;
        // The row above an edge tile too, for the sail.
        if (edge && (!openWater(world, x, y, 1) || !openWater(world, x, y - 1, 1))) return false;
      }
    }
    return true;
  };
  const candidates: { x0: number; y0: number; rank: number }[] = [];
  for (let y0 = 2; y0 + LOOP_H < world.height - 1; y0 += 1) {
    for (let x0 = 1; x0 + LOOP_W < world.width - 1; x0 += 1) {
      if (fits(x0, y0)) candidates.push({ x0, y0, rank: tileHash(world.seed, x0, y0, 'fishing-loop') });
    }
  }
  candidates.sort((a, b) => a.rank - b.rank);
  const out: FishingLoop[] = [];
  for (const id of ['fishing-white', 'fishing-madder'] as const) {
    const pick = candidates.find((c) =>
      out.every((o) => c.x0 > o.x1 + 4 || c.x0 + LOOP_W - 1 < o.x0 - 4 || c.y0 > o.y1 + 4 || c.y0 + LOOP_H - 1 < o.y0 - 4)
    );
    if (!pick) break;
    out.push({
      id,
      x0: pick.x0,
      y0: pick.y0,
      x1: pick.x0 + LOOP_W - 1,
      y1: pick.y0 + LOOP_H - 1,
      offset: (tileHash(world.seed, pick.x0, pick.y0, id) % 1000) / 1000
    });
  }
  return out;
}

/** Whether a kite flying from `anchor` towards `out` stays clear of the track, rope and all. */
function clearOfTrack(world: World, anchor: Point, out: Point): boolean {
  // The whole sweep: as far as the rope can reach and half a rope either side.
  for (let k = 0; k <= Math.ceil(KITE_REACH) + 2; k += 1) {
    for (let side = -2; side <= 2; side += 1) {
      const x = anchor.x + out.x * k + out.y * side;
      const y = anchor.y + out.y * k + out.x * side;
      if (world.tiles[y]?.[x]?.track) return false;
    }
  }
  return true;
}

/** The angles and lengths a kite's rope can take, as `kiteAt` swings it. */
const SWING = 0.33;
const BREATH = 0.5;

/** Whether everywhere a kite can swing to has open sea under its shadow and is not over the island. */
function sweepClear(world: World, anchor: Point, out: Point): boolean {
  const base = Math.atan2(out.y, out.x);
  const tieX = anchor.x + 0.5 + out.x * 0.5;
  const tieY = anchor.y + 0.5 + out.y * 0.5;
  for (const a of [-SWING, -SWING / 2, 0, SWING / 2, SWING]) {
    for (const r of [KITE_REACH - BREATH, KITE_REACH, KITE_REACH + BREATH]) {
      const x = tieX + Math.cos(base + a) * r;
      const y = tieY + Math.sin(base + a) * r;
      const at = biomeAt(world, Math.floor(x), Math.floor(y));
      if (at === null || at === 'sky_island') return false;
      if (biomeAt(world, Math.floor(x), Math.floor(y + KITE_HEIGHT)) !== 'sea') return false;
    }
  }
  return true;
}

/**
 * The Aravali's kites: tied to the edge of an island, flying out over open water. An edge is an
 * island tile with open air beyond it -- no island and no sky pool for the length of the rope -- and
 * sea under where the kite and its shadow fall. East and west first, along the strait, because that
 * is where the wind runs; a second kite at least eight tiles from the first.
 */
function islandKites(world: World): Kite[] {
  const candidates: { anchor: Point; out: Point; rank: number }[] = [];
  for (let y = 0; y < world.height; y += 1) {
    for (let x = 0; x < world.width; x += 1) {
      if (biomeAt(world, x, y) !== 'sky_island' || world.tiles[y]![x]!.track) continue;
      for (const out of STEPS) {
        const air = [1, 2, 3, 4].every((k) => {
          const b = biomeAt(world, x + out.x * k, y + out.y * k);
          return b !== null && b !== 'sky_island' && b !== 'sky_water';
        });
        if (!air) continue;
        // The whole arc it swings through, not only where it rests: the shadow on open sea and the
        // kite off the island everywhere the wind can take it. Resting alone let a shadow swing onto
        // an island's underside at the far end of its arc.
        if (!sweepClear(world, { x, y }, out)) continue;
        if (!clearOfTrack(world, { x, y }, out)) continue;
        // Along the strait first: east and west outrank north and south.
        const rank = (out.y === 0 ? 0 : 1 << 30) + (tileHash(world.seed, x, y, `kite:${out.x},${out.y}`) % (1 << 30));
        candidates.push({ anchor: { x, y }, out, rank });
      }
    }
  }
  candidates.sort((a, b) => a.rank - b.rank);
  const out: Kite[] = [];
  for (const id of ['kite-turmeric', 'kite-striped'] as const) {
    const pick = candidates.find((c) => out.every((o) => Math.max(Math.abs(c.anchor.x - o.anchor.x), Math.abs(c.anchor.y - o.anchor.y)) >= 8));
    if (!pick) break;
    out.push({ id, anchor: pick.anchor, out: pick.out });
  }
  return out;
}

/** Dwarka's two kites, tied at the caravan camp and flying out over the ground in two directions. */
function caravanKites(world: World, at: Point): Kite[] {
  const room = STEPS.filter((d) => {
    const x = at.x + d.x * 5, y = at.y + d.y * 5;
    return x >= 0 && y >= 0 && x < world.width && y + KITE_HEIGHT < world.height;
  });
  const ranked = [...room].sort(
    (a, b) => tileHash(world.seed, a.x, a.y, 'caravan-kite') - tileHash(world.seed, b.x, b.y, 'caravan-kite')
  );
  return (['kite-turmeric', 'kite-striped'] as const)
    .map((id, i) => (ranked[i] ? { id, anchor: { ...at }, out: ranked[i]! } : null))
    .filter((k): k is Kite => k !== null);
}

/** Where the whale may come up: deep water, two tiles from anything, away from the boats' work. */
function whaleSpotsOf(world: World, lane: number | null, loops: readonly FishingLoop[]): Point[] {
  const candidates: { at: Point; rank: number }[] = [];
  for (let y = 2; y < world.height - 2; y += 1) {
    if (lane !== null && Math.abs(y - lane) <= 2) continue;
    for (let x = 2; x < world.width - 2; x += 1) {
      if (!openWater(world, x, y, 2)) continue;
      if (loops.some((l) => x >= l.x0 - 3 && x <= l.x1 + 3 && y >= l.y0 - 3 && y <= l.y1 + 3)) continue;
      candidates.push({ at: { x, y }, rank: tileHash(world.seed, x, y, 'whale') });
    }
  }
  candidates.sort((a, b) => a.rank - b.rank);
  return candidates.slice(0, WHALE_SPOTS).map((c) => c.at);
}

/**
 * The traffic a map has, or null for a map with none. `placed` is where the points of interest
 * landed, which is how Dwarka's kites find the caravan camp.
 */
export function straitOn(
  world: World,
  fieldMapId: string,
  placed: readonly { poiId: string; at: Point }[] = []
): Strait | null {
  if (fieldMapId === STRAIT_MAP) {
    const lane = laneOf(world);
    const loops = loopsOf(world, lane);
    return { lane, loops, kites: islandKites(world), whaleSpots: whaleSpotsOf(world, lane, loops) };
  }
  if (fieldMapId === CARAVAN_MAP) {
    const camp = placed.find((p) => p.poiId === CARAVAN_POI);
    return camp ? { lane: null, loops: [], kites: caravanKites(world, camp.at), whaleSpots: [] } : null;
  }
  return null;
}

/** A fraction of a 0..1 hash, for a day's timetable. */
const fraction = (seed: string, day: number, salt: string): number => (tileHash(seed, day, 0, salt) % 10_000) / 10_000;

/**
 * Where the ship is, `days` into the journey (fractional), or null while it is off the map.
 *
 * Twice a day: east in the morning window, west in the afternoon one, each starting at a seeded
 * moment, so the ship is an event to look up and see rather than wallpaper. It enters and leaves
 * four tiles beyond the edges, so it is never seen to appear.
 */
export function shipAt(world: World, strait: Strait, days: number): Placed | null {
  if (strait.lane === null) return null;
  const day = Math.floor(days);
  const u = days - day;
  const windows = [
    { from: 0.08 + 0.22 * fraction(world.seed, day, 'ship-am'), facing: 'right' as const },
    { from: 0.55 + 0.22 * fraction(world.seed, day, 'ship-pm'), facing: 'left' as const }
  ];
  for (const w of windows) {
    if (u < w.from || u >= w.from + CROSSING_DAYS) continue;
    const t = (u - w.from) / CROSSING_DAYS;
    const span = world.width + 8;
    const x = w.facing === 'right' ? -4 + t * span : world.width + 4 - t * span;
    return { x, y: strait.lane, facing: w.facing };
  }
  return null;
}

/**
 * Where a fishing boat is on its loop: east along the top, south down the right (the bow coming
 * towards you), west along the bottom, north up the left (the stern going away).
 */
export function fishingAt(loop: FishingLoop, days: number): Placed {
  const w = loop.x1 - loop.x0;
  const h = loop.y1 - loop.y0;
  const lap = 2 * (w + h);
  const f = (((days / LAP_DAYS + loop.offset) % 1) + 1) % 1;
  let d = f * lap;
  if (d < w) return { x: loop.x0 + d, y: loop.y0, facing: 'right' };
  d -= w;
  if (d < h) return { x: loop.x1, y: loop.y0 + d, facing: 'down' };
  d -= h;
  if (d < w) return { x: loop.x1 - d, y: loop.y1, facing: 'left' };
  d -= w;
  return { x: loop.x0, y: loop.y1 - d, facing: 'up' };
}

/**
 * Where a kite is at `seconds` of the scene's own clock, in tiles, and the point it is tied at.
 *
 * Wind is presentation, so it runs on the loop's clock rather than the journey's: the kite swings
 * a third of a radian either way and its rope breathes half a tile, on two periods that do not
 * share a beat. **It faces its anchor**, nose into the wind with the streamers trailing away, as a
 * kite does -- so a kite flown east of its island points west.
 */
export function kiteAt(kite: Kite, seconds: number): Placed & { tieX: number; tieY: number } {
  const phase = (tileHash('kite', kite.anchor.x, kite.anchor.y, kite.id) % 1000) / 160;
  const base = Math.atan2(kite.out.y, kite.out.x);
  const angle = base + SWING * Math.sin((2 * Math.PI * seconds) / 9 + phase);
  const reach = KITE_REACH + BREATH * Math.sin((2 * Math.PI * seconds) / 6.5 + phase * 1.7);
  // Tied at the edge of the anchor tile facing out, not its middle.
  const tieX = kite.anchor.x + 0.5 + kite.out.x * 0.5;
  const tieY = kite.anchor.y + 0.5 + kite.out.y * 0.5;
  const x = tieX + Math.cos(angle) * reach;
  const y = tieY + Math.sin(angle) * reach;
  const dx = tieX - x;
  const dy = tieY - y;
  const facing: StraitFacing = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
  return { x, y, facing, tieX, tieY };
}

/** How long one surfacing takes, start to gone, in seconds of the scene's clock. */
export const WHALE_CYCLE_S = 40;
/** Rising, up, sinking: the slow part is the owner's ask. The rest of the cycle it is under. */
export const WHALE_RISE_S = 5;
export const WHALE_UP_S = 7;
export const WHALE_SINK_S = 5;

/**
 * The whale, at `seconds` of the scene's clock: where it is and how far up, 0 (under) to 1 (its back
 * clear), and how much spout, 0 to 1. Null between surfacings. Presentation, like the kites' wind.
 */
export function whaleAt(
  strait: Strait,
  seconds: number
): { at: Point; up: number; spout: number } | null {
  if (strait.whaleSpots.length === 0) return null;
  const cycle = Math.floor(seconds / WHALE_CYCLE_S);
  const t = seconds - cycle * WHALE_CYCLE_S;
  const at = strait.whaleSpots[cycle % strait.whaleSpots.length]!;
  if (t < WHALE_RISE_S) return { at, up: t / WHALE_RISE_S, spout: 0 };
  if (t < WHALE_RISE_S + WHALE_UP_S) {
    const s = (t - WHALE_RISE_S) / WHALE_UP_S;
    // The spout in the middle of the time up: it rises, holds, and falls away.
    const spout = s < 0.2 || s > 0.85 ? 0 : Math.sin(((s - 0.2) / 0.65) * Math.PI);
    return { at, up: 1, spout };
  }
  if (t < WHALE_RISE_S + WHALE_UP_S + WHALE_SINK_S) {
    return { at, up: 1 - (t - WHALE_RISE_S - WHALE_UP_S) / WHALE_SINK_S, spout: 0 };
  }
  return null;
}

/** How far over the sea you see from an island or the line, in tiles. */
export const STRAIT_SIGHT = 8;

/**
 * **The sea is seen from above**: standing on an island or on the line, the open water within
 * `STRAIT_SIGHT` tiles, as `${x},${y}` keys, for the scene to lift to the remembered shade.
 *
 * The twin of "the road ahead is seen from the road" (`game/roadLight.ts`), and needed for the same
 * reason: a traveller's own sight is two tiles, nobody walks the open sea, and without this the
 * strait's ships, kites and whale would sit under unexplored dark for the whole of a crossing. Only
 * sea is revealed -- the islands' own ground is still found by walking it -- and only on the
 * Aravali, where the islands stand above the water.
 */
export function seaSeenFrom(world: World, fieldMapId: string, at: Point): string[] {
  if (fieldMapId !== STRAIT_MAP) return [];
  const here = world.tiles[at.y]?.[at.x];
  if (!here || (here.biome !== 'sky_island' && !here.track)) return [];
  const out: string[] = [];
  for (let dy = -STRAIT_SIGHT; dy <= STRAIT_SIGHT; dy += 1) {
    for (let dx = -STRAIT_SIGHT; dx <= STRAIT_SIGHT; dx += 1) {
      if (Math.hypot(dx, dy) > STRAIT_SIGHT) continue;
      const t = world.tiles[at.y + dy]?.[at.x + dx];
      if (t && t.biome === 'sea') out.push(`${at.x + dx},${at.y + dy}`);
    }
  }
  return out;
}
