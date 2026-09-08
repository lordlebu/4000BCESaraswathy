// Two islands hanging over a strait, and the line that crosses them.
//
// **A crossing is a shape no other map has.** Lothal is a delta, Narmada a plateau, Dwarka a
// basin — three countries you wander in. The Aravali is four bands walked in *sequence*: stony
// shore, water, islands, far shore. Canon's `relief: island` says so and this is what draws it.
//
// **Stamped after classification, like the drifts and the settlement.** The reasoning is the one
// `tableland.ts` states and `CLAUDE.md` repeats: `seed_biomes` is a *climate* palette and the
// classifier divides elevation and moisture among everything in it. A floating island is not a
// climate — no amount of moisture makes one — so leaving it to the classifier produces either
// nothing or a third of the map. It is a **place**, and places are stamped.
//
// Pure, and free of React and Phaser like the rest of `world/`.

import { tileHash } from './rng';
import type { BiomeId, Point, World } from './types';

/**
 * How wide the strait is, as a fraction of the map.
 *
 * **The sea narrows here, and that is the whole reason a line was built at this point.** Canon
 * keeps the Shattered Sea a sea — Tamralinga still has its ships — and the Aravali is where it
 * pinches. A fifth of the map is enough water to be a real crossing and little enough to read as
 * a strait rather than an ocean.
 */
const STRAIT = 0.5;

/** Where the strait sits, measured from the near shore. Leaves room for a shore on both sides. */
const STRAIT_AT = 0.25;

/**
 * Which rows the islands sit on, as fractions of the map.
 *
 * **Measured, and the first two attempts were both wrong.** At 0.46/0.56 the rims overlapped and
 * the pair rendered as one blob. At 0.44/0.63 the runs came out *ten rows and four* -- lopsided,
 * one row apart, filling rows 24-38 of 64. That is a 23% band in the middle of the map, which is
 * a nick rather than a crossing.
 *
 * The fault was fractions: a fraction of a 64-row map is not something you can picture, and both
 * numbers looked reasonable and produced neither what the reference shows nor what "two islands"
 * means.
 *
 * A third and two thirds, against a strait that now runs from a quarter to three quarters. That
 * puts roughly twenty rows between the island centres -- the line between them is most of the
 * crossing rather than a gap in a blob -- and both sit well inside open water.
 */
const ISLANDS = [1 / 3, 2 / 3];

/** How wide an island is, in tiles, at its equator. Equal, because two islands are two of a kind. */
const ISLAND_RADIUS = 6;

/**
 * How high an island stands, on the 0-1 elevation scale.
 *
 * **This is what gives the rims their cliffs, and it was the missing piece.** The stamp wrote
 * biome and left elevation alone, so an island sat in band 0 -- at sea level as far as every
 * height rule in the game was concerned -- and `planCliffs` drew nothing at its edge.
 *
 * Above `THRESHOLDS.HILLS` (0.66) puts it in band 1, one band over the water it hangs above, which
 * is exactly the condition `cliffAt` looks for. The cliff sheet then fills the rim slot with rock
 * the same way the treeline fills it with crowns, and neither needs new machinery.
 */
const ISLAND_HEIGHT = 0.75;

/**
 * Cut the strait: a band of open water across the map, with coast on both banks.
 *
 * Runs before the islands, because an island has to hang over water and this is what puts the
 * water there. The classifier will already have made sea somewhere — this makes it a *band*, in
 * one place, which is what turns a country into a crossing.
 */
export function stampStrait(world: World, palette: ReadonlySet<BiomeId>): void {
  // **Gated on the islands, not on the sea**, and that distinction is a regression this caused.
  // Lothal is a delta with `sea` in its palette, so keying on water alone cut a strait clean
  // across it and severed the map -- `landform.test.ts` reported it "cut in two" immediately.
  //
  // `sky_island` is what makes a map a crossing: it is in exactly one palette, canon put it
  // there, and no delta will ever acquire one by accident.
  if (!palette.has('sky_island') || !palette.has('sea')) return;

  const from = Math.floor(world.height * STRAIT_AT);
  const to = Math.floor(world.height * (STRAIT_AT + STRAIT));

  for (let y = from; y < to; y += 1) {
    for (let x = 0; x < world.width; x += 1) {
      const tile = world.tiles[y]?.[x];
      if (!tile) continue;
      // A wobbling edge rather than a ruled line: a strait is a piece of geography, and two
      // straight banks read as a canal somebody dug.
      const wobble = tileHash(world.seed, x, 0, 'strait') % 3;
      const near = y < from + 1 + wobble;
      const far = y >= to - 1 - wobble;
      tile.biome = near || far ? 'coast' : 'sea';
    }
  }
}

/**
 * Hang the islands over the water.
 *
 * A rounded patch of `sky_island` with a rim of `sky_underside`, which is the honest way round:
 * canon says the underside is *"the inverted world beneath an island, where gravity is warped and
 * rainwater falls upward"*, so it is what you see at the edges from a distance and what a player
 * walking the rim is standing over.
 *
 * Returns where they landed, so the caller can put places on them.
 */
export function stampIslands(world: World, palette: ReadonlySet<BiomeId>): Point[] {
  if (!palette.has('sky_island')) return [];

  const middle = Math.floor(world.width / 2);
  const centres: Point[] = [];

  for (const along of ISLANDS) {
    const cy = Math.floor(world.height * along);
    // Offset each island a little off the centre line so the pair does not read as a ruler.
    const drift = (tileHash(world.seed, cy, 0, 'island') % 7) - 3;
    const cx = middle + drift;
    centres.push({ x: cx, y: cy });

    for (let dy = -ISLAND_RADIUS - 1; dy <= ISLAND_RADIUS + 1; dy += 1) {
      for (let dx = -ISLAND_RADIUS - 1; dx <= ISLAND_RADIUS + 1; dx += 1) {
        const x = cx + dx;
        const y = cy + dy;
        const tile = world.tiles[y]?.[x];
        if (!tile) continue;
        // **Only over open water.** An island that overwrites the far shore is not hanging over
        // anything -- it reads as a hill somebody drew in the wrong colour, and it eats the band
        // the player is walking towards. Measured: without this the second island landed six rows
        // into the far shore and took a bite out of it.
        if (tile.biome !== 'sea' && tile.biome !== 'sky_island' && tile.biome !== 'sky_underside') {
          continue;
        }
        // Round, with the seed roughening the edge by a tile so two islands are not twins.
        const rough = tileHash(world.seed, x, y, 'rim') % 2;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d <= ISLAND_RADIUS - 1 + rough) {
          tile.biome = 'sky_island';
          // **Raised out of band 0, which is what earns the rim its cliffs.** See ISLAND_HEIGHT.
          tile.elevation = ISLAND_HEIGHT;
        } else if (d <= ISLAND_RADIUS + rough && palette.has('sky_underside')) {
          tile.biome = 'sky_underside';
          // The rim stands as high as the top it hangs from -- it *is* the island's edge, seen
          // from the side. Left at sea level it would read as a beach around a hill.
          tile.elevation = ISLAND_HEIGHT;
        }
      }
    }
  }
  return centres;
}

/**
 * How wide the line is, in tiles either side of its centre.
 *
 * One, so the walkable causeway is three tiles across. Wide enough that a player does not have to
 * thread a needle at a tile's precision, narrow enough that it reads as a line laid over water
 * rather than as a spit of land.
 */
const LINE_HALF_WIDTH = 1;

/**
 * Lay the railway: the only way from one shore to the other.
 *
 * **Without this the map is unplayable, and the suite says so plainly** -- `landform.test.ts`
 * reported "field_map_aravali is cut in two: expected 1 to be 2829", which is the whole far shore
 * unreachable. The strait spans the map by design, so the line is not scenery: it is the thing
 * that makes a crossing a crossing rather than two maps that happen to share a file.
 *
 * Marked with `Tile.track` rather than by changing the biome. The water below stays water and
 * stays navigable; only the walking changes. The rails themselves belong to the overdraw layer,
 * where the fences already live.
 *
 * **The line floats.** It is laid on the same Permian-irradiated lodestone that holds the islands
 * up, and it hangs at the height the ore wants -- which is why it runs level over open water and
 * why nothing has ever been built beneath it. An earlier version of this module called them
 * trestles and that was a guess; canon's own physics gives the better answer, and it is the reason
 * a boat passes under without lowering a mast.
 *
 * It runs through both islands rather than past them: the islands are the piers. That is what the
 * reference image shows and it is why they are where they are.
 */
export function stampLine(world: World, _palette: ReadonlySet<BiomeId>, islands: readonly Point[]): void {
  if (islands.length === 0) return;

  // The line runs the full height of the map through the islands' own column, so it meets land on
  // both shores wherever the coast happens to fall.
  const x = Math.round(islands.reduce((sum, i) => sum + i.x, 0) / islands.length);

  for (let y = 0; y < world.height; y += 1) {
    for (let dx = -LINE_HALF_WIDTH; dx <= LINE_HALF_WIDTH; dx += 1) {
      const tile = world.tiles[y]?.[x + dx];
      if (!tile) continue;
      // **The track is laid over the ground, never instead of it.** The sea below stays sea and
      // stays navigable -- the line floats on lodestone and a boat passes under it. An earlier
      // version turned these tiles into `coast`, which is a causeway of piled stone: a different
      // thing, and one that would have closed the strait to shipping in a sea canon keeps
      // working.
      //
      // It runs the full height so it meets land on both shores, and it crosses the underside rim
      // the same way. The rim is deliberately unwalkable -- `generate.ts` groups `sky_underside`
      // with `sea` -- so without the track an island ringed in it is sealed, and the whole far
      // shore is unreachable. The track is the one place the edge has been made passable, which
      // is precisely what a pier is.
      tile.track = true;
    }
  }
}

/**
 * Put the traveller on the **southern** shore, which is the one they come from.
 *
 * **This function used to be called `startOnTheNearShore` and searched the north**, which is a
 * name describing the thing it did not do. It passed every test, because the tests asked whether
 * the start was on land -- which it was -- and nothing asked whether it was on the shore the
 * player arrives from. Measured, it put the traveller at y=22 on a 64-row map: the far side.
 *
 * South is not arbitrary. Jambhudweepa is home and the map's own arrival text calls the far bank
 * "a green smudge that is not Jambhudweepa", so walking north is walking away. Both shores carry
 * about 1,200 walkable tiles, so choosing the right one costs nothing.
 *
 * Nearest walkable land below the strait, searched outward from where the generator wanted to be,
 * so the choice still respects whatever it was optimising for.
 */
export function startOnTheSouthernShore(world: World): void {
  const strait = Math.floor(world.height * (STRAIT_AT + STRAIT));
  const walkable = (x: number, y: number): boolean => {
    const tile = world.tiles[y]?.[x];
    return !!tile && tile.biome !== 'sea' && tile.biome !== 'sky_underside' && !tile.track;
  };
  if (walkable(world.start.x, world.start.y) && world.start.y > strait) return;

  let best: Point | null = null;
  let bestDistance = Infinity;
  for (let y = strait + 1; y < world.height; y += 1) {
    for (let x = 0; x < world.width; x += 1) {
      if (!walkable(x, y)) continue;
      const d = (x - world.start.x) ** 2 + (y - world.start.y) ** 2;
      if (d < bestDistance) {
        bestDistance = d;
        best = { x, y };
      }
    }
  }
  if (best) world.start = best;
}

/**
 * Every tile the line runs along, in order from one shore to the other.
 *
 * **What a vehicle needs that `Tile.track` alone does not give.** The flag answers "is there rail
 * here"; a train needs the *route* -- an ordered run it can be moved along, with both ends on
 * solid ground so a player can board at one and get off at the other.
 *
 * Returned north to south, which is the direction the line is laid. A caller wanting the other
 * way round reverses it; baking a direction in here would be a fact about one journey rather than
 * about the line.
 *
 * Measured on the Aravali: 192 tiles across three columns, contiguous from row 0 to row 63 with
 * no gaps. The route this returns is the middle column, which is the one a train would sit on.
 */
export function trackRoute(world: World): Point[] {
  const tracked = world.tiles.flat().filter((t) => t.track);
  if (tracked.length === 0) return [];

  // The middle of however many columns the line occupies: the rails are three tiles wide so a
  // walker is not threading a needle, but a train runs down the centre of them.
  const columns = [...new Set(tracked.map((t) => t.x))].sort((a, b) => a - b);
  const centre = columns[Math.floor(columns.length / 2)]!;

  const down = tracked.filter((t) => t.x === centre).sort((a, b) => a.y - b.y);

  // **Trimmed to the shores.** The stamp runs the full height so the line meets land wherever the
  // coast falls, which leaves rail hanging off both map edges over open sea. A route that starts
  // over water starts nowhere: a train would appear out of the ocean. So the route is the run
  // between the outermost tiles that have ground under them.
  const solid = (t: { x: number; y: number }): boolean => {
    const biome = world.tiles[t.y]?.[t.x]?.biome;
    return biome !== undefined && biome !== 'sea' && biome !== 'sky_underside';
  };
  const first = down.findIndex(solid);
  if (first === -1) return [];
  let last = down.length - 1;
  while (last > first && !solid(down[last]!)) last -= 1;

  return down.slice(first, last + 1).map((t) => ({ x: t.x, y: t.y }));
}

/**
 * Whether a traveller standing here could board.
 *
 * On the rail *and* on ground that holds you up -- the shore ends of the line and the islands it
 * calls at. Standing on the stretch over open water is not boarding; it is already being aboard,
 * and there is nothing there to step onto.
 */
export function canBoardAt(world: World, at: Point): boolean {
  const tile = world.tiles[at.y]?.[at.x];
  if (!tile?.track) return false;
  return tile.biome !== 'sea' && tile.biome !== 'sky_underside';
}
