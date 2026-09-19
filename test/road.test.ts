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
import { easeRoutes, thinRoad } from '../src/world/routes';
import { planRoad, planScene } from '../src/game/scenePlan';
import {
  roadFrame,
  runSides,
  ROAD_MASKS,
  ROAD_PIECES,
  ROAD_SURFACE,
  RUN_SIDE,
  TRACK_PIECES
} from '../src/game/frames';
import { isWalkable } from '../src/world/generate';
import { DEFAULT_SEED } from '../src/ui/seed';
import type { World } from '../src/world/types';

const built = (id: string, seed = DEFAULT_SEED) =>
  buildFieldMap(fieldMap(id)!, { seed });

const roadTiles = (world: World) =>
  world.tiles.flat().filter((tile) => tile.road === true);

// **Road and ford together, which is what gets drawn.** The two flags are deliberately separate on
// the tile -- `road` is paved and a ford is not, and the assertion further down that no road lands
// on water depends on that -- but `planRoad` draws both, because the crossing is the road's third
// surface rather than a second feature. Counting only `road` here reported 122 against 130 drawn on
// the Aravali, which was the ford working.
const wornTiles = (world: World) =>
  world.tiles.flat().filter((tile) => tile.road === true || tile.ford === true);

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
        .toBe(wornTiles(scene.world).length);
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

  it('draws the shape the route actually makes, on every tile', () => {
    // **The guard the four-frame sheet could not have.** A frame is a bitmask of the sides the path
    // leaves by, so the drawing and the ground can be compared directly: every side the frame opens
    // must have a road tile beyond it, and every road neighbour must have a side open to it.
    //
    // Proven to bite by forcing the frame back to the old north-south answer, which reported
    // `road at 31,52 draws an opening north onto no road`.
    for (const map of fieldMaps) {
      const world = buildFieldMap(map, { seed: DEFAULT_SEED }).world;
      // The ford counts as road *to the shape*, and must: the frame is the sides the run leaves
      // by, and a crossing is a tile the run passes through. Asking `road` alone here reported
      // `23,10 draws sides 12 over ground that runs 8` -- the west arm reaching the ford at 22,10,
      // which is the whole point of drawing the crossing.
      const road = (x: number, y: number) => {
        const tile = world.tiles[y]?.[x];
        return tile?.road === true || tile?.ford === true;
      };
      for (const piece of planRoad(world)) {
        const drawn = piece.frame % ROAD_MASKS;
        const truth = runSides(piece.x, piece.y, road);
        expect(
          drawn,
          `${map.id}: road at ${piece.x},${piece.y} draws sides ${drawn} over ground that runs ${truth}`
        ).toBe(truth);
      }
    }
  });

  it('makes every shape a route can make, somewhere', () => {
    // A sheet of sixteen pieces where only two are ever addressed is the four-frame sheet again
    // with more files. The four maps between them have to reach a straight, a corner, a junction
    // and an end -- measured, they reach 43.7% non-straight on the Aravali alone.
    const seen = new Set<number>();
    for (const map of fieldMaps) {
      const world = buildFieldMap(map, { seed: DEFAULT_SEED }).world;
      for (const piece of planRoad(world)) seen.add(piece.frame % ROAD_MASKS);
    }
    const bits = (m: number) => [1, 2, 4, 8].filter((b) => m & b).length;
    const straight = [...seen].filter((m) => m === 5 || m === 10);
    const corner = [...seen].filter((m) => bits(m) === 2 && m !== 5 && m !== 10);
    const junction = [...seen].filter((m) => bits(m) >= 3);
    const end = [...seen].filter((m) => bits(m) <= 1);
    expect(straight.length, 'no straight run on any map').toBeGreaterThan(0);
    expect(corner.length, 'no corner on any map -- the sheet grew for nothing').toBeGreaterThan(0);
    expect(junction.length, 'no junction on any map').toBeGreaterThan(0);
    expect(end.length, 'no dead end on any map').toBeGreaterThan(0);
  });

  it('draws the crossings, on the ford row, over water and nowhere else', () => {
    // **The guard on the whole ford change, and it is the signature-fault guard.** A third row on
    // the sheet, a flag on the tile and a branch in `planRoad` are all provable in isolation while
    // no map ever produces one -- which is how `lava_field` shipped with painted tiles, 25 creatures
    // and zero tiles on every seed.
    //
    // Measured across five seeds of each map, and this is the number that made the change worth
    // doing: Lothal draws **23 to 42** crossings against 54 to 87 road tiles, so between a quarter
    // and 44% of that delta's network was missing. The other three draw 0 to 17, which is why the
    // gap was only ever reported on Lothal.
    const seeds = [DEFAULT_SEED, 'a', 'b', 'c', 'd'];
    for (const map of fieldMaps) {
      let everAforded = 0;
      for (const seed of seeds) {
        const world = buildFieldMap(map, { seed }).world;
        const crossings = planRoad(world).filter(
          (p) => Math.floor(p.frame / ROAD_MASKS) === ROAD_SURFACE.ford
        );
        everAforded += crossings.length;
        for (const piece of crossings) {
          const tile = world.tiles[piece.y]?.[piece.x];
          // A ford is over water by definition -- it is the tile `fieldMap.ts` withheld `road` from
          // *because* the biome is wet. Stones drawn on dry ground would be the branch reading the
          // wrong flag.
          expect(
            tile?.biome,
            `${map.id}/${seed}: a crossing at ${piece.x},${piece.y} is not over water`
          ).toMatch(/^(river|sky_water)$/);
          expect(tile?.road, `${map.id}/${seed}: ${piece.x},${piece.y} is both paved and forded`)
            .not.toBe(true);
        }
      }
      expect(
        everAforded,
        `${map.id}: no route on any seed crosses water, so the ford row never draws`
      ).toBeGreaterThan(0);
    }
  });

  it('carries Lothal, which is the map the gap was reported on', () => {
    // Lothal is a delta and its road has always been the short one -- 54 to 87 tiles against 98 to
    // 169 elsewhere at the same place spread. The reason was never that the route is shorter: it is
    // that the route crosses water constantly and every crossing was silently dropped, so the road
    // read as fragments. Asserted as a share rather than a count, because the counts move with the
    // maps and the fact does not.
    for (const seed of [DEFAULT_SEED, 'a', 'b', 'c', 'd']) {
      const world = buildFieldMap(fieldMap('field_map_lothal')!, { seed }).world;
      const fords = world.tiles.flat().filter((t) => t.ford === true).length;
      const worn = wornTiles(world).length;
      expect(fords / worn, `lothal/${seed}: the crossings stopped mattering`).toBeGreaterThan(0.15);
    }
  });

  it('indexes the verge row by adding the mask count, and nothing else', () => {
    // The contract with `tools/build-road.js`, which writes masks 0..15 walked and then the same
    // sixteen with a verge. It is no longer the rail's four-piece order, and that parting is
    // deliberate rather than drift: a railway is surveyed and a path is walked, so only one of them
    // needs a corner.
    expect(ROAD_PIECES).toBe(ROAD_MASKS * 3);
    expect(ROAD_PIECES).not.toBe(TRACK_PIECES);
    for (let mask = 0; mask < ROAD_MASKS; mask += 1) {
      expect(roadFrame(mask, ROAD_SURFACE.walked)).toBe(mask);
      expect(roadFrame(mask, ROAD_SURFACE.verge)).toBe(mask + ROAD_MASKS);
      // The third row, which is the ford. Same sixteen shapes, one row further down the sheet.
      expect(roadFrame(mask, ROAD_SURFACE.ford)).toBe(mask + ROAD_MASKS * 2);
    }
  });

  it('is one tile wide everywhere, and lost nothing by becoming so', () => {
    // **The artefact the sixteen-piece sheet made visible.** Two legs of the tour often run
    // alongside each other, so the flagged line came out two tiles wide in places -- 5.0% of
    // Lothal's road tiles, 8.9% of Dwarka's, 9.7% of the Aravali's and 17.2% of Narmada's sat in a
    // 2x2 block. Two parallel bars read as a thick road; stubs and tees reaching across between
    // them read as a ladder.
    //
    // Both halves are asserted, and the second is the one that matters: `thinRoad` may not buy a
    // narrow road by cutting the road in half.
    for (const map of fieldMaps) {
      const world = buildFieldMap(map, { seed: DEFAULT_SEED }).world;
      const road = (x: number, y: number) => world.tiles[y]?.[x]?.road === true;
      for (let y = 0; y + 1 < world.height; y += 1) {
        for (let x = 0; x + 1 < world.width; x += 1) {
          const block = road(x, y) && road(x + 1, y) && road(x, y + 1) && road(x + 1, y + 1);
          expect(block, `${map.id}: the road is two tiles wide at ${x},${y}`).toBe(false);
        }
      }
    }
  });

  it('thins a doubled run to one tile and never adds a break', () => {
    // **Asked of `thinRoad` directly, on ground built for the question.** An earlier version of this
    // asserted over a finished map and compared a set against a copy of itself, which passes
    // whatever the function does -- the shape of wrong-but-green this repo has paid for before.
    //
    // Two legs running alongside each other: a 2x10 block of road, which is exactly what the tour
    // produces where it doubles back.
    const world = built('field_map_lothal').world;
    for (const row of world.tiles) for (const t of row) t.road = false;
    for (let x = 4; x < 14; x += 1) {
      world.tiles[6]![x]!.road = true;
      world.tiles[7]![x]!.road = true;
    }
    const before = roadSet(world);
    expect(runsOf(before), 'the fixture is not one run').toBe(1);

    const cleared = thinRoad(world.tiles, world.width, world.height);
    const after = roadSet(world);

    // **Nine, not ten, and the leftover is correct rather than a miss.** It thins to a single
    // ten-tile run along y=7 plus one tile still standing at 13,6: once its neighbour to the west
    // has gone that tile is no longer part of any 2x2 block, so nothing asks about it again. The
    // sheet draws it as a stub off the end of the run, which is what a path that frayed there looks
    // like -- and removing it would need a second rule about tidiness rather than about width.
    expect(cleared.length, 'nothing was thinned').toBe(9);
    expect(after.size).toBe(before.size - cleared.length);
    expect(runsOf(after), 'thinning broke the run in two').toBe(1);
    for (let y = 0; y + 1 < world.height; y += 1) {
      for (let x = 0; x + 1 < world.width; x += 1) {
        const block =
          after.has(`${x},${y}`) && after.has(`${x + 1},${y}`) &&
          after.has(`${x},${y + 1}`) && after.has(`${x + 1},${y + 1}`);
        expect(block, `still two wide at ${x},${y}`).toBe(false);
      }
    }
  });

  it('leaves a block alone when every tile of it holds the road together', () => {
    // The case the loop must not force. Four tiles that each carry a leg away from the square are a
    // junction, not a doubled run -- dropping any of them cuts a spur off, so `runs` goes up and
    // the candidate is put back. Nothing is cleared and nothing is broken.
    const world = built('field_map_lothal').world;
    for (const row of world.tiles) for (const t of row) t.road = false;
    const on = (x: number, y: number) => { world.tiles[y]![x]!.road = true; };
    // the square
    on(10, 10); on(11, 10); on(10, 11); on(11, 11);
    // one spur out of each corner, so every tile is the only way to its own arm
    on(10, 9); on(12, 10); on(9, 11); on(11, 12);

    const before = roadSet(world);
    const cleared = thinRoad(world.tiles, world.width, world.height);
    const after = roadSet(world);

    expect(cleared.length, 'a junction was thinned away').toBe(0);
    expect(after.size).toBe(before.size);
    expect(runsOf(after)).toBe(runsOf(before));
  });

  it('reads the four sides in the order the builder draws them', () => {
    // `runSides` and `roadFrame` share a file so the bit that means north cannot drift between the
    // reading and the drawing -- but the *builder* is a third party in another language, and this
    // is the only thing that holds it to the same order.
    const only = (dx: number, dy: number) => (x: number, y: number) => x === dx && y === dy;
    expect(runSides(0, 0, only(0, -1)), 'north is not bit 1').toBe(RUN_SIDE.north);
    expect(runSides(0, 0, only(1, 0)), 'east is not bit 2').toBe(RUN_SIDE.east);
    expect(runSides(0, 0, only(0, 1)), 'south is not bit 4').toBe(RUN_SIDE.south);
    expect(runSides(0, 0, only(-1, 0)), 'west is not bit 8').toBe(RUN_SIDE.west);
    expect(runSides(0, 0, () => false), 'a lone tile is not mask 0').toBe(0);
  });
});

/** How many four-connected runs a set of road tiles makes. Mirrors `thinRoad`'s own count. */
function runsOf(on: ReadonlySet<string>): number {
  const seen = new Set<string>();
  let count = 0;
  for (const start of on) {
    if (seen.has(start)) continue;
    count += 1;
    const queue = [start];
    seen.add(start);
    while (queue.length) {
      const [x, y] = queue.pop()!.split(',').map(Number) as [number, number];
      for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]] as const) {
        const next = `${x + dx},${y + dy}`;
        if (!on.has(next) || seen.has(next)) continue;
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return count;
}

/** Every flagged road tile, as the keys `runsOf` counts over. */
function roadSet(world: World): Set<string> {
  const on = new Set<string>();
  for (const row of world.tiles) for (const t of row) if (t.road) on.add(`${t.x},${t.y}`);
  return on;
}
