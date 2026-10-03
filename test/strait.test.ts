// The strait's traffic, held to the ground it moves over, on every seed tried.
//
// The owner's rulings of 3 October 2026: the ship crosses edge to edge, the fishing boats move about,
// the kites fly on a rope of three or four tiles from an island's edge with their shadows on the
// water, the whale rises and sinks slowly, and nothing passes under an island. Drawing is
// `game/systems/StraitView.ts`; what is checked here is where.

import { describe, expect, it } from 'vitest';
import { buildFieldMap } from '../src/world/fieldMap';
import { fieldMap, fieldMaps } from '../src/content/places';
import {
  CARAVAN_MAP,
  CARAVAN_POI,
  FISHING_PACE,
  SHIP_PACE,
  SHIP_REST_S,
  SHIP_SLOW_REACH,
  crossingSeconds,
  KITE_HEIGHT,
  KITE_REACH,
  STRAIT_MAP,
  WHALE_CYCLE_S,
  WHALE_RISE_S,
  fishingAt,
  kiteAt,
  shipAt,
  straitOn,
  whaleAt,
  type Strait
} from '../src/content/strait';
import type { World } from '../src/world/types';

const SEEDS = ['varuna-0', 'tethys', 'shallows', 'a', 'b', 'c', 'strait-7'];

function aravali(seed: string): { world: World; strait: Strait } {
  const built = buildFieldMap(fieldMap(STRAIT_MAP)!, { seed });
  return { world: built.world, strait: straitOn(built.world, STRAIT_MAP)! };
}

/** The tile a point is in. Boats sit on tile centres (whole numbers); a kite floats, and is in the tile it is over. */
const biome = (w: World, x: number, y: number) => w.tiles[Math.floor(y)]?.[Math.floor(x)]?.biome;
const track = (w: World, x: number, y: number) => Boolean(w.tiles[Math.floor(y)]?.[Math.floor(x)]?.track);

describe('which maps have traffic', () => {
  it('is the Aravali, and Dwarka for its kites, and nowhere else', () => {
    for (const map of fieldMaps) {
      const built = buildFieldMap(map, { seed: 'which' });
      const placed = built.placed.map((p) => ({ poiId: p.poi.id, at: p.at }));
      const s = straitOn(built.world, map.id, placed);
      if (map.id === STRAIT_MAP) expect(s?.lane, 'no ship lane on the Aravali').not.toBeNull();
      else if (map.id === CARAVAN_MAP) expect(s?.kites.length).toBe(2);
      else expect(s, `${map.id} has traffic`).toBeNull();
    }
  });

  it('is the same for the same seed', () => {
    expect(aravali('again').strait).toEqual(aravali('again').strait);
  });
});

describe('the ship', () => {
  it('crosses on a row of open water four deep, so its sails never meet an island', () => {
    for (const seed of SEEDS) {
      const { world, strait } = aravali(seed);
      for (const y of [strait.lane! - 2, strait.lane! - 1, strait.lane!, strait.lane! + 1]) {
        for (let x = 0; x < world.width; x += 1) expect(biome(world, x, y), `${seed}: lane ${strait.lane} meets ${x},${y}`).toBe('sea');
      }
    }
  });

  it('comes in from beyond one edge and leaves beyond the other: east, a rest, west, a rest', () => {
    const { world, strait } = aravali('varuna-0');
    const cycle = 2 * (crossingSeconds(world, strait) + SHIP_REST_S);
    // Two whole cycles, starting once the opening crossing is done so every run is seen whole.
    const from = cycle;
    const seen: { facing: string; xs: number[] }[] = [];
    let gap = true;
    for (let s = from; s < from + 2 * cycle; s += 0.5) {
      const ship = shipAt(world, strait, s);
      if (!ship) {
        gap = true;
        continue;
      }
      if (gap || seen.at(-1)!.facing !== ship.facing) seen.push({ facing: ship.facing, xs: [] });
      gap = false;
      seen.at(-1)!.xs.push(ship.x);
    }
    // The cut at `from` may fall mid-crossing; the whole runs inside are what is checked.
    const whole = seen.filter((r) => Math.min(...r.xs) < -2 && Math.max(...r.xs) > world.width + 2);
    expect(whole.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < whole.length; i += 1) expect(whole[i]!.facing).not.toBe(whole[i - 1]!.facing);
    for (const r of whole) {
      const first = r.xs[0]!, last = r.xs.at(-1)!;
      if (r.facing === 'right') expect(first).toBeLessThan(last);
      else expect(first).toBeGreaterThan(last);
    }
  });

  it('is already under way when the scene opens, on every seed', () => {
    for (const seed of SEEDS) {
      const { world, strait } = aravali(seed);
      const ship = shipAt(world, strait, 0);
      expect(ship, `${seed}: an empty channel on arriving`).not.toBeNull();
      expect(ship!.x).toBeGreaterThan(0);
      expect(ship!.x).toBeLessThan(world.width);
    }
  });
});

describe('how fast it all goes', () => {
  // The owner saw the outrigger race. It kept the journey's clock, and a step spends 45 seconds of
  // it. On the scene's clock nothing moves faster than its pace, whatever the traveller does, and
  // everything is slower than the traveller walks (STEP_MS 425 a tile on plains in WorldScene).
  const WALK = 1000 / 425;

  it('slows the ship under the line, both ways, and nowhere near it is it slow', () => {
    for (const seed of SEEDS) {
      const { world, strait } = aravali(seed);
      expect(strait.rails.length, `${seed}: the line never crosses the lane`).toBeGreaterThan(0);
      const rail = strait.rails[0]! + 0.5;
      const speedAt = (facing: 'right' | 'left', near: (x: number) => boolean): number[] => {
        const out: number[] = [];
        for (let s = 0; s < 2 * (crossingSeconds(world, strait) + SHIP_REST_S) * 2; s += 0.5) {
          const a = shipAt(world, strait, s), b = shipAt(world, strait, s + 0.5);
          if (a && b && a.facing === facing && b.facing === facing && near(a.x)) out.push(Math.abs(b.x - a.x) / 0.5);
        }
        return out;
      };
      for (const facing of ['right', 'left'] as const) {
        const under = speedAt(facing, (x) => Math.abs(x - rail) < 0.5);
        const open = speedAt(facing, (x) => strait.rails.every((r) => Math.abs(x - (r + 0.5)) > SHIP_SLOW_REACH + 1));
        expect(under.length, `${seed} ${facing}: never seen under the line`).toBeGreaterThan(0);
        // Measured against open water, not against `SHIP_SLOW`: a bound computed from the setting
        // passed with the slowing switched off.
        expect(Math.max(...under), `${seed} ${facing}: not slowed under the line`).toBeLessThan(Math.min(...open) / 2);
        expect(Math.min(...open), `${seed} ${facing}: slow in open water`).toBeGreaterThan(SHIP_PACE * 0.95);
      }
    }
  });

  it('never moves a craft faster than its pace, and both are slower than walking', () => {
    const { world, strait } = aravali('varuna-0');
    expect(SHIP_PACE).toBeLessThan(WALK / 3);
    expect(FISHING_PACE).toBeLessThan(SHIP_PACE);
    for (let s = 0; s < 600; s += 0.25) {
      const a = shipAt(world, strait, s), b = shipAt(world, strait, s + 0.25);
      if (a && b && a.facing === b.facing) expect(Math.abs(b.x - a.x) / 0.25).toBeLessThanOrEqual(SHIP_PACE + 1e-9);
      for (const loop of strait.loops) {
        const p = fishingAt(loop, s), q = fishingAt(loop, s + 0.25);
        expect(Math.hypot(q.x - p.x, q.y - p.y) / 0.25).toBeLessThanOrEqual(FISHING_PACE + 1e-9);
      }
    }
  });
});

describe('the fishing boats', () => {
  it('are two, each on a loop of open water clear of land and of the line by a tile', () => {
    for (const seed of SEEDS) {
      const { world, strait } = aravali(seed);
      expect(strait.loops.map((l) => l.id), seed).toEqual(['fishing-white', 'fishing-madder']);
      for (const loop of strait.loops) {
        for (let i = 0; i < 200; i += 1) {
          const at = fishingAt(loop, (i / 200) * 400);
          for (let dy = -2; dy <= 1; dy += 1) {
            for (let dx = -1; dx <= 1; dx += 1) {
              expect(biome(world, at.x + dx, at.y + dy), `${seed} ${loop.id} near land at ${at.x},${at.y}`).toBe('sea');
              expect(track(world, at.x + dx, at.y + dy), `${seed} ${loop.id} under the line`).toBe(false);
            }
          }
          expect(Math.abs(at.y - strait.lane!), `${seed} ${loop.id} in the ship's lane`).toBeGreaterThan(3);
        }
      }
    }
  });

  it('are seen from all four sides on a lap, facing the way they move', () => {
    const { strait } = aravali('varuna-0');
    const loop = strait.loops[0]!;
    const faces = new Set<string>();
    let prev = fishingAt(loop, 0);
    const lap = (2 * (loop.x1 - loop.x0 + loop.y1 - loop.y0)) / FISHING_PACE;
    for (let i = 1; i <= 400; i += 1) {
      const at = fishingAt(loop, (i / 400) * lap);
      const dx = at.x - prev.x, dy = at.y - prev.y;
      if (Math.abs(dx) + Math.abs(dy) > 0 && Math.abs(dx) + Math.abs(dy) < 1) {
        const moved = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
        expect(at.facing).toBe(moved);
      }
      faces.add(at.facing);
      prev = at;
    }
    expect([...faces].sort()).toEqual(['down', 'left', 'right', 'up']);
  });
});

describe('the kites', () => {
  it('are two, tied at an island edge, flying over open water with their shadows on the sea', () => {
    for (const seed of SEEDS) {
      const { world, strait } = aravali(seed);
      expect(strait.kites.map((k) => k.id), seed).toEqual(['kite-turmeric', 'kite-striped']);
      for (const kite of strait.kites) {
        expect(biome(world, kite.anchor.x, kite.anchor.y), `${seed}: tied off the island`).toBe('sky_island');
        for (let s = 0; s < 60; s += 0.5) {
          const k = kiteAt(kite, s);
          const rope = Math.hypot(k.x - k.tieX, k.y - k.tieY);
          expect(rope).toBeGreaterThanOrEqual(KITE_REACH - 0.51);
          expect(rope).toBeLessThanOrEqual(KITE_REACH + 0.51);
          expect(biome(world, k.x, k.y + KITE_HEIGHT), `${seed} ${kite.id}: shadow off the water`).toBe('sea');
        }
      }
    }
  });

  it('keep kite and rope clear of the line', () => {
    for (const seed of SEEDS) {
      const { world, strait } = aravali(seed);
      for (const kite of strait.kites) {
        for (let s = 0; s < 60; s += 0.5) {
          const k = kiteAt(kite, s);
          for (let u = 0; u <= 1; u += 0.05) {
            const x = k.tieX + (k.x - k.tieX) * u, y = k.tieY + (k.y - k.tieY) * u;
            expect(track(world, x, y), `${seed} ${kite.id}: rope over the line`).toBe(false);
          }
        }
      }
    }
  });

  it('face their anchor, nose into the wind, the streamers trailing away', () => {
    const kite = { id: 'kite-turmeric' as const, anchor: { x: 10, y: 10 }, out: { x: 1, y: 0 } };
    for (let s = 0; s < 30; s += 1) expect(kiteAt(kite, s).facing).toBe('left');
    expect(kiteAt({ ...kite, out: { x: 0, y: 1 } }, 0).facing).toBe('up');
  });

  it('at Dwarka, are tied at the caravan camp', () => {
    const built = buildFieldMap(fieldMap(CARAVAN_MAP)!, { seed: 'caravan' });
    const placed = built.placed.map((p) => ({ poiId: p.poi.id, at: p.at }));
    const camp = placed.find((p) => p.poiId === CARAVAN_POI)!;
    const s = straitOn(built.world, CARAVAN_MAP, placed)!;
    for (const kite of s.kites) expect(kite.anchor).toEqual(camp.at);
    expect(new Set(s.kites.map((k) => `${k.out.x},${k.out.y}`)).size, 'both kites fly the same way').toBe(2);
  });

  it('at Dwarka, are flown up into the sky, nose up, above the camp, on every seed', () => {
    for (const seed of SEEDS) {
      const built = buildFieldMap(fieldMap(CARAVAN_MAP)!, { seed });
      const placed = built.placed.map((p) => ({ poiId: p.poi.id, at: p.at }));
      const camp = placed.find((p) => p.poiId === CARAVAN_POI)!;
      for (const kite of straitOn(built.world, CARAVAN_MAP, placed)!.kites) {
        for (let s = 0; s < 30; s += 0.5) {
          const k = kiteAt(kite, s);
          expect(k.facing, `${seed} ${kite.id}: flown sideways`).toBe('up');
          expect(k.aloft).toBe(true);
          // Above the camp on the screen, unless the camp is too near the top for the rope.
          if (camp.at.y >= KITE_REACH + 1) expect(k.y, `${seed} ${kite.id}: not above the camp`).toBeLessThan(camp.at.y);
          expect(k.y).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });
});

describe('the whale', () => {
  it('comes up in deep water, two tiles from anything, away from the boats', () => {
    for (const seed of SEEDS) {
      const { world, strait } = aravali(seed);
      expect(strait.whaleSpots.length, seed).toBeGreaterThan(0);
      for (const at of strait.whaleSpots) {
        for (let dy = -2; dy <= 2; dy += 1) {
          for (let dx = -2; dx <= 2; dx += 1) {
            expect(biome(world, at.x + dx, at.y + dy), `${seed}: whale near land`).toBe('sea');
            expect(track(world, at.x + dx, at.y + dy), `${seed}: whale under the line`).toBe(false);
          }
        }
      }
    }
  });

  it('rises slowly, spouts while up, sinks slowly, and is gone the rest of the time', () => {
    const { strait } = aravali('varuna-0');
    expect(whaleAt(strait, 0)!.up).toBe(0);
    expect(whaleAt(strait, WHALE_RISE_S / 2)!.up).toBeCloseTo(0.5);
    let spouted = false;
    for (let s = 0; s < WHALE_CYCLE_S; s += 0.1) {
      const w = whaleAt(strait, s);
      if (w && w.spout > 0) {
        spouted = true;
        expect(w.up, 'spouted while under').toBe(1);
      }
    }
    expect(spouted).toBe(true);
    expect(whaleAt(strait, WHALE_CYCLE_S - 1)).toBeNull();
    expect(whaleAt(strait, WHALE_CYCLE_S)!.at).toEqual(strait.whaleSpots[1 % strait.whaleSpots.length]);
  });
});

describe('the sea seen from above', () => {
  it('lifts the open water round an island or the line on the Aravali, and nothing else', async () => {
    const { seaSeenFrom, STRAIT_SIGHT } = await import('../src/content/strait');
    const { world, strait } = aravali('varuna-0');
    const island = strait.kites[0]!.anchor;
    const seen = seaSeenFrom(world, STRAIT_MAP, island);
    expect(seen.length, 'nothing seen from the island edge').toBeGreaterThan(20);
    for (const key of seen) {
      const [x, y] = key.split(',').map(Number);
      expect(biome(world, x!, y!)).toBe('sea');
      expect(Math.hypot(x! - island.x, y! - island.y)).toBeLessThanOrEqual(STRAIT_SIGHT);
    }
    // Out on open sea, or on another map, it is the ordinary two tiles.
    const out = strait.whaleSpots[0]!;
    expect(seaSeenFrom(world, STRAIT_MAP, out)).toEqual([]);
    expect(seaSeenFrom(world, 'field_map_lothal', island)).toEqual([]);
  });
});

describe('where it is drawn', () => {
  it('puts boats on the water, under the rail, and kites in the air, under the fog', async () => {
    const { STRAIT_DEPTH, depthFor, ROW_SLOT, GROUND_DEPTH_BASE } = await import('../src/game/frames');
    // The rail is planned at `depthFor(y, ROW_SLOT.underfoot)` (`scenePlan.ts`), the lowest any row
    // goes: a boat below row nought's is below the rail on every row.
    expect(STRAIT_DEPTH.water).toBeGreaterThan(0);
    expect(STRAIT_DEPTH.water).toBeLessThan(depthFor(0, ROW_SLOT.underfoot));
    expect(STRAIT_DEPTH.water).toBeLessThan(GROUND_DEPTH_BASE);
    // Above every row a map can have (the tallest is 78), below the fog at 2000.
    expect(STRAIT_DEPTH.air).toBeGreaterThan(depthFor(78, ROW_SLOT.canopy + 1));
    expect(STRAIT_DEPTH.air).toBeLessThan(2000);
    // A kite flown aloft is seen over the fog, and still tinted by the sky at 3000.
    expect(STRAIT_DEPTH.aloft).toBeGreaterThan(2000);
    expect(STRAIT_DEPTH.aloft).toBeLessThan(3000);
  });
});
