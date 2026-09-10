// The worn path between the places.
//
// **This file exists because the road was computed and thrown away for as long as routes have.**
// `easeRoutes` walked a cost-aware line between every pair of placed points of interest, softened
// the ground along it, and handed the caller a list; `fieldMap.ts` ignored the return value. Every
// map has had a road since the day that function was written and nothing has ever drawn one --
// which is the shape `CLAUDE.md` records three times under the rules layer, one layer down.
//
// So the assertions here are in two halves, and the second half is the one that matters:
//
//   * the flag is right -- the line is continuous, it never lands on water or on the rail, and
//     the places it joins are on it;
//   * **the flag reaches the screen.** A road that is set and never planned is the same bug in a
//     new place, and it is exactly the bug a test of `easeRoutes` alone would pass.

import { describe, expect, it } from 'vitest';
import { buildFieldMap } from '../src/world/fieldMap';
import { fieldMap, fieldMaps } from '../src/content/places';
import { easeRoutes } from '../src/world/routes';
import { planRoad, planScene } from '../src/game/scenePlan';
import { roadFrame, ROAD_PIECES, trackFrame, TRACK_PIECES } from '../src/game/frames';
import { isWalkable } from '../src/world/generate';
import { DEFAULT_SEED } from '../src/ui/seed';
import type { World } from '../src/world/types';

const built = (id: string, seed = DEFAULT_SEED) =>
  buildFieldMap(fieldMap(id)!, { seed });

const roadTiles = (world: World) =>
  world.tiles.flat().filter((tile) => tile.road === true);

describe('easeRoutes hands back two different facts', () => {
  it('returns a line far longer than the tiles it changed', () => {
    // **The measurement that reopened this.** `easeRoutes`' own doc comment used to say the
    // changed tiles were "what a caller needs to draw the road", and the plan built on it. They
    // are not: `eased` holds only tiles whose *biome* changed, so a route over ground that was
    // already cheap contributes nothing at all. Measured across the four maps when this was
    // written: 7 eased against a 110-tile line on the Aravali, 13 against 123 on Dwarka, 21
    // against 93 on Lothal, 64 against 104 on Narmada -- between 88% and 97% of the road missing,
    // and missing exactly where the walking is easiest, which is where a path actually gets worn.
    //
    // A ratio rather than the numbers themselves, because the numbers move with the maps and the
    // point does not.
    for (const map of fieldMaps) {
      const world = buildFieldMap(map, { seed: DEFAULT_SEED }).world;
      const stops = [world.start, { x: world.landmark.x, y: world.landmark.y }];
      const { line, eased } = easeRoutes(world.tiles, world.width, world.height, stops);
      expect(line.length, `${map.id}: the ease walked nowhere`).toBeGreaterThan(0);
      expect(
        eased.length,
        `${map.id}: every tile on the line needed softening, so the two lists cannot be told apart`
      ).toBeLessThan(line.length);
    }
  });

  it('walks each tile of the line once, however often the tour crosses itself', () => {
    // A tour revisits its own junctions -- that is what makes it a network rather than a chain --
    // and a road drawn twice is a road drawn once. Deduplicating in `easeRoutes` rather than in
    // the caller keeps the two lists describing the same thing.
    const world = built('field_map_lothal').world;
    const stops = [
      world.start,
      { x: world.landmark.x, y: world.landmark.y },
      world.start,
      { x: world.landmark.x, y: world.landmark.y }
    ];
    const { line } = easeRoutes(world.tiles, world.width, world.height, stops);
    const seen = new Set(line.map((p) => `${p.x},${p.y}`));
    expect(seen.size, 'the line repeats tiles').toBe(line.length);
  });
});

describe('the road is on the ground', () => {
  it('appears on every map', () => {
    for (const map of fieldMaps) {
      const world = buildFieldMap(map, { seed: DEFAULT_SEED }).world;
      expect(roadTiles(world).length, `${map.id} has no road at all`).toBeGreaterThan(20);
    }
  });

  it('never runs over water or anywhere a walker cannot stand', () => {
    // Every tile carrying the flag came out of `findPath`, so this cannot fail without something
    // else having gone wrong first -- which is why it is worth asserting: it is the cheapest guard
    // that the line is the route and not something reconstructed from it.
    for (const map of fieldMaps) {
      const world = buildFieldMap(map, { seed: DEFAULT_SEED }).world;
      for (const tile of roadTiles(world)) {
        expect(
          isWalkable(tile),
          `${map.id}: road at ${tile.x},${tile.y} is on ${tile.biome}, which cannot be walked`
        ).toBe(true);
      }
    }
  });

  it('never shares a tile with the rail', () => {
    // Both are runs drawn from a flag by the same neighbour-reading planner. A tile carrying both
    // would draw a dirt path through iron sleepers, and the crossing is a railway: where it goes
    // it is the only thing there. `fieldMap.ts` is the one place that rule lives.
    for (const map of fieldMaps) {
      const world = buildFieldMap(map, { seed: DEFAULT_SEED }).world;
      const both = roadTiles(world).filter((tile) => tile.track);
      expect(both.map((t) => `${t.x},${t.y}`), `${map.id}: road laid over rail`).toEqual([]);
    }
  });

  it('never draws on water — it stops at the bank and fords', () => {
    // **A route prefers a river and a road on one is still wrong.** Easing turns wetland into
    // river on purpose -- the delta's answer to crossing a marsh is to follow the channel -- and
    // `crossingCost` gives river the same 1 as plains, so the line really does run down
    // watercourses. The first version drew packed earth over open water for a dozen tiles south of
    // Lothal's settlement, which is what this now refuses.
    for (const map of fieldMaps) {
      const world = buildFieldMap(map, { seed: DEFAULT_SEED }).world;
      const wet = roadTiles(world).filter(
        (tile) => tile.biome === 'river' || tile.biome === 'sky_water'
      );
      expect(
        wet.map((t) => `${t.x},${t.y} (${t.biome})`),
        `${map.id}: road drawn over water`
      ).toEqual([]);
    }
  });

  it('reaches every place it is supposed to join', () => {
    // **The promise the feature actually makes**, and the one a player would notice breaking: a
    // road between the places. Each placed point of interest stands on road, or has road at its
    // door -- `keep` stops the ease softening a place's own tile, and the same tile can be a ford
    // or carry the rail, so touching it is enough.
    //
    // **This replaced two sharper-looking assertions that were both measuring something else.**
    // "Runs in one piece" is false by design -- the road stops at fords and where the rail runs.
    // "No unexplained hole in a run" reads as precise and is not: a tour doubles back, so two
    // different parts of the network pass either side of a tile that was never on the road at all,
    // and the Aravali reported 20,71 and 21,71 as broken runs when nothing was broken.
    for (const map of fieldMaps) {
      const scene = buildFieldMap(map, { seed: DEFAULT_SEED });
      const world = scene.world;
      // **Road or rail**, because on the Aravali part of the route *is* the rail. The Lodestone
      // Face stands on a floating island at 25,31 and the only way to it is the crossing, so the
      // road stops at the shore by design -- asking for road alone reported it stranded, which is
      // the test misreading a correct map rather than the map being wrong.
      const near = (x: number, y: number) =>
        ([[0, 0], [0, -1], [1, 0], [0, 1], [-1, 0]] as const).some(([dx, dy]) => {
          const tile = world.tiles[y + dy]?.[x + dx];
          return tile?.road === true || tile?.track === true;
        });

      const stranded = scene.placed
        .filter((p) => !near(p.at.x, p.at.y))
        .map((p) => `${p.poi.id} at ${p.at.x},${p.at.y}`);
      expect(stranded, `${map.id}: no road reaches these places`).toEqual([]);
    }
  });
});

describe('the road reaches the screen', () => {
  it('is drawn, which is the whole point of the change', () => {
    // **The guard against the fault this feature was.** A flag set on the tile and never planned
    // is the same bug moved one file along, and every test above would still pass.
    for (const map of fieldMaps) {
      const scene = buildFieldMap(map, { seed: DEFAULT_SEED });
      const drawn = planScene(scene).filter((p) => p.sheet === 'road');
      expect(drawn.length, `${map.id}: the road is flagged but nothing draws it`)
        .toBe(roadTiles(scene.world).length);
    }
  });

  it('draws every flagged tile exactly once, on a frame the sheet holds', () => {
    const world = built('field_map_narmada').world;
    const drawn = planRoad(world);
    const at = new Set(drawn.map((p) => `${p.x},${p.y}`));
    expect(at.size, 'a tile is drawn twice').toBe(drawn.length);
    for (const piece of drawn) {
      expect(piece.frame, `frame ${piece.frame} is off the sheet`).toBeGreaterThanOrEqual(0);
      expect(piece.frame, `frame ${piece.frame} is off the sheet`).toBeLessThan(ROAD_PIECES);
    }
  });

  it('turns where the run turns', () => {
    // A path drawn north-south down a run that goes east-west is the failure the neighbour test
    // exists to prevent, and one frame in four would still be right by accident. Both orientations
    // have to appear on a map whose route bends, and every route bends.
    const drawn = planRoad(built('field_map_lothal').world);
    const northSouth = drawn.filter((p) => p.frame % 2 === 0).length;
    const eastWest = drawn.length - northSouth;
    expect(northSouth, 'no north-south run').toBeGreaterThan(0);
    expect(eastWest, 'no east-west run').toBeGreaterThan(0);
  });

  it('keeps the same frame contract as the rail', () => {
    // The two sheets are interchangeable in shape on purpose -- `tools/build-road.js` writes the
    // same four pieces in the same order `tools/build-track.js` does -- so one planner shape draws
    // both. If the orders ever part, this says so before the map does.
    expect(ROAD_PIECES).toBe(TRACK_PIECES);
    for (const eastWest of [false, true]) {
      for (const second of [false, true]) {
        expect(roadFrame(eastWest, second)).toBe(trackFrame(eastWest, second));
      }
    }
  });
});
