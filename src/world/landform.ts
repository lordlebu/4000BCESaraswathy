// What shape a field map is.
//
// One rule cannot produce a harbour, an island and a plateau, and trying made every map a dome:
// `shapeElevation` raised ground toward the centre, which is right for a continent and wrong for
// one corner of one. High ground classifies as hills and forest at travel cost 2, so the average
// cost of a tile climbed from 1.15 at the rim to 1.98 in the middle -- the walking was hardest
// exactly where the walking happens.
//
// Canon says which landform each map is; this decides what that means to the generator. Pure, and
// separate from `generate.ts`, because the shape of a map is arithmetic and arithmetic belongs in
// a test rather than in a screenshot.

/** The landforms canon can declare. Mirrors the `relief` enum in `field_map.schema.json`. */
export type Relief = 'delta' | 'island' | 'plateau' | 'basin';

/**
 * How a landform bends elevation and moisture at one point.
 *
 * Both are additive offsets applied before normalisation, so a shaper says "raise this" or "wet
 * this" without needing to know the range the noise happens to occupy.
 */
export interface Shaping {
  elevation: number;
  moisture: number;
}

/** Where a tile sits, in units that do not depend on how big the map is. */
export interface Place {
  /** 0 at any edge, 1 at the furthest-from-edge point. */
  edgeDistance: number;
  /** 0 at the western edge, 1 at the eastern. */
  west: number;
  /** 0 at the top, 1 at the bottom. */
  north: number;
}

/** Smooth 0..1 ramp. Sharper than linear at the ends, which keeps a shoreline from smearing. */
function ramp(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

/**
 * The shapers, and the two rules they all obey.
 *
 * **One: raise the interior, never lower the rim.** Both look equivalent -- the difference is a
 * constant and `normalize` runs afterwards anyway -- but the sea threshold is a fixed fraction of
 * the normalised range, so subtracting at the rim drags the distribution under water. Measured:
 * the original generator gave 63-86% land across twenty procedural seeds; shapers that subtracted
 * gave 27-75% and put three seeds through the 35% floor `generator.test.ts` guards.
 *
 * **Two: an easy middle means mid elevation and LOW moisture.** This is the one that is easy to
 * get backwards, and I did. Reading the classifier in order, the only window that yields `plains`
 * -- the sole cheap non-coastal biome -- is elevation between 0.36 and 0.66 *with* moisture under
 * 0.50. Everything wetter is wetland or forest, both travel cost 2; everything higher is hills or
 * mountains, cost 2 and 3. So raising moisture toward the middle of a map, which is the intuitive
 * way to make a delta feel like a delta, makes the middle *more* expensive rather than less.
 *
 * The wet character of a delta therefore belongs at its edges and in its channels, not in its
 * interior. The channels come from `routes.ts`, which eases wetland into river along the lines
 * between the places -- and river is cost 1, which is what makes following the water fast.
 */

/**
 * A delta: low, wet at the margins, with drier ground between the channels.
 *
 * The rim falls to sea because a harbour needs water. The interior lifts into the plains window
 * and dries out, so the ground between the channels is walkable -- which is what a delta's levees
 * and islands actually are. Adding `plains` to the palette was tried first and produced the
 * numbers by destroying the place: 53% of the map became plains, because `plains` is the
 * classifier's *fallback*. Shaping into the window is not the same as declaring the biome.
 */
function delta(at: Place): Shaping {
  const inland = ramp(at.edgeDistance * 2.6);
  return {
    elevation: inland * 0.26 - shore(at) * 0.3,
    // Damp at the margin where the sea reaches, drying inland toward the levees.
    moisture: 0.2 - inland * 0.05
  };
}

/**
 * An island: sea on every side, land in the middle.
 *
 * A wider, deeper shore than a delta's, and it does not care which edge -- that is the difference
 * between "half of this city is underwater" and "this river meets the sea here".
 *
 * **The two shores are not the same country, and canon says so in the arrival text.** Near side:
 * "the ranges come down to the water in steps of grey stone, and stop". Far side: "a green smudge
 * that is not Jambhudweepa". One is the Aravali coming down to the sea and the other is somewhere
 * else, and drawing both as the same damp green coast threw that away -- along with the hills The
 * Quiet Atelier hides in and the high stone The Kept Stones stand on.
 *
 * So elevation is tilted south and moisture north. The south rises into hills and mountains with
 * the range in it; the north stays low, wet and wooded. It costs one term each and it is the
 * difference between a crossing that goes somewhere and a crossing between two of the same place.
 */
function island(at: Place): Shaping {
  const inland = ramp(at.edgeDistance * 3.0);
  // 0 in the north, 1 in the south. `north` runs 0 at the top edge to 1 at the bottom.
  const southward = at.north;
  const wall = farWall(at);
  return {
    elevation:
      inland * 0.34 +
      // **The far rim climbs instead of drowning.** See `farWall`: the shore drop is cancelled as
      // the wall takes over, so the two do not fight over the same rows.
      -shore(at) * 0.42 * (1 - wall) +
      (southward - 0.5) * 0.55 +
      wall * FAR_WALL_LIFT,
    moisture: 0.14 - inland * 0.1 + (0.5 - southward) * 0.22
  };
}

/**
 * How deep the far shore's high ground runs, and how high it stands.
 *
 * **Two faults, and they turn out to be the same one.** The tilt above is what makes the two banks
 * different countries, and it works by pushing the north down -- but canon puts The Kept Stones
 * over there and says it `stands: high`. Measured at 44 x 66: **one** tile of band-1 ground in 478
 * of far-shore land, and the placement test passed because the place was standing on that one
 * tile. Grow the map and it goes -- at 52 x 78 the far shore has no band-1 ground at all, the
 * fallback runs out of candidates, and the stones land on a beach in the map's corner. The size
 * did not cause that; it revealed it.
 *
 * The second is what the far rim looked like: `shore` drops every edge of the map to water, so
 * above the far shore's forest sat a band of open sea running off the top of the screen -- a strip
 * of nothing at the end of the country the player is walking towards.
 *
 * One term answers both. The far rim **climbs** rather than falls: the ground runs off the top of
 * the map as high stone, which is what the near shore already does with the Aravali range and what
 * canon's own arrival text describes on this side -- "a green smudge", seen from across a strait,
 * is a coastline with something behind it. The shore drop is faded out as the wall comes in, so
 * the rim is not asked to be a beach and a mountain at once.
 *
 * **Deep enough to stand on, short of the range in the south.** The lift lands the crest inside
 * band 2 and leaves the water's edge in band 0, which is what the rail-head, the ford and the
 * nomad ground are all written to stand on. Widening it instead of raising it is what closes the
 * gap between the banks, and the gap is the whole reason the tilt is there.
 */
const FAR_WALL_DEPTH = 0.17;
const FAR_WALL_LIFT = 0.88;

/** 1 along the far rim, falling to 0 where the far shore's low ground begins. */
function farWall(at: Place): number {
  return ramp(1 - at.north / FAR_WALL_DEPTH);
}

/**
 * A plateau: flat and walkable on top, severe at the rim.
 *
 * Canon's arrival text is the specification -- "black rock in steps a hundred feet high, holding a
 * flat green country the sea never reached". The lift saturates early and then stops, so the
 * surface sits inside the plains window rather than climbing into hills, and all the relief is in
 * the outer ring where the scarp is.
 *
 * The map was 62% forest and 35% hills at a uniform cost of 2 before landforms -- high country
 * with no flat anything in it, which is not the place canon describes.
 */
function plateau(at: Place): Shaping {
  const onTop = ramp(at.edgeDistance * 4.5);
  return {
    elevation: onTop * 0.28,
    // Green, but not closed canopy: a jungle plateau that is 62% forest is a forest, not a
    // country. The drying is what leaves room for the valleys `routes.ts` carves.
    moisture: 0.04 - onTop * 0.1
  };
}

/**
 * A bowl. What a seabed becomes when it loses its sea, and the safe default.
 *
 * This is what an uncanonised world gets -- the procedural walk that predates field maps has no
 * canon behind it -- so it stays closest to the original shaping.
 */
function basin(at: Place): Shaping {
  const inland = ramp(at.edgeDistance * 3.2);
  return {
    elevation: inland * 0.42,
    moisture: -0.03 - inland * 0.08
  };
}

/**
 * The narrow band at the very edge that becomes water.
 *
 * Squared so the drop is sharp. A wide gradual shore eats the walkable map, and every landform
 * except the plateau wants a coastline rather than a slope.
 */
function shore(at: Place): number {
  return Math.max(0, 1 - at.edgeDistance * 12) ** 2;
}

const SHAPERS: Record<Relief, (at: Place) => Shaping> = {
  delta,
  island,
  plateau,
  basin
};

/** How a landform bends the ground at one point. Unknown reliefs fall back to `basin`. */
export function shapeFor(relief: Relief | null | undefined, at: Place): Shaping {
  return (SHAPERS[relief as Relief] ?? basin)(at);
}

/**
 * Where a tile sits, in the units `shapeFor` wants.
 *
 * `edgeDistance` is divided by the shorter side, not half of it. Halving looks like the obvious
 * normalisation -- the centre of a square really is half a side from the edge -- but it doubles
 * every shaper's reach, and on the default 36x24 procedural map that flooded 70% of the world.
 * The shapers' constants are tuned against this scale, which is the same one the code used before
 * landforms existed.
 */
export function placeOf(x: number, y: number, width: number, height: number): Place {
  const toEdge = Math.min(x, y, width - 1 - x, height - 1 - y);
  return {
    edgeDistance: toEdge / Math.min(width, height),
    west: x / (width - 1),
    north: y / (height - 1)
  };
}
