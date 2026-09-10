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
import { canBoardAt, railSpan, shoreheads, trackRoute } from '../src/world/crossing';
import { band } from '../src/world/classify';
import { planClouds, planCliffs, planIslandShadow, planTrack } from '../src/game/scenePlan';
import { CLOUD_PATTERNS } from '../src/game/frames';
import { fieldMap, fieldMaps } from '../src/content/places';
import { DEFAULT_SEED } from '../src/ui/seed';

/**
 * How far below its own lowest top row an island's shelf can reach, in tiles.
 *
 * Only wide enough to read one island: the pair are twelve rows apart, so a window any wider finds
 * the far island's top under the near one's shelf.
 */
const SHELF_REACH = 8;

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

  it('casts a shadow on the water, so the islands read as floating', () => {
    // **The one thing that says the island is not simply an island.** Grass to the edge, a rock
    // face under the lip, cliffs along the joint -- all of that is equally true of a sea stack.
    // What separates them is that light gets under one of them.
    const world = aravali();
    const shadow = planIslandShadow(world);
    expect(shadow.length, 'the islands cast no shadow').toBeGreaterThan(30);

    for (const tile of shadow) {
      expect(
        world.tiles[tile.y]![tile.x]!.biome,
        `shadow at ${tile.x},${tile.y} is not on open water`
      ).toBe('sea');
      // Something of the island is above it, within reach.
      const above = [1, 2, 3, 4].some((up) => {
        const biome = world.tiles[tile.y - up]?.[tile.x]?.biome;
        return biome === 'sky_island' || biome === 'sky_underside';
      });
      expect(above, `shadow at ${tile.x},${tile.y} has nothing above it`).toBe(true);
      expect(tile.alpha!, 'a shadow with no darkness in it').toBeGreaterThan(0);
      expect(tile.alpha!, 'the shadow is opaque').toBeLessThan(0.5);
    }

    // And nowhere else: three of the four maps have no islands, so nothing hangs over their water.
    for (const map of fieldMaps) {
      if (map.id === 'field_map_aravali') continue;
      expect(
        planIslandShadow(buildFieldMap(map, {}).world).length,
        `${map.id} has shadows without islands`
      ).toBe(0);
    }
  });

  it('lays one railway, not several side by side', () => {
    // **Three parallel tracks ran up the middle of the sea, and every test passed.** The line was
    // stamped a tile either side of centre so a player would not have to thread a needle walking
    // it, from when the rail was the only way across. But `planTrack` draws a full set of rails on
    // every tile carrying the flag, so "three tiles wide" is not a wide railway -- it is three
    // railways. Nothing asked how many, only whether the route was continuous and one column
    // wide, and the route was always the centre column of the three.
    //
    // The ropes carry the walking now, so the premise is gone as well as the look.
    for (const seed of ['a', 'b', 'c']) {
      const world = buildFieldMap(fieldMaps.find((m) => m.id === 'field_map_aravali')!, { seed }).world;
      const span = railSpan(world);
      expect(span, `${seed}: no rail span`).not.toBeNull();

      // Every row of the rail carries exactly one tile of line.
      for (let y = span!.from; y <= span!.to; y += 1) {
        const across = world.tiles[y]!.filter((t) => t.track).length;
        expect(across, `${seed}: row ${y} carries ${across} lines abreast`).toBe(1);
      }
    }
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
  it('carries a continuous route from one island to the other', () => {
    // **Island to island, which is a change of premise rather than a change of number.** The route
    // used to run shore to shore, and the test asked for more than half the map. The rail is now
    // only the span between the two islands -- the shore ends are rope, and a carriage does not
    // run on a rope -- so the right question is whether both ends are standing on an island.
    const world = aravali();
    const route = trackRoute(world);
    expect(route.length, 'the line has no route').toBeGreaterThan(10);

    // No gaps: consecutive tiles, all the way down.
    for (let i = 1; i < route.length; i += 1) {
      expect(route[i]!.y - route[i - 1]!.y, `the line jumps at row ${route[i]!.y}`).toBe(1);
    }

    // One column, so a train has somewhere definite to sit rather than three abreast.
    expect(new Set(route.map((p) => p.x)).size, 'the route wanders between columns').toBe(1);

    // Both ends on an island, which is what the rail is strung between and what holds it up.
    for (const end of [route[0]!, route[route.length - 1]!]) {
      expect(
        world.tiles[end.y]![end.x]!.biome,
        `the rail ends at ${end.x},${end.y}, which is not an island`
      ).toBe('sky_island');
    }

    // And the ropes reach ground on both shores, or the islands cannot be got onto at all.
    const heads = shoreheads(world);
    for (const [side, head] of Object.entries(heads)) {
      expect(head, `no rope came ashore on the ${side} side`).not.toBeNull();
      const biome = world.tiles[head!.y]![head!.x]!.biome;
      expect(
        biome === 'sea' || biome === 'sky_underside' || biome === 'sky_island',
        `the ${side} rope ends at ${head!.x},${head!.y} over ${biome} rather than on a shore`
      ).toBe(false);
    }
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

describe('the shelf hangs as a body, not a skirt', () => {
  it('hangs deeper under the middle of an island than under its tips', () => {
    // A uniform depth is a rectangle with a ragged bottom -- the same rock under the centre of the
    // island as under its far edges, which says the shelf is a border rather than a mass. The
    // reference is a rounded underside coming to a point, and the island is already an ellipse, so
    // the taper is one cosine.
    //
    // Measured as a comparison rather than against fixed numbers: whatever `SHELF_DEPTH` is tuned
    // to, the middle has to hang further than the tips or the taper is not doing anything.
    const world = buildFieldMap(fieldMaps.find((m) => m.id === 'field_map_aravali')!, {}).world;
    const depthByColumn = new Map<number, number>();
    for (const row of world.tiles) {
      for (const tile of row) {
        if (tile.biome !== 'sky_underside') continue;
        depthByColumn.set(tile.x, (depthByColumn.get(tile.x) ?? 0) + 1);
      }
    }
    const columns = [...depthByColumn.keys()].sort((a, b) => a - b);
    expect(columns.length, 'no shelf at all').toBeGreaterThan(6);

    const middle = columns[Math.floor(columns.length / 2)]!;
    const deepest = Math.max(...columns.map((c) => depthByColumn.get(c)!));
    const tips = [columns[0]!, columns[columns.length - 1]!].map((c) => depthByColumn.get(c)!);
    expect(depthByColumn.get(middle)!, 'the middle should hang further than the tips')
      .toBeGreaterThan(Math.min(...tips));
    expect(deepest, 'the shelf never gets deep enough to read as a body').toBeGreaterThanOrEqual(3);
    // And every column still hangs something: a tip with no rock under it reads as the grass
    // having been cut off with scissors.
    expect(Math.min(...tips), 'an island tip hangs over nothing').toBeGreaterThan(0);
  });

  it('never hangs the shelf where island top belongs', () => {
    // The taper is about what hangs *below*. If it ever ate island top, the map would lose walkable
    // ground and the places standing on it would go too -- which is the moat the shelf was moved
    // out of in the first place.
    //
    // **Stated as a relationship rather than a count**, which is a correction: this pinned the
    // island at 296 tiles, and that is a fact about one radius on one map size rather than about
    // the taper. It failed the moment either was experimented with, which is a test objecting to
    // the wrong thing.
    const world = buildFieldMap(fieldMaps.find((m) => m.id === 'field_map_aravali')!, {}).world;
    const top = world.tiles.flat().filter((t) => t.biome === 'sky_island');
    expect(top.length, 'no island at all').toBeGreaterThan(100);

    // **Split into the two islands, because every question below is about one of them.** They
    // share columns -- the pair sits on one line up the middle of the map -- so anything asked
    // per *column* across the whole map answers about whichever island happens to be lower.
    const rows = [...new Set(top.map((t) => t.y))].sort((a, b) => a - b);
    const blobs: (typeof top)[] = [[]];
    let previous = rows[0]!;
    for (const y of rows) {
      if (y - previous > 1) blobs.push([]);
      blobs[blobs.length - 1]!.push(...top.filter((t) => t.y === y));
      previous = y;
    }
    expect(blobs.length, 'the pair read as one island').toBe(2);

    // **And no shelf tile sits above the top it hangs from**, asked island by island. Asking it
    // per *column across the whole map* finds the far island under every shelf tile of the near
    // one and fails on a map that is perfectly correct -- the two sit on one line up the middle,
    // twelve rows apart, which is well inside an island's own height. That is how the first
    // version of this went wrong.
    for (const blob of blobs) {
      const first = Math.min(...blob.map((t) => t.y));
      const last = Math.max(...blob.map((t) => t.y));
      const lip = new Map<number, number>();
      for (const t of blob) lip.set(t.x, Math.max(lip.get(t.x) ?? -1, t.y));

      for (const row of world.tiles) {
        for (const t of row) {
          if (t.biome !== 'sky_underside') continue;
          // This island's own band: its top, and the rows the shelf can reach below it.
          if (t.y < first || t.y > last + SHELF_REACH) continue;
          const under = lip.get(t.x);
          if (under === undefined) continue; // off the island's ends, so nothing to be above
          expect(t.y, `shelf at ${t.x},${t.y} sits above this island's top at ${t.x},${under}`)
            .toBeGreaterThan(under);
        }
      }
    }
  });
});

describe('cloud over the strait, and outside the islands', () => {
  it('never puts a cloud on anything a player has to see', () => {
    // **The whole safety argument for the layer is this test.** A cloud is translucent and drawn
    // above the water, so if it could land anywhere but open sea it would be a haze over the
    // thing underneath -- a shore, a shelf, a point of interest, or the railway, which is the only
    // way across the map. It is cheap to keep it off all of them and expensive to notice later.
    const world = aravali();
    const clouds = planClouds(world);
    expect(clouds.length, 'the crossing has no cloud over it at all').toBeGreaterThan(20);

    for (const puff of clouds) {
      const tile = world.tiles[puff.y]![puff.x]!;
      expect(tile.biome, `cloud at ${puff.x},${puff.y} is not over open water`).toBe('sea');
      expect(tile.track ?? false, `cloud at ${puff.x},${puff.y} covers the railway`).toBe(false);
    }
  });

  it('draws each tile with a pattern the scene can bake', () => {
    // The plan names a pattern and `tileTextures` bakes one. Both read `CLOUD_PATTERNS` from
    // `frames.ts` so they cannot drift, and this is the assertion that says so out loud -- a plan
    // naming a pattern with no texture behind it draws nothing at all, silently.
    for (const puff of planClouds(aravali())) {
      expect(puff.frame).toBeGreaterThanOrEqual(0);
      expect(puff.frame, 'no texture is baked for this pattern').toBeLessThan(CLOUD_PATTERNS);
      expect(puff.alpha ?? 0, 'a cloud you cannot see still costs a quad').toBeGreaterThan(0.05);
      expect(puff.alpha ?? 1, 'cloud thick enough to hide the sea under it').toBeLessThan(0.7);
    }
  });

  it('gathers into banks rather than scattering', () => {
    // **A cloud is a cluster, and a scatter of single translucent cells is the map's own grid.**
    // The falloff from each heart is what carries the shape, so almost every cloud tile should
    // have another beside it; a lone tile is the ragged edge of a bank, not the rule.
    const clouds = planClouds(aravali());
    const at = new Set(clouds.map((c) => `${c.x},${c.y}`));
    const lonely = clouds.filter(
      (c) =>
        !at.has(`${c.x - 1},${c.y}`) &&
        !at.has(`${c.x + 1},${c.y}`) &&
        !at.has(`${c.x},${c.y - 1}`) &&
        !at.has(`${c.x},${c.y + 1}`)
    );
    expect(lonely.length / clouds.length, 'the cloud is a scatter, not banks').toBeLessThan(0.1);
  });

  it('costs less than the layer it sits beside', () => {
    // **Blended fill is the budget** -- `docs/rendering.md` -- and this is a full-cell translucent
    // quad, the expensive kind. Decor is the layer that has been measured against the frame
    // budget, so it is the yardstick: cloud stays under it, and a change that pushes past this is
    // a change that wants `npm run perf` run before it lands.
    const world = aravali();
    const clouds = planClouds(world);
    const sea = world.tiles.flat().filter((t) => t.biome === 'sea').length;
    expect(clouds.length / sea, 'cloud covers too much of the water').toBeLessThan(0.3);
  });

  it('leaves the maps with no sky in them alone', () => {
    // Cloud over Lothal's harbour is a different picture and a different argument. This one is
    // about the air between a floating island and the sea, so it only exists where there is one.
    for (const map of fieldMaps) {
      if (map.id === 'field_map_aravali') continue;
      const world = buildFieldMap(map, { seed: map.id }).world;
      expect(planClouds(world).length, `${map.id} grew weather it never asked for`).toBe(0);
    }
  });
});
