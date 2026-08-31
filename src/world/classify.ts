// Turning three scalars into a biome.
//
// Thresholds are named constants rather than inline numbers because they are the contract between
// `field.ts` and the bestiary: if the elevation field stops spanning 0–1, HILLS and MOUNTAINS stop
// being reachable and a third of the creatures quietly vanish from the game. `test/generator.test.ts`
// asserts against these, so a retune that starves a biome fails the build instead of the playtest.

import type { BiomeId, TerrainBiomeId } from './types';

export const THRESHOLDS = {
  /** Below this is open water. */
  SEA: 0.3,
  /** Between SEA and this is beach. */
  COAST: 0.36,
  /** Above this is rolling upland. */
  HILLS: 0.66,
  /** Above this is peaks. Rivers are sourced here and in hills. */
  MOUNTAINS: 0.82,
  /** Standing water and reeds. */
  WETLAND_MOISTURE: 0.68,
  /** Closed canopy. */
  FOREST_MOISTURE: 0.5,
  /** Desert needs both halves: hot *and* dry. */
  DESERT_TEMPERATURE: 0.66,
  DESERT_MOISTURE: 0.32
} as const;

/**
 * Which height terrace a tile sits on: 0 lowland, 1 upland, 2 peaks.
 *
 * **No new data.** `Tile.elevation` has always been there and `classifyBiome` below has always read
 * these same two constants -- `HILLS` and `MOUNTAINS` are terraces already, and have been since the
 * generator was written. Naming them as bands is the whole of the height model, which is why the
 * cliff work needs nothing added to the world.
 *
 * Two steps rather than a continuous height, deliberately. A cliff is drawn where neighbouring
 * bands differ, so the number of bands is the number of distinct ledges a map can show; three is
 * what the existing thresholds already carve out, and inventing more would mean inventing terrain
 * the generator does not produce.
 */
export function band(elevation: number): 0 | 1 | 2 {
  if (elevation > THRESHOLDS.MOUNTAINS) return 2;
  if (elevation > THRESHOLDS.HILLS) return 1;
  return 0;
}

/**
 * The ground a map is allowed to be made of, as thresholds over the permitted biomes only.
 *
 * **This is what replaced generating a continent and then remapping it.** The old shape was:
 * classify every tile against fixed thresholds, then walk the finished map substituting anything
 * the field map's palette did not contain, through a hand-written table of fallbacks called
 * `BECOMES`. That table was the weakest thing in the generator and the direct cause of at least
 * three faults.
 *
 * It was global, but its *effect* was per-map — the row for `sea` was dead on Lothal, which has a
 * sea, and live on Dwarka and Narmada, which do not — so tuning a fallback for one map silently
 * re-terrained the others. That is the whole answer to "why does changing one map affect the
 * others". It is also why the Narmada came out 55.8% river the moment canon gave that map the
 * river it should always have had: with no shoreline in its palette, every sea tile the generator
 * insisted on making fell through the table to `river`.
 *
 * The standard answer is the one Minecraft's multi-noise biome source uses: a region declares
 * which ground it is made of, and the generator never produces anything else. Nothing needs
 * substituting because nothing wrong is ever generated.
 *
 * **An absent biome's range is absorbed by its neighbour on the same axis**, which falls out of
 * the representation rather than being coded: the axes below are lists of *upper bounds*, so
 * dropping an entry hands its span to whatever now sits above it. That is also the behaviour you
 * want, because a biome's span means something positional — `sea` is the low end of elevation,
 * `wetland` the wet end of moisture. A plateau with no shoreline should be low ground all the way
 * out to its rim, which is exactly what dropping `sea` and `coast` produces.
 */
export interface TerrainPalette {
  /** Elevation bands, low to high. Each owns everything below `upTo` that no earlier band claimed. */
  readonly bands: readonly ElevationBand[];
  /** Moisture steps for lowland ground, wet to dry. */
  readonly damp: readonly MoistureStep[];
  /** What lowland ground is when no moisture step claims it. */
  readonly ground: TerrainBiomeId;
  /** Whether hot, dry lowland may become desert. */
  readonly desert: boolean;
  /**
   * The bottom of the lowest band this palette keeps, which the map's elevation is rescaled into.
   *
   * **Filtering the bands alone is not enough, and measuring showed why.** Dropping `sea` and
   * `coast` from the Narmada handed their whole span -- everything below 0.36, which is 54% of
   * that map's tiles -- to lowland ground. The palette was obeyed exactly and the result was a
   * plateau with 69.5% plains and 2.5% hills: no relief at all, on the one map whose entire thesis
   * is that it is high ground.
   *
   * Dividing the range among the permitted biomes has to mean *the whole range*. So elevation is
   * rescaled to start at this floor, and a map with no shoreline spends its full elevation budget
   * on the ground it does have rather than piling half its tiles below the first threshold. This
   * is the same correction the river carver already needed: an absolute cut cannot mean the same
   * thing on two differently-shaped maps.
   */
  readonly floor: number;
}

/** `ground` is decided by moisture rather than height, so it stands in on the height axis. */
type BandOwner = TerrainBiomeId | 'ground';
interface ElevationBand {
  readonly owner: BandOwner;
  readonly upTo: number;
}

/** `dry` is "not wet enough for anything above it", resolved against `ground` and `desert`. */
type DampOwner = TerrainBiomeId | 'dry';
interface MoistureStep {
  readonly owner: DampOwner;
  readonly above: number;
}

const ELEVATION_ORDER: readonly ElevationBand[] = [
  { owner: 'sea', upTo: THRESHOLDS.SEA },
  { owner: 'coast', upTo: THRESHOLDS.COAST },
  { owner: 'ground', upTo: THRESHOLDS.HILLS },
  { owner: 'hills', upTo: THRESHOLDS.MOUNTAINS },
  { owner: 'mountains', upTo: Infinity }
];

const MOISTURE_ORDER: readonly MoistureStep[] = [
  { owner: 'wetland', above: THRESHOLDS.WETLAND_MOISTURE },
  { owner: 'forest', above: THRESHOLDS.FOREST_MOISTURE },
  { owner: 'dry', above: -Infinity }
];

/** Lowland ground, in the order a map would rather fall back on it. */
const GROUND_PREFERENCE: readonly TerrainBiomeId[] = ['plains', 'forest', 'wetland', 'desert', 'coast'];

const ALL_TERRAIN: readonly TerrainBiomeId[] = [
  'sea',
  'coast',
  'plains',
  'forest',
  'wetland',
  'hills',
  'mountains',
  'desert'
];

/**
 * Build the thresholds for one map's palette. Cheap, and done once per generated world.
 *
 * `allowed` is the field map's `seed_biomes`. Anything in it that is not terrain is ignored:
 * `river`, `settlement` and `landmark` are stamped onto the finished ground rather than
 * classified, so they have no span on either axis.
 */
export function terrainPaletteFor(allowed: Iterable<BiomeId>): TerrainPalette {
  const set = new Set<string>(allowed);
  const groundOptions = GROUND_PREFERENCE.filter((biome) => set.has(biome));

  // Filtering is the whole of the collapse. The lists are upper bounds, so a dropped entry's span
  // simply belongs to the next one that survives.
  const bands = ELEVATION_ORDER.filter((band) =>
    band.owner === 'ground' ? groundOptions.length > 0 : set.has(band.owner)
  );
  const damp = MOISTURE_ORDER.filter((step) => step.owner === 'dry' || set.has(step.owner));

  // Whatever ends up highest has to claim the ceiling, or a peak on a map with no mountains
  // would match no band at all.
  const topped: ElevationBand[] =
    bands.length > 0
      ? [...bands.slice(0, -1), { ...bands[bands.length - 1]!, upTo: Infinity }]
      : [{ owner: 'ground', upTo: Infinity }];

  // The floor applies only when *nothing below lowland survives* -- no sea and no shore.
  //
  // The distinction is the difference between absorbing a span and vacating it. If a map keeps a
  // shore, that shore is the natural owner of the water below it and simply widens: Dwarka is a
  // dead harbour, and its `coast` standing where the sea used to be is exactly the old waterline
  // canon asks for. Lifting there instead squeezed coast to 1.6% of the map and left the seawalls
  // standing on nothing.
  //
  // If a map keeps neither, there is no owner for the bottom of the range and lowland ground
  // would otherwise swallow it whole -- which is what left the Narmada at 69.5% plains and 2.5%
  // hills, a plateau with no relief at all. That map has no water, so its terrain is lifted into
  // the span it actually uses.
  const seaLevelSurvives = set.has('sea') || set.has('coast');
  let floor = 0;
  if (!seaLevelSurvives) {
    for (const band of ELEVATION_ORDER) {
      if (band.owner === 'ground') break;
      floor = band.upTo;
    }
  }

  return {
    bands: topped,
    damp,
    // A palette naming no lowland at all leaves nothing to stand on; plains is the honest default.
    ground: groundOptions[0] ?? 'plains',
    desert: set.has('desert'),
    floor: Number.isFinite(floor) ? floor : 0
  };
}

/**
 * Lift a normalised elevation into the span its palette actually uses.
 *
 * Applied where the tile is written rather than inside `classifyBiome`, so that
 * `Tile.elevation`, the biome, and `band()` all agree. Cliffs are drawn where neighbouring bands
 * differ, so a biome computed from one elevation and a terrace from another would put rock faces
 * in places with no change of ground.
 */
export function liftElevation(elevation: number, palette: TerrainPalette): number {
  return palette.floor + elevation * (1 - palette.floor);
}

/** Every terrain biome, which is what a caller that does not constrain anything gets. */
const EVERYTHING: TerrainPalette = terrainPaletteFor(ALL_TERRAIN);

/**
 * Which biome a tile is, within the ground its map is allowed to be made of.
 *
 * Called without a palette it behaves exactly as it always did — every biome permitted — so a
 * standalone `generateWorld` and every test written against the original thresholds still hold.
 */
export function classifyBiome(
  elevation: number,
  moisture: number,
  temperature: number,
  palette: TerrainPalette = EVERYTHING
): TerrainBiomeId {
  for (const band of palette.bands) {
    if (elevation >= band.upTo) continue;
    return band.owner === 'ground' ? lowland(moisture, temperature, palette) : band.owner;
  }
  return lowland(moisture, temperature, palette);
}

function lowland(moisture: number, temperature: number, palette: TerrainPalette): TerrainBiomeId {
  for (const step of palette.damp) {
    if (moisture <= step.above) continue;
    if (step.owner !== 'dry') return step.owner;
    // Desert is the one biome that needs two axes: hot *and* dry, or it is ordinary ground.
    if (
      palette.desert &&
      temperature > THRESHOLDS.DESERT_TEMPERATURE &&
      moisture < THRESHOLDS.DESERT_MOISTURE
    ) {
      return 'desert';
    }
    return palette.ground;
  }
  return palette.ground;
}
