// The strait, and the two islands hanging over it.
//
// What these guard, in order of how expensive the fault would be:
//
//   * **the sky biomes appear on the Aravali and nowhere else** — they are stamped, not
//     classified, so a rule that leaked would put floating islands on a river delta;
//   * an island hangs over *water*. The first version overwrote whatever it landed on and put six
//     rows of island into the far shore, which reads as a hill drawn in the wrong colour;
//   * two islands are two, not one. At the first spacing their rims overlapped and the pair
//     rendered as a single blob — the thing the map is named for, drawn wrong.

import { describe, expect, it } from 'vitest';
import { buildFieldMap } from '../src/world/fieldMap';
import { canBoardAt, trackRoute } from '../src/world/crossing';
import { band } from '../src/world/classify';
import { planCliffs, planTrack } from '../src/game/scenePlan';
import { fieldMap, fieldMaps } from '../src/content/places';
import { DEFAULT_SEED } from '../src/ui/seed';

const aravali = () => buildFieldMap(fieldMap('field_map_aravali')!, { seed: DEFAULT_SEED }).world;

describe('the Aravali crossing', () => {
  it('is a map the game knows about', () => {
    expect(fieldMap('field_map_aravali'), 'the map is not in the exported bundle').toBeTruthy();
  });

  it('hangs two islands over the strait', () => {
    const world = aravali();
    const sky = world.tiles.flat().filter((t) => t.biome === 'sky_island');
    expect(sky.length, 'no floating island was stamped').toBeGreaterThan(40);

    // **Two, not one.** Grouped by row band: an island is a contiguous run of rows, so counting
    // the gaps between rows that hold sky tiles is the cheapest way to ask "how many islands".
    const rows = new Set(sky.map((t) => t.y));
    const sorted = [...rows].sort((a, b) => a - b);
    let gaps = 0;
    for (let i = 1; i < sorted.length; i += 1) {
      if (sorted[i]! - sorted[i - 1]! > 1) gaps += 1;
    }
    expect(gaps, 'the two islands merged into one blob').toBe(1);

    // **Two of a kind, and far apart.** The gap count alone passed while the runs were ten rows
    // and four, one row apart -- a blob with a nick in it rather than a crossing. So this asserts
    // the shape the earlier version got wrong: comparable islands, with real water between them.
    const runs: number[][] = [];
    let run = [sorted[0]!];
    for (let i = 1; i < sorted.length; i += 1) {
      if (sorted[i]! - sorted[i - 1]! === 1) run.push(sorted[i]!);
      else {
        runs.push(run);
        run = [sorted[i]!];
      }
    }
    runs.push(run);
    expect(runs.length, 'not two islands').toBe(2);

    const [north, south] = runs as [number[], number[]];
    const shorter = Math.min(north.length, south.length);
    const longer = Math.max(north.length, south.length);
    expect(longer / shorter, 'one island is much bigger than the other').toBeLessThan(1.5);

    const gap = south[0]! - north[north.length - 1]! - 1;
    // Raised from 5. At 8 the pair read as one shape with a nick in it -- the islands were 11
    // rows each with 8 between them, so the gap was smaller than either island. It is now wider
    // than an island is tall, which is what "two islands" has to mean on screen.
    expect(gap, 'the islands are not far enough apart to read as two').toBeGreaterThan(9);
  });

  it('never lays rail past the last ground at either end', () => {
    // **The line ran off the map, and nothing asked.** `stampLine` sets the flag down the full
    // height so it meets land wherever the coast falls, and beyond the coast it went on setting it
    // across open sea to row 0 and row 63 -- fifteen tiles of railway over the ocean, drawn,
    // leading nowhere.
    //
    // `trackRoute` trimmed exactly this, which is what hid it: every test asked about the *route*,
    // so a train would never have appeared out of the water, and meanwhile `planTrack` read the
    // untrimmed flag and drew rails there. Two readings of one flag, one of them trimmed.
    //
    // Across seeds, because where the coast falls is a function of the seed.
    const map = fieldMaps.find((m) => m.id === 'field_map_aravali')!;
    for (const seed of ['a', 'b', 'c', 'd', 'e']) {
      const world = buildFieldMap(map, { seed }).world;
      const columns = new Map<number, number[]>();
      for (const tile of world.tiles.flat()) {
        if (!tile.track) continue;
        columns.set(tile.x, [...(columns.get(tile.x) ?? []), tile.y]);
      }
      expect(columns.size, `${seed}: no line was laid at all`).toBeGreaterThan(0);

      for (const [x, ys] of columns) {
        for (const end of [Math.min(...ys), Math.max(...ys)]) {
          const biome = world.tiles[end]![x]!.biome;
          expect(
            biome === 'sea' || biome === 'sky_underside',
            `${seed}: the line ends at ${x},${end} over ${biome}, with nothing under it`
          ).toBe(false);
        }
      }
    }
  });

  /**
   * **The islands stand above the water, which is what earns them cliffs.**
   *
   * The stamp wrote biome and left elevation alone, so an island sat in band 0 -- at sea level as
   * far as every height rule knew -- and `planCliffs` drew nothing at its rim. `cliffAt` wants one
   * band over its neighbour, so this is the condition the whole look depends on.
   */
  it('stands the islands a band above the sea, and gives them cliffs', () => {
    const world = aravali();
    for (const tile of world.tiles.flat()) {
      if (tile.biome !== 'sky_island' && tile.biome !== 'sky_underside') continue;
      expect(band(tile.elevation), `${tile.x},${tile.y} is at sea level`).toBeGreaterThan(0);
    }
    // **Counted on the islands, which the old assertion did not do.** It measured
    // `planCliffs(world).length` -- every cliff anywhere on the map -- and passed at over twenty
    // while the islands had none at all. The mainland's own height steps were carrying it. When
    // the strait widened there was less mainland, the number fell to 1, and only then did it
    // become visible that the thing the test is named for had never been true.
    //
    // It could not have been: the top and its rim were both at 0.75, and `cliffAt` needs one band
    // over its neighbour and refuses to draw against water. Equal-to-equal and against-sea were
    // the only two edges an island had.
    const sky = new Set(
      world.tiles
        .flat()
        .filter((t) => t.biome === 'sky_island' || t.biome === 'sky_underside')
        .map((t) => `${t.x},${t.y}`)
    );
    const onTheIslands = planCliffs(world).filter((c) => sky.has(`${c.x},${c.y}`));
    expect(onTheIslands.length, 'the islands have no cliff faces of their own').toBeGreaterThan(20);
  });

  /**
   * **The traveller starts on the shore they come from.**
   *
   * This function was called `startOnTheNearShore` and searched the *north* -- a name describing
   * the thing it did not do. It passed every test because they asked whether the start was on
   * land, and none asked which side of the water it was on. Measured, y=22 of 64: the far bank.
   *
   * Jambhudweepa is home and the arrival text calls the far side "a green smudge that is not
   * Jambhudweepa", so walking north is walking away.
   */
  it('starts the traveller on the southern shore, at the line', () => {
    const world = aravali();
    expect(world.start.y, 'the traveller starts on the far bank').toBeGreaterThan(world.height / 2);

    // **Beside the rail, not merely south of the water.** Pointing the search south fixed the
    // shore and left a second fault: it looked for the tile nearest the *generator's* original
    // start, which was north-east, so it landed on the south-east corner -- 22 tiles from the rail
    // and 8 from the settlement. A player opened the map on an unremarkable stretch of coast with
    // no line and nothing to walk toward, on a map whose whole subject is a crossing.
    const tracked = world.tiles.flat().filter((t) => t.track);
    const nearest = Math.min(
      ...tracked.map((t) => Math.abs(t.x - world.start.x) + Math.abs(t.y - world.start.y))
    );
    expect(nearest, 'the line is not in sight of where the player begins').toBeLessThan(4);

    // And not *on* it: standing on the rail is the one place you cannot see it.
    expect(world.tiles[world.start.y]![world.start.x]!.track, 'the player starts on the rail').toBeFalsy();
  });

  it('never puts an island on land', () => {
    // The stamp only writes over sea, so every island tile must have a neighbour that is water or
    // more island — never forest, never hills. An island on the far shore is not hanging over
    // anything.
    const world = aravali();
    const at = (x: number, y: number) => world.tiles[y]?.[x]?.biome;
    for (const tile of world.tiles.flat()) {
      if (tile.biome !== 'sky_island' && tile.biome !== 'sky_underside') continue;
      const around = [
        at(tile.x + 1, tile.y),
        at(tile.x - 1, tile.y),
        at(tile.x, tile.y + 1),
        at(tile.x, tile.y - 1)
      ].filter(Boolean);
      const overLand = around.some(
        (b) => b === 'forest' || b === 'hills' || b === 'mountains' || b === 'plains'
      );
      expect(overLand, `island at ${tile.x},${tile.y} is sitting on land`).toBe(false);
    }
  });

  it('gives every island a rim of underside', () => {
    const world = aravali();
    const under = world.tiles.flat().filter((t) => t.biome === 'sky_underside');
    // Canon: the underside is "the inverted world beneath an island". Without it the islands are
    // flat green discs, and the one thing the reference image is *about* is missing.
    expect(under.length, 'the islands have no underside').toBeGreaterThan(10);
  });

  it('leaves every other map without a scrap of sky', () => {
    // The whole reason this is a stamp and not a palette entry. If it ever leaks, a river delta
    // grows a floating island.
    for (const map of fieldMaps) {
      if (map.id === 'field_map_aravali') continue;
      const world = buildFieldMap(map, { seed: DEFAULT_SEED }).world;
      const sky = world.tiles.flat().filter((t) => t.biome.startsWith('sky'));
      expect(sky.map((t) => `${t.x},${t.y}`), `${map.id} grew a floating island`).toEqual([]);
    }
  });

  it('is the same crossing every time it is built', () => {
    // The world is baked once and kept, so an island that moved between builds would move under a
    // journey already standing on it.
    const one = aravali().tiles.flat().map((t) => t.biome);
    const two = aravali().tiles.flat().map((t) => t.biome);
    expect(two).toEqual(one);
  });

  /**
   * **The line is what makes a crossing a crossing.**
   *
   * The strait spans the map by design, so without the railway the far shore is unreachable --
   * measured before it existed, `landform.test.ts` reported one reachable tile out of 2,856.
   *
   * The track is `Tile.track` rather than a biome, because the water below stays water: a boat
   * passes under the trestles and the strait stays navigable, which an earlier version broke by
   * turning the crossed tiles into `coast` -- a causeway of piled stone, and a different thing.
   */
  it('carries a line across the water without filling it in', () => {
    const world = aravali();
    const tracked = world.tiles.flat().filter((t) => t.track);
    expect(tracked.length, 'no track was laid').toBeGreaterThan(20);

    // Every tracked tile over the strait is still sea. If this ever fails somebody has gone back
    // to filling the water in, and the strait has stopped being navigable.
    const overWater = tracked.filter((t) => t.biome === 'sea');
    expect(overWater.length, 'the line filled the strait in rather than spanning it').toBeGreaterThan(10);

    // And it reaches both shores: a line that stops halfway is scenery.
    const rows = tracked.map((t) => t.y);
    expect(Math.min(...rows), 'the line does not reach the near shore').toBeLessThan(
      world.height * 0.3
    );
    expect(Math.max(...rows), 'the line does not reach the far shore').toBeGreaterThan(
      world.height * 0.7
    );
  });

  it('starts the traveller on solid ground', () => {
    // The strait is cut after the generator picks a start, so on this map it landed in open sea.
    const world = aravali();
    const here = world.tiles[world.start.y]![world.start.x]!;
    expect(here.biome, 'the traveller starts in the water').not.toBe('sea');
    expect(here.biome, 'the traveller starts under an island').not.toBe('sky_underside');
  });

  /**
   * **The line has to be ridable, not just walkable** — a train is coming, and this is what it
   * runs on.
   *
   * `Tile.track` answers "is there rail here". A vehicle needs the *route*: an ordered run from
   * one shore to the other with no gap in it, because a train that has to jump a tile is not on
   * rails.
   */
  it('carries a continuous route from one shore to the other', () => {
    const world = aravali();
    const route = trackRoute(world);
    expect(route.length, 'the line has no route').toBeGreaterThan(world.height / 2);

    // No gaps: consecutive tiles, all the way down.
    for (let i = 1; i < route.length; i += 1) {
      expect(route[i]!.y - route[i - 1]!.y, `the line jumps at row ${route[i]!.y}`).toBe(1);
    }

    // One column, so a train has somewhere definite to sit rather than three abreast.
    expect(new Set(route.map((p) => p.x)).size, 'the route wanders between columns').toBe(1);

    // Both ends on land: a line that begins over water begins nowhere.
    const first = world.tiles[route[0]!.y]![route[0]!.x]!;
    const last = world.tiles[route[route.length - 1]!.y]![route[route.length - 1]!.x]!;
    expect(first.biome, 'the line starts over open water').not.toBe('sea');
    expect(last.biome, 'the line ends over open water').not.toBe('sea');
  });

  it('can only be boarded where there is something to stand on', () => {
    const world = aravali();
    const route = trackRoute(world);

    // Over the strait there is nothing to step onto -- you are already aboard or you are not.
    //
    // Measured, only three tiles of the centre column are over *open* sea: the two islands fill
    // most of the strait, which is the point of them. A bigger number here would be asserting a
    // longer gap between the piers than the map has.
    const overWater = route.filter((p) => world.tiles[p.y]![p.x]!.biome === 'sea');
    expect(overWater.length, 'the route never crosses water').toBeGreaterThan(1);
    for (const at of overWater) {
      expect(canBoardAt(world, at), `boarding allowed over open water at ${at.x},${at.y}`).toBe(
        false
      );
    }

    // And somewhere along it a traveller can actually get on: the shores and the islands.
    const boardable = route.filter((p) => canBoardAt(world, p));
    expect(boardable.length, 'there is nowhere to board the line at all').toBeGreaterThan(4);
  });

  /**
   * **The line is drawn, and only where it is laid.**
   *
   * `Tile.track` says a rail crosses here; this is the layer that puts one on the screen. It is a
   * fourth scatter contract -- flat, tile-filling, no offset, placed from the world rather than
   * from the ground -- because none of the three that existed fit. Overdraw refused it outright:
   * `frames.test.ts` forbids anything reaching above half the cell, and a rail fills its tile.
   */
  it('draws a rail on every tracked tile and nowhere else', () => {
    const world = aravali();
    const rails = planTrack(world);
    const tracked = world.tiles.flat().filter((t) => t.track);
    expect(rails.length, 'the line is laid but not drawn').toBe(tracked.length);
    for (const rail of rails) {
      expect(world.tiles[rail.y]![rail.x]!.track, `a rail at ${rail.x},${rail.y} is off the line`).toBe(true);
    }
  });

  it('lets the forest have the stretches nothing runs on', () => {
    // Measured: 122 sound and 70 overgrown. The strait crossing is kept because a carriage uses
    // it; the land approaches through forest and hills are not, which is the whole story of the
    // map stated in which frame a tile draws.
    const rails = planTrack(aravali());
    const overgrown = rails.filter((r) => r.frame >= 2);
    expect(overgrown.length, 'no stretch of line has been reclaimed').toBeGreaterThan(10);
    expect(rails.length - overgrown.length, 'no stretch of line is still kept').toBeGreaterThan(10);
  });

  it('leaves every other map without a rail', () => {
    for (const map of fieldMaps) {
      if (map.id === 'field_map_aravali') continue;
      const world = buildFieldMap(map, { seed: DEFAULT_SEED }).world;
      expect(planTrack(world), `${map.id} grew a railway`).toEqual([]);
    }
  });

  /**
   * **Canon says which shore, and the generator listens.**
   *
   * On a map that is one country a place can go anywhere the terrain allows. On a *crossing* there
   * are two shores, and which one a place sits on is as much a fact about it as what it stands on.
   *
   * Without `shore` the Rail-Head -- the place a player arrives at, where people wait for the
   * carriage -- landed at 17,11 on the **northern** bank: 54 tiles away, across the water it
   * exists to cross. Nomad Ground landed north as well, while its own notes put it above a ford
   * forty tiles south.
   */
  it('puts each place on the shore canon names', () => {
    const built = buildFieldMap(fieldMap('field_map_aravali')!, { seed: DEFAULT_SEED });
    const water = built.world.tiles.flat().filter((t) => t.biome === 'sea');
    const middle = water.reduce((sum, t) => sum + t.y, 0) / water.length;

    for (const placed of built.placed) {
      if (placed.poi.shore === 'either') continue;
      const near = placed.at.y > middle;
      expect(
        near,
        `${placed.poi.name} wants the ${placed.poi.shore} shore and sits at ${placed.at.x},${placed.at.y}`
      ).toBe(placed.poi.shore === 'near');
    }
  });

  it('leaves the arrival within sight of the rail-head', () => {
    // The place a player arrives at should be reachable from where they begin, on a map whose
    // subject is a crossing. 54 tiles was the measured distance before `shore` existed.
    const built = buildFieldMap(fieldMap('field_map_aravali')!, { seed: DEFAULT_SEED });
    const head = built.placed.find((p) => p.poi.id === 'poi_rail_head');
    expect(head, 'the rail-head was not placed').toBeTruthy();
    const d =
      Math.abs(head!.at.x - built.world.start.x) + Math.abs(head!.at.y - built.world.start.y);
    expect(d, 'the rail-head is on the far side of the map from the player').toBeLessThan(30);
  });
});
