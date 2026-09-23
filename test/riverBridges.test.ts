// Bridges over the short river crossings.
//
// Routes cross rivers where they are narrowest now that a river costs 3 on foot, and a crossing of
// three tiles or fewer is bridged. The rule is in `world/bridges.ts`; this holds it to the small
// cases first and then to every map across seeds, because a rule that is right on a grid and never
// fires on a map is this codebase's signature fault.

import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { bridgeTheCrossings, FORDED_PLACES, MAX_SPAN } from '../src/world/bridges';
import { buildFieldMap } from '../src/world/fieldMap';
import { fieldMaps } from '../src/content/places';
import { planRiverBridges } from '../src/game/scenePlan';
import { RIVER_BRIDGE_FRAMES, SPAN_PIECE } from '../src/game/frames';
import { ROAD_STEP, stepCost, stepCostOn } from '../src/content/species';
import type { BiomeId, Tile, World } from '../src/world/types';

/**
 * A world from rows: `.` plains, `~` river, `s` sky water. Upper case marks the route: `R` is road,
 * `F` a ford on river, `S` a ford on sky water.
 */
function world(rows: string[]): World {
  const tiles: Tile[][] = rows.map((row, y) =>
    [...row].map((ch, x) => {
      const biome: BiomeId = ch === '~' || ch === 'F' ? 'river' : ch === 's' || ch === 'S' ? 'sky_water' : 'plains';
      const tile: Tile = { x, y, biome, elevation: 0.3, moisture: 0.5, temperature: 0.5, riverBias: 0 };
      if (ch === 'R') tile.road = true;
      if (ch === 'F' || ch === 'S') tile.ford = true;
      return tile;
    })
  );
  return {
    seed: 'grid',
    width: rows[0]!.length,
    height: rows.length,
    tiles,
    start: { x: 0, y: 0 },
    settlement: null,
    landmark: { x: 0, y: 0, name: 'x', terrain: 'plains' as never },
    rivers: [],
    camp: null
  } as World;
}

const flagged = (w: World, flag: 'bridge' | 'ford') =>
  w.tiles.flat().filter((t) => t[flag]).map((t) => `${t.x},${t.y}`);

describe('which crossings are bridged', () => {
  it('bridges a crossing of up to three tiles', () => {
    const w = world(['RRFFFRR']);
    bridgeTheCrossings(w);
    expect(flagged(w, 'bridge')).toEqual(['2,0', '3,0', '4,0']);
    expect(flagged(w, 'ford'), 'a bridged tile is still a ford').toEqual([]);
  });

  it('fords anything wider', () => {
    const w = world(['RFFFFR']);
    bridgeTheCrossings(w);
    expect(flagged(w, 'bridge')).toEqual([]);
    expect(flagged(w, 'ford')).toHaveLength(4);
  });

  it('fords a crossing that turns in the water', () => {
    // A diagonal river makes the route's grid steps bend mid-stream; a deck does not.
    const w = world(['RF...', '.FFRR']);
    bridgeTheCrossings(w);
    expect(flagged(w, 'bridge')).toEqual([]);
    expect(flagged(w, 'ford')).toHaveLength(3);
  });

  it('never bridges the sky pools', () => {
    // The islands keep their own crossing and their own art.
    const w = world(['RSR']);
    bridgeTheCrossings(w);
    expect(flagged(w, 'bridge')).toEqual([]);
  });

  it('leaves the ford a place stands at', () => {
    // Canon puts the Nomad Ground on shingle above a ford; a bridge there contradicts the place.
    const w = world(['RFR......', 'R.R...RFR']);
    bridgeTheCrossings(w, [{ x: 0, y: 0 }]);
    expect(flagged(w, 'ford'), 'the claimed crossing was bridged').toEqual(['1,0']);
    expect(flagged(w, 'bridge'), 'the far crossing was not bridged').toEqual(['7,1']);
  });

  it('knows the Nomad Ground is such a place', () => {
    expect(FORDED_PLACES.has('poi_nomad_ground')).toBe(true);
  });
});

describe('bridges on the maps', () => {
  const seeds = ['bridge-a', 'bridge-b', 'bridge-c', 'bridge-d', 'bridge-e'];

  it('stand only on river, span no more than three tiles, and never share a tile with a ford or road', () => {
    for (const map of fieldMaps) {
      for (const seed of seeds) {
        const { world: w } = buildFieldMap(map, { seed });
        const bridges = w.tiles.flat().filter((t) => t.bridge);
        for (const t of bridges) {
          const where = `${map.id}/${seed} ${t.x},${t.y}`;
          expect(t.biome, `${where}: a bridge not over river`).toBe('river');
          expect(t.ford, `${where}: both bridge and ford`).not.toBe(true);
          expect(t.road, `${where}: both bridge and road`).not.toBe(true);
        }
        // Spans, by connected run.
        const seen = new Set<string>();
        for (const t of bridges) {
          if (seen.has(`${t.x},${t.y}`)) continue;
          let size = 0;
          const stack = [t];
          seen.add(`${t.x},${t.y}`);
          while (stack.length) {
            const c = stack.pop()!;
            size += 1;
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
              const n = w.tiles[c.y + dy]?.[c.x + dx];
              if (n?.bridge && !seen.has(`${n.x},${n.y}`)) {
                seen.add(`${n.x},${n.y}`);
                stack.push(n);
              }
            }
          }
          expect(size, `${map.id}/${seed}: a span of ${size} at ${t.x},${t.y}`).toBeLessThanOrEqual(MAX_SPAN);
        }
      }
    }
  });

  it('appear on Lothal, which is the map with the most river to cross', () => {
    // The signature-fault guard: the rule must actually fire where it matters.
    const lothal = fieldMaps.find((m) => m.id === 'field_map_lothal')!;
    const withBridges = seeds.filter(
      (seed) => buildFieldMap(lothal, { seed }).world.tiles.flat().some((t) => t.bridge)
    );
    expect(withBridges.length, 'Lothal seeds with a bridge').toBeGreaterThanOrEqual(3);
  });

  it('leave the Nomad Ground its ford', () => {
    const aravali = fieldMaps.find((m) => m.id === 'field_map_aravali')!;
    for (const seed of seeds) {
      const built = buildFieldMap(aravali, { seed });
      const camp = built.placed.find((p) => p.poi.id === 'poi_nomad_ground');
      if (!camp) continue;
      const near = built.world.tiles
        .flat()
        .filter((t) => t.bridge && Math.abs(t.x - camp.at.x) + Math.abs(t.y - camp.at.y) <= 6);
      expect(near.map((t) => `${t.x},${t.y}`), `${seed}: a bridge over the Nomad Ground's ford`).toEqual([]);
    }
  });

  it('are all drawn, on a frame the sheet holds, with the road reaching each end', () => {
    for (const map of fieldMaps) {
      for (const seed of seeds) {
        const { world: w } = buildFieldMap(map, { seed });
        const pieces = planRiverBridges(w);
        expect(pieces.length, `${map.id}/${seed}: bridges flagged but not drawn`).toBe(
          w.tiles.flat().filter((t) => t.bridge).length
        );
        for (const p of pieces) {
          expect(p.frame).toBeGreaterThanOrEqual(0);
          expect(p.frame).toBeLessThan(RIVER_BRIDGE_FRAMES);
          // The bank end of a span has road (or more crossing) beyond it; a bridge to nowhere is a
          // route the planner misread.
          const piece = p.frame % 4;
          const eastWest = p.frame < 4;
          const carries = (x: number, y: number) => {
            const t = w.tiles[y]?.[x];
            return Boolean(t?.road || t?.ford || t?.bridge);
          };
          if (piece === SPAN_PIECE.start || piece === SPAN_PIECE.single) {
            const ok = eastWest ? carries(p.x - 1, p.y) : carries(p.x, p.y - 1);
            expect(ok, `${map.id}/${seed}: nothing leads onto the bridge at ${p.x},${p.y}`).toBe(true);
          }
          if (piece === SPAN_PIECE.end || piece === SPAN_PIECE.single) {
            const ok = eastWest ? carries(p.x + 1, p.y) : carries(p.x, p.y + 1);
            expect(ok, `${map.id}/${seed}: nothing leads off the bridge at ${p.x},${p.y}`).toBe(true);
          }
        }
      }
    }
  });
});

describe('what the walking costs', () => {
  it('prices a bridge and a road the same, and quicker than open ground', () => {
    expect(stepCostOn({ biome: 'river', bridge: true })).toBe(ROAD_STEP);
    expect(stepCostOn({ biome: 'wetland', road: true })).toBe(ROAD_STEP);
    expect(ROAD_STEP).toBeLessThan(stepCost('plains'));
  });

  it('makes a river slow going on foot', () => {
    expect(stepCost('river')).toBe(3);
    expect(stepCostOn({ biome: 'river' })).toBe(3);
  });
});

// The sheets on disk, held to the frame contract. Decoded with the tools' own reader rather than a
// third copy of it.
const { decodePng } = createRequire(import.meta.url)('../tools/sprite-png.js') as {
  decodePng: (file: string) => { width: number; height: number; data: Uint8Array };
};
const ASSETS = join(__dirname, '..', 'assets');

describe('the art on disk', () => {
  const sheet = decodePng(join(ASSETS, 'river-bridge.png'));
  const cell = 128;
  const alphaAt = (x: number, y: number) => sheet.data[(y * sheet.width + x) * 4 + 3]!;

  it('is eight 128 px frames, the contract riverBridgeFrame indexes', () => {
    expect(sheet.height).toBe(cell);
    expect(sheet.width).toBe(RIVER_BRIDGE_FRAMES * cell);
  });

  it('draws something in every frame, on a transparent ground', () => {
    for (let f = 0; f < RIVER_BRIDGE_FRAMES; f += 1) {
      let solid = 0;
      for (let y = 0; y < cell; y += 1) {
        for (let x = 0; x < cell; x += 1) if (alphaAt(f * cell + x, y) === 255) solid += 1;
      }
      expect(solid, `frame ${f} is empty`).toBeGreaterThan(cell * cell * 0.1);
    }
    // An east-west frame's top corner is open water, not a keyed-out colour left behind.
    expect(alphaAt(2, 2)).toBe(0);
  });

  it('casts its shadow in every frame, whichever way the bridge runs', () => {
    // The builder lights the run after turning it, so north-south frames get a shadow too. Partly
    // transparent pixels are the shadow; a frame with none was built without its height.
    for (let f = 0; f < RIVER_BRIDGE_FRAMES; f += 1) {
      let shade = 0;
      for (let y = 0; y < cell; y += 1) {
        for (let x = 0; x < cell; x += 1) {
          const a = alphaAt(f * cell + x, y);
          if (a > 20 && a < 200) shade += 1;
        }
      }
      expect(shade, `frame ${f} casts no shadow`).toBeGreaterThan(40);
    }
  });

  it('ships the dugout keyed, two tiles long', () => {
    const hull = decodePng(join(ASSETS, 'dugout.png'));
    expect([hull.width, hull.height]).toEqual([256, 128]);
    expect(hull.data[3], 'the magenta was not keyed out').toBe(0);
  });
});
