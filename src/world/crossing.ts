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
import { isWalkable } from './generate';
import type { BiomeId, Point, World } from './types';

/**
 * How wide the strait is, as a fraction of the map.
 *
 * **The sea narrows here, and that is the whole reason a line was built at this point.** Canon
 * keeps the Shattered Sea a sea — Tamralinga still has its ships — and the Aravali is where it
 * pinches. Wide enough to be a real crossing, narrow enough to read as a strait rather than an
 * ocean.
 *
 * **Widened from a half, and then pulled back from seven tenths.** A half left eight rows between
 * the islands, which is less than an island is tall, so the pair read as one shape with a nick in
 * it. Seven tenths separated them properly and cost too much: the shores fell to six or seven rows
 * each, too thin for the landform shaper to raise any height on, and the map's high ground went
 * with them. The Quiet Atelier stands high and had nowhere high to stand; The Kept Stones wants
 * hills and the far shore had none left.
 *
 * Sixty-two hundredths keeps twelve rows of shore at each end, which is what carries the relief.
 * The separation is bought by making the islands smaller instead. Measured: shores at rows 0-11
 * and 51-63, islands at 15-24 and 37-46, twelve rows of open water between them.
 */
const STRAIT = 0.62;

/** Where the strait sits, measured from the near shore. Leaves room for a shore on both sides. */
const STRAIT_AT = 0.19;

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
 * A third and two thirds, against a strait running from a quarter to three quarters, put the runs
 * at 17-27 and 36-46: eleven rows each with eight between them, so the gap was *smaller than
 * either island*. On screen that is one shape with a nick in it, which is how it was reported.
 *
 * These are pushed to the ends of the widened strait and the radius cut with them, so the gap is
 * wider than an island is tall.
 *
 * **Re-measured on the 52 x 78 map**, where the strait is forty-nine rows rather than forty-one
 * and there is room to place the pair rather than merely fit it. Nudged off the ends by two
 * hundredths, because at 0.32 the northern island came within a single row of the far shore's
 * beach: not touching, so nothing failed, but on screen an island hanging over open water was
 * about to graze the sand. Measured now: tops at 21-31 and 46-56, eleven rows each, fourteen rows
 * of open sea between, and four rows of clearance off each bank.
 */
const ISLANDS = [0.34, 0.66];

/**
 * How high the strait's own beaches stand. Below `THRESHOLDS.HILLS`, so a bank is band 0.
 *
 * Not zero: a beach is still land, and flattening it to sea level would put a cliff face along
 * every inland edge of it where the ground climbs away again.
 */
const BEACH_HEIGHT = 0.5;

/**
 * How wide and how deep an island is, in tiles from its centre.
 *
 * **Wider than tall, and that is read straight off the reference.** The islands there are about
 * two fifths of the picture across and about a fifth of it down -- on a two-to-three canvas that
 * is an island half again wider than it is deep, not a circle. Drawing them round was the reason
 * they had to be shrunk to make room for each other: a circle big enough to look like the
 * reference across is also tall enough to close the gap between them.
 *
 * An ellipse gets both. Twenty-one tiles across on a fifty-two wide map is the reference's own
 * proportion, and eleven deep leaves fourteen rows of open water between the pair -- wider than
 * an island, which is what "two islands" has to mean on screen.
 *
 * **The width grew with the map and the depth did not**, and that asymmetry is the whole reason
 * the map grew. Across, an island can have whatever the map is wide; down, it is competing with
 * the gap between the pair and the two rows of clearance that keep either one from touching a
 * bank -- a strait of forty-nine rows holds two elevens, a gap wider than either, and not much
 * else. Twelve deep closes the gap to less than an island is tall, which is the fault this file
 * has already recorded twice.
 */
const ISLAND_RADIUS_X = 10;
const ISLAND_RADIUS_Y = 5;

/**
 * How high an island stands, on the 0-1 elevation scale.
 *
 * **This is what gives the rims their cliffs, and it was the missing piece.** The stamp wrote
 * biome and left elevation alone, so an island sat in band 0 -- at sea level as far as every
 * height rule in the game was concerned -- and `planCliffs` drew nothing at its edge.
 *
 * Above `THRESHOLDS.MOUNTAINS` (0.82) puts it in band 2 -- one band over its own rim, which is the
 * edge `cliffAt` can actually see. It used to be 0.75, band 1, on the reasoning that one band over
 * the *sea* was enough; it is not, because `cliffAt` refuses to draw a face against water. The
 * cliff sheet then fills the rim slot with rock the same way the treeline fills it with crowns,
 * and neither needs new machinery.
 */
const ISLAND_HEIGHT = 0.9;

/**
 * How high the rim stands, on the same scale.
 *
 * **One band below the top, and this is what actually draws the cliff.** The top was raised out of
 * band 0 so it would stop reading as sea level, and a test then asserted the islands "have cliff
 * faces" and passed -- while counting every cliff on the map. The islands had none and never had.
 *
 * `cliffAt` wants one band over its neighbour and refuses to draw against water, so an island top
 * at band 1 ringed in a rim also at band 1, itself surrounded by sea, could not produce a face
 * anywhere: the only two edges available were equal-to-equal and against-water. Both are silent.
 *
 * Top at band 2, rim at band 1 gives the rim its rock. It is also the honest reading of what the
 * underside *is* -- the shelf hangs below the ground it holds up, so it is lower, and canon's own
 * words for it are "the inverted world beneath an island".
 */
const ISLAND_RIM_HEIGHT = 0.75;

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

      // **A beach is low, and nothing was making this one low.** `landform.ts` drops elevation at
      // the *map* edge, which is what a shore meant while the only water was the sea around the
      // outside. The strait is stamped afterwards, so its banks kept whatever height the shaper
      // had given them -- and once the southern landmass was tilted up into the Aravali range, the
      // sand at the water's edge came out at band 2. The Rail-Head is `stands: low` and there was
      // no low ground within reach of the rails for it to stand on.
      //
      // The water here is a stamped place, so its beach is stamped with it. Only downward: a bank
      // that was already low stays exactly as it was.
      if (near || far) tile.elevation = Math.min(tile.elevation, BEACH_HEIGHT);
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

    for (let dy = -ISLAND_RADIUS_Y - 1; dy <= ISLAND_RADIUS_Y + 1; dy += 1) {
      for (let dx = -ISLAND_RADIUS_X - 1; dx <= ISLAND_RADIUS_X + 1; dx += 1) {
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
        // Rounded, with the seed roughening the edge so two islands are not twins.
        //
        // **The roughness is per column, not per tile.** A hash on `(x, y)` let every tile of the
        // boundary decide for itself, which is not an outline -- it is static along the edge, and
        // it is why the island came out blocky with single squares poking off it. Hashing the
        // column alone moves the whole of one column's edge in or out together, which is what an
        // irregular coast looks like. It also cannot strand a tile, which the per-tile version
        // managed twice.
        //
        // The distance is normalised against each axis, so `d` is 1 exactly on the ellipse and the
        // threshold below still means "top" whatever shape the island is.
        //
        // **There is no rim case here any more.** The underside used to be a ring stamped just
        // inside the ellipse, which took a tile of grass off the island all the way round and gave
        // it a grey moat -- a crater rather than a shelf. It hangs underneath now: see
        // `hangTheShelf`.
        const rough = tileHash(world.seed, x, 0, 'rim') % 2;
        const ex = dx / ISLAND_RADIUS_X;
        const ey = dy / ISLAND_RADIUS_Y;
        const d = Math.sqrt(ex * ex + ey * ey) * ISLAND_RADIUS_Y;
        if (d <= ISLAND_RADIUS_Y + rough) {
          tile.biome = 'sky_island';
          // **Raised out of band 0, which is what earns the shelf its cliffs.** See ISLAND_HEIGHT.
          tile.elevation = ISLAND_HEIGHT;
        }
      }
    }
  }

  for (const centre of centres) firmUp(world, centre);
  if (palette.has('sky_underside')) for (const centre of centres) hangTheShelf(world, centre);
  // After the shelf, because the outflow runs to the island's lower rim and the rim is only
  // final once the shelf has been hung under it.
  for (const centre of centres) pourAPool(world, centre);
  return centres;
}

/**
 * How far the pool reaches from its own middle, in tiles.
 *
 * Wide and shallow, like the island. Big enough to be a place on the map rather than a puddle,
 * small enough that it does not eat the walkable top two points of interest stand on. Measured on
 * the Aravali: 69 tiles of water against 296 of island top, so about **35 of 183 per island** --
 * a fifth, once the channel and whatever slivers it strands are counted in.
 */
const POOL_REACH_X = 3;
const POOL_REACH_Y = 2;

/**
 * Standing water on the island, and the run that carries it off the edge.
 *
 * **The pool is not the point; the outflow is.** A pond in the middle of a floating island is a
 * texture change. What makes it read as a floating island is water going *over the side* -- the
 * reference's whole silhouette is a river crossing the top and falling into open air -- and that
 * needs water actually touching the lower rim for the fall to hang from. So this stamps both: a
 * blob off-centre, and a one-tile channel from its lowest edge down to wherever the island stops.
 *
 * **Walkable, at cost 1, and that is deliberate.** A pool that severed the island would put the
 * places on the far side of it out of reach, and `landform.test.ts` would say so as "cut in two".
 * Making it walkable means the channel cannot isolate anything however it lands, which is worth
 * more than the realism of not being able to wade an ankle-deep pool.
 *
 * Elevation is left alone. The island's top stands at `ISLAND_HEIGHT` so that `cliffAt` can see a
 * step at its rim, and dropping the pool below that would cut a notch in the cliff exactly where
 * the water goes over -- which is the one place the rock should read as continuous.
 */
function pourAPool(world: World, centre: Point): void {
  const isTop = (x: number, y: number) => world.tiles[y]?.[x]?.biome === 'sky_island';

  // Off-centre, so the pool is a feature of the island rather than a bullseye in it. West of the
  // middle: the line runs up the centre and water over the rails reads as a flood.
  const px = centre.x - Math.floor(ISLAND_RADIUS_X / 2);
  const py = centre.y + ((tileHash(world.seed, centre.y, 0, 'pool') % 3) - 1);

  const wet = (x: number, y: number): boolean => {
    const tile = world.tiles[y]?.[x];
    // Only the island's own top, and never the railway -- the line is the thing a player has to be
    // able to follow, and water drawn over it is the one place this layer could confuse the map.
    if (!tile || tile.biome !== 'sky_island' || tile.track === true) return false;
    tile.biome = 'sky_water';
    return true;
  };

  for (let dy = -POOL_REACH_Y; dy <= POOL_REACH_Y; dy += 1) {
    for (let dx = -POOL_REACH_X; dx <= POOL_REACH_X; dx += 1) {
      const ex = dx / (POOL_REACH_X + 1);
      const ey = dy / (POOL_REACH_Y + 1);
      if (Math.sqrt(ex * ex + ey * ey) > 1) continue;
      wet(px + dx, py + dy);
    }
  }

  // The outflow: straight down its own column until the island stops. Straight rather than
  // wandering, because a channel that meanders across a twelve-row island is a river and this is
  // a few tiles of water finding the nearest edge.
  for (let y = py + POOL_REACH_Y; isTop(px, y) || world.tiles[y]?.[px]?.biome === 'sky_water'; y += 1) {
    if (!wet(px, y) && world.tiles[y]?.[px]?.biome !== 'sky_water') break;
  }

  floodTheSlivers(world, centre);
}

/**
 * Any scrap of island top the channel cut off becomes water too.
 *
 * **The channel severs ground, and this is measured rather than feared.** `landform.test.ts`
 * reported the Aravali "cut in two: expected 2031 to be 2035" the first time the pool went in --
 * four tiles, the wedge between the outflow and the island's own edge, walled off by unwalkable
 * water on one side and open air on the other.
 *
 * **It still severs ground now that the water is walkable, which was predicted otherwise.**
 * `docs/sky-islands-plan.md` said this function could go once wading arrived, on the reasoning that
 * walkable water cannot wall anything off. It was tried: every test passed on the default seed, and
 * a sweep of twelve seeds found seed `a` stranding one tile anyway. Water is not the only thing
 * doing the walling -- the shelf is unwalkable rock, and the pool only has to take the *last*
 * connection for a scrap to be cut off by the two together.
 *
 * The lesson is the cheaper one: a guard whose failure is seed-dependent cannot be retired by a
 * suite that runs one seed. `test/crossing.test.ts` sweeps twelve now, which is what would have
 * caught this without the removal being tried.
 *
 * Four tiles is not a place. Nothing can be reached there, nothing will be placed there, and a
 * player who could see it would only wonder why they cannot get to it -- so it is not ground, it
 * is the far side of the water, and the honest thing is to say so. This is `firmUp`'s flood run a
 * second time for a second reason: that one demotes stranded top to rim after the *rim* is
 * roughened, this one floods it after the *channel* is cut.
 *
 * Widening the channel or steering it around the wedge were both tried in the head and neither
 * survives contact: where the wedge falls depends on the hashed pool offset and the roughened
 * island edge, so any rule that avoids it on this seed meets it on another.
 */
function floodTheSlivers(world: World, centre: Point): void {
  const isTop = (x: number, y: number) => world.tiles[y]?.[x]?.biome === 'sky_island';
  if (!isTop(centre.x, centre.y)) return;

  const joined = new Set<string>([`${centre.x},${centre.y}`]);
  const queue: Point[] = [centre];
  while (queue.length > 0) {
    const at = queue.shift()!;
    for (const next of [
      { x: at.x - 1, y: at.y },
      { x: at.x + 1, y: at.y },
      { x: at.x, y: at.y - 1 },
      { x: at.x, y: at.y + 1 }
    ]) {
      const key = `${next.x},${next.y}`;
      if (joined.has(key) || !isTop(next.x, next.y)) continue;
      joined.add(key);
      queue.push(next);
    }
  }

  for (let dy = -ISLAND_RADIUS_Y - 1; dy <= ISLAND_RADIUS_Y + 1; dy += 1) {
    for (let dx = -ISLAND_RADIUS_X - 1; dx <= ISLAND_RADIUS_X + 1; dx += 1) {
      const x = centre.x + dx;
      const y = centre.y + dy;
      const tile = world.tiles[y]?.[x];
      if (!tile || tile.biome !== 'sky_island' || joined.has(`${x},${y}`)) continue;
      // Never the railway. The line is walkable wherever it runs and flooding under it would put
      // water where a player is standing, which is the one thing this layer must not do.
      if (tile.track === true) continue;
      tile.biome = 'sky_water';
    }
  }
}

/**
 * How far the rock face hangs below the island, in rows.
 *
 * Two, plus a row of raggedness. Enough to read as a wall of columns rather than a lip, and about
 * what the reference shows -- the face is roughly a fifth as deep as the island is wide.
 */
const SHELF_DEPTH = 4;

/** The least any column hangs, so the island's east and west tips still stand on something. */
const SHELF_MIN = 1;

/**
 * Hang the rock face under the island's lower edge.
 *
 * **Below it, not around it, and that is the whole difference.** The underside used to be a ring
 * stamped just inside the ellipse: the outermost tiles of the island *became* rock, so the grass
 * had a grey moat round it that reads as a crater, and the island lost a tile of walkable top all
 * the way round to a biome that is deliberately not walkable.
 *
 * Looking at a floating island from above and slightly in front -- which is what the reference
 * does and what this camera does -- the grass runs clean to the edge on the far side, and the near
 * side is a wall of rock hanging under the lip. So the face goes on the water *below* the
 * silhouette and the island keeps all of its top.
 *
 * A band below the top and a band above the water, which is the step `cliffAt` reads to draw rock
 * along the joint. See ISLAND_RIM_HEIGHT.
 */
function hangTheShelf(world: World, centre: Point): void {
  const isTop = (x: number, y: number) => world.tiles[y]?.[x]?.biome === 'sky_island';

  for (let dx = -ISLAND_RADIUS_X - 2; dx <= ISLAND_RADIUS_X + 2; dx += 1) {
    const x = centre.x + dx;
    // The lowest row of island top in this column is the lip the face hangs from.
    let lip: number | null = null;
    for (let dy = -ISLAND_RADIUS_Y - 2; dy <= ISLAND_RADIUS_Y + 2; dy += 1) {
      if (isTop(x, centre.y + dy)) lip = centre.y + dy;
    }
    if (lip === null) continue;

    // **Tapered, so the shelf reads as a body hanging under the island rather than a skirt.**
    // A uniform depth is a rectangle with a ragged bottom: the same two rows under the middle of
    // the island as under its far tips, which says the rock is a border rather than a mass. What
    // the reference actually shows is a rounded underside, deepest below the centre and thinning
    // to nothing at the edges -- and that is one cosine away, because the island is already an
    // ellipse and the column's distance from its centre is already known.
    //
    // `SHELF_MIN` keeps a row under the tips. Letting the taper reach zero leaves the island's
    // easternmost and westernmost columns hanging over open water with no rock under them at all,
    // which reads as the grass being cut off with scissors.
    const across = Math.min(1, Math.abs(dx) / (ISLAND_RADIUS_X + 1));
    const rounded = Math.round(SHELF_DEPTH * Math.sqrt(Math.max(0, 1 - across * across)));
    // Ragged by a row, so the bottom of the face is broken rock rather than a ruled line.
    const depth = Math.max(SHELF_MIN, rounded) + (tileHash(world.seed, x, 0, 'shelf') % 2);
    for (let i = 1; i <= depth; i += 1) {
      const tile = world.tiles[lip + i]?.[x];
      // Only over open water. A face that overwrites the next island, or a shore, is not hanging.
      if (!tile || tile.biome !== 'sea') continue;
      tile.biome = 'sky_underside';
      tile.elevation = ISLAND_RIM_HEIGHT;
    }
  }
}

/**
 * Demote any scrap of island top that is not joined to the rest of the island.
 *
 * **The rim is roughened per tile, and a per-tile decision can strand one.** `rough` is a hash on
 * each tile, so the boundary between top and rim is ragged by design -- and where it happens to
 * bulge outward on one tile and inward on its neighbours, that tile is island top completely ringed
 * by rim. The rim is unwalkable, so the tile is a one-square island floating beside a real one:
 * `reachableFrom` counts it as ground it cannot reach, and `landform.test.ts` reports the map as
 * cut in two.
 *
 * Two of them on the first portrait build. Flood the top from the island's own centre and turn
 * whatever the flood does not reach into rim, which is what a scrap of ground at the edge of a
 * floating shelf is anyway.
 */
function firmUp(world: World, centre: Point): void {
  const isTop = (x: number, y: number) => world.tiles[y]?.[x]?.biome === 'sky_island';
  if (!isTop(centre.x, centre.y)) return;

  const joined = new Set<string>([`${centre.x},${centre.y}`]);
  const queue: Point[] = [centre];
  while (queue.length > 0) {
    const at = queue.shift()!;
    for (const next of [
      { x: at.x - 1, y: at.y },
      { x: at.x + 1, y: at.y },
      { x: at.x, y: at.y - 1 },
      { x: at.x, y: at.y + 1 }
    ]) {
      const key = `${next.x},${next.y}`;
      if (joined.has(key) || !isTop(next.x, next.y)) continue;
      joined.add(key);
      queue.push(next);
    }
  }

  // Only this island's own neighbourhood: another island's top is not this one's business.
  for (let dy = -ISLAND_RADIUS_Y - 1; dy <= ISLAND_RADIUS_Y + 1; dy += 1) {
    for (let dx = -ISLAND_RADIUS_X - 1; dx <= ISLAND_RADIUS_X + 1; dx += 1) {
      const x = centre.x + dx;
      const y = centre.y + dy;
      const tile = world.tiles[y]?.[x];
      if (!tile || tile.biome !== 'sky_island' || joined.has(`${x},${y}`)) continue;
      tile.biome = 'sky_underside';
      tile.elevation = ISLAND_RIM_HEIGHT;
    }
  }
}

/**
 * How wide the line is, in tiles either side of its centre. Zero -- one railway.
 *
 * **It was one *either side*, and that drew three railways.** The reasoning was about walking: the
 * rail was the only way across, so it was three tiles wide to save a player threading a needle at
 * a tile's precision. But `planTrack` draws a full set of rails on every tile carrying the flag,
 * so a three-tile causeway is three parallel tracks running side by side up the middle of the sea
 * -- which is what the screenshot showed, and is nothing like a railway.
 *
 * The premise is gone in any case. The ropes are what a person climbs; the rail is what the
 * carriage runs on, and a carriage runs on one line.
 */
const LINE_HALF_WIDTH = 0;

/**
 * How wide a rope is, either side of centre. Zero -- one tile.
 *
 * A rope ladder is a rope ladder. Three tiles across would be a bridge, and the reason the rail is
 * three is that a player should not have to thread a needle along the part they walk the length
 * of. The rope is short: a handful of tiles between the beach and the rim.
 */
const ROPE_HALF_WIDTH = 0;

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
  if (islands.length < 2) return;

  // One column through both islands, so the line is straight and the islands are its piers.
  const x = Math.round(islands.reduce((sum, i) => sum + i.x, 0) / islands.length);
  const order = [...islands].sort((a, b) => a.y - b.y);
  const north = order[0]!;
  const south = order[order.length - 1]!;

  const lay = (from: number, to: number) => {
    for (let y = Math.max(0, from); y <= Math.min(world.height - 1, to); y += 1) {
      for (let dx = -LINE_HALF_WIDTH; dx <= LINE_HALF_WIDTH; dx += 1) {
        const tile = world.tiles[y]?.[x + dx];
        if (tile) tile.track = true;
      }
    }
  };

  // **The rail runs between the islands and nowhere else.** It used to run shore to shore, which
  // made the islands two beads on a wire rather than the two ends of a railway -- and it is not
  // what the crossing is. The line was built from island to island because the islands are what
  // hold it up; the lodestone is in them. There was never any reason to lay iron over water that
  // has nothing under it.
  lay(north.y, south.y);

  // **And ropes do the rest.** How a person gets *onto* an island is a different question from
  // how the carriage crosses between them, and it always was -- the shore ends of the old line
  // are hanging cable and rope ladder now, which is why the few who come here climb rather than
  // ride. It is also the only honest way a shore that is not floating can meet one that is.
  //
  // Marked with the same `Tile.track` flag: both are the line, both are walkable, and both are
  // laid over ground that keeps being whatever it was. Which of the two a tile *is* is not stored
  // -- `railSpan` derives it from where the islands are, so nothing has to be kept in step.
  // Each rope reports where it made land, and from there a stub of the old line runs inland.
  //
  // **The iron does reach the shore -- it just does not cross.** Canon's arrival text is explicit:
  // "there is a rail-head, a shed, and a line of iron running out over the strait". A rail-head is
  // precisely a place where a line stops, and this is that line: a few tiles of derelict track
  // running back off the beach, which is what the Rail-Head stands on and what the forest has been
  // taking back. `planTrack` reads the ground under a tile to decide whether a stretch is kept or
  // overgrown, so these come out reclaimed and the crossing itself comes out sound, with nothing
  // stored to say which is which.
  for (const [from, step] of [[north.y, -1], [south.y, 1]] as const) {
    const landed = ropeToTheShore(world, x, from, step);
    if (landed !== null) derelictApproach(world, x, landed, step);
  }
}

/**
 * How far the abandoned line runs back from the water, in tiles.
 *
 * Enough to read as a stretch of track rather than a sleeper, short enough that it is plainly a
 * stub. The rail-head is where it stops.
 *
 * Raised from eight when the line narrowed to a single tile. It was eight *rows* of three-tile
 * causeway -- twenty-four tiles of derelict track -- and one tile wide it came out at nine, which
 * is a sleeper again. The length on the ground is what reads, not the row count.
 */
const APPROACH = 14;

/** The old line running inland from where the rope came ashore. */
function derelictApproach(world: World, x: number, from: number, step: -1 | 1): void {
  for (let i = 1; i <= APPROACH; i += 1) {
    const y = from + step * i;
    for (let dx = -LINE_HALF_WIDTH; dx <= LINE_HALF_WIDTH; dx += 1) {
      const tile = world.tiles[y]?.[x + dx];
      // Only over ground. A derelict line does not continue into the sea.
      if (!tile || tile.biome === 'sea' || tile.biome === 'sky_underside') continue;
      tile.track = true;
    }
  }
}

/**
 * A rope from an island's rim down to the nearest ground, in one direction.
 *
 * Stops on the first tile that has something under it, because that is what the rope is reaching
 * for. A rope that carried on past the beach would be the same fault the rail had.
 */
function ropeToTheShore(world: World, x: number, from: number, step: -1 | 1): number | null {
  const solid = (y: number): boolean => {
    const biome = world.tiles[y]?.[x]?.biome;
    return biome !== undefined && biome !== 'sea' && biome !== 'sky_underside';
  };

  for (let y = from; y >= 0 && y < world.height; y += step) {
    for (let dx = -ROPE_HALF_WIDTH; dx <= ROPE_HALF_WIDTH; dx += 1) {
      const tile = world.tiles[y]?.[x + dx];
      if (tile) tile.track = true;
    }
    // Land, and not the island we started from: the rope has arrived.
    if (solid(y) && Math.abs(y - from) > ISLAND_RADIUS_Y) return y;
  }
  return null;
}

/**
 * The stretch of line the carriage runs on: island to island, and nothing beyond.
 *
 * **Derived rather than stored, so rail and rope cannot drift apart.** Both are `Tile.track` --
 * both are walkable, both are drawn from the same flag -- and the only thing that separates them
 * is where the islands are, which the world already says. A second flag would be a second thing
 * to keep true.
 *
 * Returns null on a map with fewer than two islands, which is every map but this one.
 */
export function railSpan(world: World): { from: number; to: number } | null {
  const rows = world.tiles
    .flat()
    .filter((t) => t.biome === 'sky_island' || t.biome === 'sky_underside')
    .map((t) => t.y);
  if (rows.length === 0) return null;

  const sorted = [...new Set(rows)].sort((a, b) => a - b);
  const runs: number[][] = [];
  let run = [sorted[0]!];
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i]! - sorted[i - 1]! > 1) {
      runs.push(run);
      run = [];
    }
    run.push(sorted[i]!);
  }
  runs.push(run);
  if (runs.length < 2) return null;

  // From the middle of the northern island to the middle of the southern one, so the rail reaches
  // the platform on each rather than stopping at the cliff edge.
  const first = runs[0]!;
  const last = runs[runs.length - 1]!;
  return {
    from: Math.round((first[0]! + first[first.length - 1]!) / 2),
    to: Math.round((last[0]! + last[last.length - 1]!) / 2)
  };
}

/**
 * Where the line meets each shore: the seaward end of the derelict approach.
 *
 * **This is the rail-head, and it is not the same as "the last track tile on land".** Going south,
 * the track on land runs from the beach several tiles inland, and the *inland* end is where the
 * ground has climbed into the Aravali range -- so anchoring The Rail-Head to it put a place that
 * canon says `stands: low` on band-2 mountains. The rail-head is the buffers at the water's edge.
 */
export function shoreheads(world: World): { near: Point | null; far: Point | null } {
  const span = railSpan(world);
  if (span === null) return { near: null, far: null };

  const onLand = world.tiles.flat().filter((t) => {
    if (!t.track) return false;
    return t.biome !== 'sea' && t.biome !== 'sky_underside' && t.biome !== 'sky_island';
  });

  const north = onLand.filter((t) => t.y < span.from);
  const south = onLand.filter((t) => t.y > span.to);
  // Seaward end of each: the highest row in the north, the lowest in the south.
  const pick = (group: typeof onLand, seaward: (a: number, b: number) => number) =>
    group.length === 0
      ? null
      : group.reduce((best, t) => (seaward(t.y, best.y) === t.y ? t : best), group[0]!);

  return {
    far: pick(north, (a, b) => Math.max(a, b)),
    near: pick(south, (a, b) => Math.min(a, b))
  };
}

/** Whether the line at this row is the carriage's own: island to island, and nothing beyond. */
export function isRail(world: World, y: number): boolean {
  const span = railSpan(world);
  return span !== null && y >= span.from && y <= span.to;
}

/**
 * How far a rope reaches onto solid ground at each end, in tiles.
 *
 * Two. A rope has to *land* -- a span that stops exactly where the ground starts reads as ending in
 * mid-air, and the anchor is the couple of tiles of ladder lying on the beach and over the island's
 * rim that say it is tied to something. More than two and the ladder is walking inland, which is
 * the fault this whole function exists to fix.
 */
const ROPE_ANCHOR = 2;

/**
 * Whether this stretch of the line is a hanging rope rather than iron.
 *
 * **Asked of the tile, not of the row, and that is the whole correction.** The drawing used to ask
 * `isRail` alone: rail inside the span, rope everywhere else. But "everywhere else" is not rope --
 * most of it is the *derelict approach*, the stub of old iron `derelictApproach` lays back off each
 * beach, which canon calls a rail-head and which The Rail-Head stands on. Fourteen tiles of it at
 * each end were being drawn as rope ladder lying across plains and forest, out to the edge of the
 * map, so the crossing read as one continuous ladder down the whole column and the actual span over
 * the water was indistinguishable from the fields either side of it.
 *
 * A rope is where there is nothing underneath: open water, or the air beneath an island. Everything
 * else on the line is iron -- kept between the islands, derelict on the approaches, which
 * `planTrack` already tells apart by reading the ground.
 *
 * **The carriage's own stretch is iron even over water**, which is why `railSpan` is checked first.
 * The line between the islands crosses the open strait on the lodestone that holds the islands up;
 * that it has nothing under it is the point, not a reason to draw a ladder there.
 */
export function isRope(world: World, x: number, y: number): boolean {
  if (isRail(world, y)) return false;

  // Nothing under it but air or water -- the flag is the only reason a walker can be here.
  const overTheVoid = (at: number): boolean => {
    const tile = world.tiles[at]?.[x];
    return tile !== undefined && !isWalkable({ biome: tile.biome, track: false });
  };

  if (overTheVoid(y)) return true;
  for (let reach = 1; reach <= ROPE_ANCHOR; reach += 1) {
    if (overTheVoid(y - reach) || overTheVoid(y + reach)) return true;
  }
  return false;
}




/**
 * Put the traveller on the southern shore, **at the line**.
 *
 * Two faults, found one after the other, and the second only visible on screen.
 *
 * It was `startOnTheNearShore` and searched the *north* -- a name describing the thing it did not
 * do. It passed every test because they asked whether the start was on land, which it was, and
 * none asked which side of the water it was on.
 *
 * Pointing it south fixed the shore and left the second fault untouched: it looked for the tile
 * nearest **the generator's original start**, which was in the north-east, so it landed on the
 * south-*east* corner -- 22 tiles from the rail and 8 from the settlement. A player opened the map
 * on an unremarkable stretch of coast with no line, no buildings and nothing to walk toward. The
 * map is a crossing and the crossing was off screen.
 *
 * So the anchor is the line itself. Jambhudweepa is home, the far bank is "a green smudge that is
 * not Jambhudweepa", and the first thing a player should see is the thing they are meant to cross.
 */
export function startOnTheSouthernShore(world: World): void {
  const strait = Math.floor(world.height * (STRAIT_AT + STRAIT));
  const walkable = (x: number, y: number): boolean => {
    const tile = world.tiles[y]?.[x];
    return !!tile && tile.biome !== 'sea' && tile.biome !== 'sky_underside';
  };

  // The line's own column, which is where the rail-head is. `stampLine` runs it down the middle of
  // the islands, so this is the same column the carriage will one day sit on.
  const tracked = world.tiles.flat().filter((t) => t.track);
  if (tracked.length === 0) return;
  const column = Math.round(tracked.reduce((sum, t) => sum + t.x, 0) / tracked.length);

  // The first walkable ground south of the strait, on that column or as near to it as the shore
  // allows. Walking outward in rings keeps it beside the line rather than merely below it.
  for (let y = strait + 2; y < world.height; y += 1) {
    for (let spread = 0; spread < world.width; spread += 1) {
      for (const x of [column - spread, column + spread]) {
        if (!walkable(x, y)) continue;
        // Never on the rail itself: a player standing on the line cannot see it.
        if (world.tiles[y]?.[x]?.track) continue;
        world.start = { x, y };
        return;
      }
    }
  }
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

  // **The route is the rail, and the rail is between the islands.** It used to be the whole run
  // of the flag trimmed back to the outermost ground, which was right while the line went shore
  // to shore and is wrong now: the shore ends are rope ladders, and a carriage does not run on a
  // rope. `railSpan` is the one place that boundary is decided, so this and the drawing agree.
  const span = railSpan(world);
  if (span === null) return [];

  return down.filter((t) => t.y >= span.from && t.y <= span.to).map((t) => ({ x: t.x, y: t.y }));
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
  if (tile.biome === 'sea' || tile.biome === 'sky_underside') return false;
  // **On the rail, not on a rope.** Standing where the ladder meets the beach is standing at the
  // bottom of a ladder; the carriage is up on the line, and the line starts at an island.
  return isRail(world, at.y);
}
