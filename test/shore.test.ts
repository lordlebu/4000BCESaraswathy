// The shore, which is the last boundary on the map that was still a cut between two flat colours.
//
// Run against every real field map rather than a fixture, for the reason `test/scenePlan.test.ts`
// gives: a fixture proves the rules hold somewhere, and these prove they hold everywhere a player
// can stand.
//
// Written after the three tests in `docs/handover-crossing-and-basalt.md` that passed while being
// about the wrong thing -- a cliff count that summed the whole map while the islands had none, a
// route check that was true of three parallel railways. So every count below is taken **per map**,
// and the two that matter most name the map they are about: the Aravali, whose islands must have
// no shore at all, and Lothal, which is the map this layer exists for.

import { describe, expect, it } from 'vitest';
import { buildFieldMap } from '../src/world/fieldMap';
import { fieldMaps } from '../src/content/places';
import {
  planScene,
  planShore,
  planBank,
  planShoreProps
} from '../src/game/scenePlan';
import {
  EDGE_ORDER,
  EDGE_STEP,
  EDGE_VARIANTS,
  GROUND_DEPTH_BASE,
  SHORE_BAND,
  GRID,
  bankSource,
  shoreAt
} from '../src/game/frames';

const worlds = fieldMaps.map((map) => ({ id: map.id, built: buildFieldMap(map, {}) }));
const only = (id: string) => worlds.find((w) => w.id === id)!.built;

const WATER = new Set(['sea', 'river']);
const SKY = new Set(['sky_island', 'sky_underside']);
const key = (p: { x: number; y: number }) => `${p.x},${p.y}`;

/** Every land/water boundary on a map, counted from the water side. */
function shoreEdges(world: ReturnType<typeof buildFieldMap>['world']): number {
  let n = 0;
  for (let y = 0; y < world.height; y += 1) {
    for (let x = 0; x < world.width; x += 1) {
      const here = world.tiles[y]![x]!.biome;
      for (const edge of EDGE_ORDER) {
        const { dx, dy } = EDGE_STEP[edge];
        const there = world.tiles[y + dy]?.[x + dx]?.biome;
        if (there === undefined) continue;
        if (shoreAt(here, there)) n += 1;
      }
    }
  }
  return n;
}

describe('the shore keeps its line and gains a thickness', () => {
  it('draws the shadow on the water side of every boundary, exactly once', () => {
    // The whole claim of the layer. One band per water-side edge: not per tile, because a tile in
    // a river bend faces land on three sides and wants three, and not on the land side, because a
    // bank's shadow falls on the thing below it.
    for (const { id, built } of worlds) {
      const bands = planShore(built.world);
      const expected = shoreEdges(built.world);
      expect(bands.length, `${id}: one band per water-side edge`).toBe(expected);

      const seen = new Set<string>();
      for (const band of bands) {
        const here = built.world.tiles[band.y]![band.x]!.biome;
        expect(WATER.has(here), `${id}: band at ${key(band)} is not on water`).toBe(true);
        expect(band.edge, `${id}: band at ${key(band)} names no edge`).toBeDefined();

        const { dx, dy } = EDGE_STEP[band.edge!];
        const there = built.world.tiles[band.y + dy]?.[band.x + dx]?.biome;
        expect(there, `${id}: band at ${key(band)} faces off the map`).toBeDefined();
        expect(WATER.has(there!), `${id}: band at ${key(band)} faces more water`).toBe(false);

        const once = `${key(band)}:${band.edge}`;
        expect(seen.has(once), `${id}: two bands on ${once}`).toBe(false);
        seen.add(once);
      }
    }
  });

  it('leaves the floating islands alone, which is 148 edges on the Aravali', () => {
    // The assertion the handover asks for: named for the thing it is about, and measuring that
    // thing rather than a proxy that correlates with it.
    //
    // An island's rim already carries a rock face -- `crossing.ts` sets the underside a band below
    // the top precisely so `cliffAt` can see the step -- and `planIslandShadow` already darkens
    // the sea beneath it. A bank shadow there would be a third treatment of one boundary, and a
    // beach along the rim of a floating shelf is not a thing that happens.
    //
    // A map-wide count would pass on the Aravali's 261 mainland edges while the islands quietly
    // grew beaches, so this counts the sky edges specifically and asserts the layer skipped all
    // of them.
    const built = only('field_map_aravali');
    const world = built.world;

    let skyEdges = 0;
    for (let y = 0; y < world.height; y += 1) {
      for (let x = 0; x < world.width; x += 1) {
        if (!SKY.has(world.tiles[y]![x]!.biome)) continue;
        for (const edge of EDGE_ORDER) {
          const { dx, dy } = EDGE_STEP[edge];
          const there = world.tiles[y + dy]?.[x + dx]?.biome;
          if (there !== undefined && WATER.has(there)) skyEdges += 1;
        }
      }
    }
    expect(skyEdges, 'the Aravali should still hang two islands over water').toBeGreaterThan(100);

    const touchesSky = planShore(world).filter((band) => {
      const { dx, dy } = EDGE_STEP[band.edge!];
      return SKY.has(world.tiles[band.y + dy]?.[band.x + dx]?.biome ?? '');
    });
    expect(touchesSky.map(key), 'no shore band under an island').toEqual([]);

    const bankedSky = planBank(world).filter((lip) => SKY.has(world.tiles[lip.y]![lip.x]!.biome));
    expect(bankedSky.map(key), 'no beach on an island rim').toEqual([]);
  });

  it('lays a bank only where the table says the ground grows one', () => {
    for (const { id, built } of worlds) {
      for (const lip of planBank(built.world)) {
        const here = built.world.tiles[lip.y]![lip.x]!.biome;
        expect(WATER.has(here), `${id}: bank at ${key(lip)} is in the water`).toBe(false);

        const facing = EDGE_ORDER.map((edge) => {
          const { dx, dy } = EDGE_STEP[edge];
          return built.world.tiles[lip.y + dy]?.[lip.x + dx]?.biome;
        }).filter((b) => b !== undefined && WATER.has(b));
        expect(facing.length, `${id}: bank at ${key(lip)} faces no water`).toBeGreaterThan(0);
        expect(
          bankSource(here, facing[0]!),
          `${id}: ${here} should grow no bank`
        ).not.toBeNull();
      }
    }
  });

  it('grows no beach on a coast or a marsh, which is 280 of Lothal\'s edges', () => {
    // Both are null in the table for reasons that are not the same. `coast` is already the beach,
    // so a lip of coast inside it would draw nothing; `wetland` runs to the water as marsh and
    // gets reeds instead. Counted on Lothal because it is the only map that has both.
    const world = only('field_map_lothal').world;
    const banks = planBank(world);
    const wrong = banks.filter((lip) => {
      const here = world.tiles[lip.y]![lip.x]!.biome;
      return here === 'coast' || here === 'wetland';
    });
    expect(wrong.map(key), 'a beach on sand, or on a marsh').toEqual([]);
    expect(banks.length, 'Lothal should still bank its plains and its forest').toBeGreaterThan(200);
  });

  it('keeps every shore placement in the flat ground band', () => {
    // A shore is ground. Row-sorting it would let a shadow cast in one row draw over a hut
    // standing in the next -- the bug that put paddy through a roof, in a new layer.
    for (const { id, built } of worlds) {
      for (const item of [...planShore(built.world), ...planBank(built.world)]) {
        expect(item.depth, `${id}: ${item.sheet} at ${key(item)} left the ground band`)
          .toBeLessThan(GROUND_DEPTH_BASE);
      }
    }
  });

  it('indexes a mask that exists, on the edge it is pinned to', () => {
    // The frame is the torn mask, and the scene takes the strip of it nearest the band's own edge.
    // An index from the wrong row would take a tear that fades the wrong way, which is invisible
    // to every other test here and obvious on screen.
    for (const { id, built } of worlds) {
      for (const band of planShore(built.world)) {
        const row = EDGE_ORDER.indexOf(band.edge!);
        expect(Math.floor(band.frame / EDGE_VARIANTS), `${id}: ${key(band)} masked from another edge`)
          .toBe(row);
      }
    }
  });

  it('stands its props at the waterline rather than across the cell', () => {
    // The difference between a shore and a shore-shaped scattering. Ordinary decor jitters up to
    // four tenths of a cell in any direction; these are pushed three tenths toward the water they
    // face, which is what puts reeds in the shallows.
    for (const { id, built } of worlds) {
      const props = planShoreProps(built.world, new Set());
      for (const prop of props) {
        const here = built.world.tiles[prop.y]![prop.x]!.biome;
        expect(WATER.has(here), `${id}: shore prop at ${key(prop)} is in the water`).toBe(false);

        const dx = prop.offset?.x ?? 0;
        const dy = prop.offset?.y ?? 0;
        const toward = Math.abs(dx) > Math.abs(dy) ? { x: Math.sign(dx), y: 0 } : { x: 0, y: Math.sign(dy) };
        const there = built.world.tiles[prop.y + toward.y]?.[prop.x + toward.x]?.biome;
        expect(WATER.has(there ?? ''), `${id}: prop at ${key(prop)} leans away from the water`)
          .toBe(true);
      }
    }
    expect(planShoreProps(only('field_map_lothal').world, new Set()).length)
      .toBeGreaterThan(100);
  });

  it('is the same plan twice', () => {
    // Placement is seeded from `tileHash`, so a journey stays shareable in a link.
    for (const { built } of worlds) {
      expect(planShore(built.world)).toEqual(planShore(built.world));
      expect(planBank(built.world)).toEqual(planBank(built.world));
      expect(planShoreProps(built.world, new Set())).toEqual(planShoreProps(built.world, new Set()));
    }
  });

  it('reaches the scene, which is where the other three mechanics did not', () => {
    // `src/journey.ts` has three rules that were written, tested, and had no caller, so the
    // mechanic did not exist in the shipped game while every test passed. A layer that plans
    // perfectly and is never composed into `planScene` is the same failure.
    for (const { id, built } of worlds) {
      const plan = planScene(built);
      const bands = plan.filter((p) => p.sheet === 'shore');
      const banks = plan.filter((p) => p.sheet === 'bank');
      expect(bands.length, `${id}: no shore bands in the scene plan`).toBe(planShore(built.world).length);
      expect(bands.length, `${id}: no shore bands at all`).toBeGreaterThan(0);
      if (planBank(built.world).length > 0) {
        expect(banks.length, `${id}: banks planned but not composed`).toBeGreaterThan(0);
      }
    }
  });

  it('costs a band rather than a cell', () => {
    // Fill rate is what scales, and the decor layer learned it the expensive way: ~370 props in
    // full cells was 6.06M blended pixels a frame and turned the browser job red. Three eighths of
    // a cell is the shape that keeps this layer's worst on-screen window at about a sixth of that.
    expect(SHORE_BAND).toBe(48);
    expect(SHORE_BAND / GRID).toBeLessThan(0.4);
  });
});
