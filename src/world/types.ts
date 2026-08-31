// Shapes shared by the generator, the content layer, and the Phaser scenes.
//
// This module imports nothing. Everything downstream of it — including the scenes — depends on
// these types rather than on each other, which is what keeps `world/` and `content/` free of
// Phaser and React.

/** Every biome id that can appear on a tile. Must stay in step with `data/biomes.json`. */
export type BiomeId =
  | 'sea'
  | 'coast'
  | 'plains'
  | 'forest'
  | 'wetland'
  | 'hills'
  | 'mountains'
  | 'desert'
  | 'river'
  | 'settlement'
  | 'landmark'
  // Ground canon has always named and the terrain sheet has no drawing for. They are here rather
  // than absent because `placeholderTileKey` can now draw any biome from its own colour and
  // symbol, so "the art has not been made yet" no longer has to mean "the engine cannot say the
  // word". Whether a map may *use* one is canon's `renderable` flag, not this union.
  | 'lava_field'
  | 'sky_island'
  | 'sky_underside'
  | 'open_sky'
  | 'underworld';

/** Biomes the generator classifies terrain into, before features are stamped on top. */
export type TerrainBiomeId = Exclude<BiomeId, 'river' | 'settlement' | 'landmark'>;

export interface Point {
  x: number;
  y: number;
}

export interface Tile extends Point {
  /** 0–1 after normalisation. Sea level and the highland thresholds are read off this. */
  elevation: number;
  /** 0–1. Drives forest vs. plains vs. wetland. */
  moisture: number;
  /** 0–1, warmer toward the south of the grid. Gates desert. */
  temperature: number;
  biome: BiomeId;
  /** Small per-tile jitter so rivers meander instead of running straight downhill. */
  riverBias: number;
}

export interface NamedPlace extends Point {
  name: string;
}

/**
 * Ground a landmark can stand on.
 *
 * `TerrainBiomeId` alone is wrong here: a heron pool belongs on a river, and the generator does
 * place landmarks there, so the type has to admit it. Settlement and sea it never uses.
 */
export type LandmarkTerrain = TerrainBiomeId | 'river';

export interface Landmark extends NamedPlace {
  /**
   * What the tile was before it became the landmark.
   *
   * The content layer picks which *kind* of landmark this is from the terrain — a shell beach
   * belongs on a coast, a heron pool in a marsh. Keeping the terrain here rather than the kind is
   * what lets `world/` stay free of `data/*.json`: the generator says "something worth seeing
   * stands here, on forest", and `content/landmarks.ts` decides it is a great banyan.
   */
  terrain: LandmarkTerrain;
}

export interface River {
  path: Point[];
  name: string;
}

export interface World {
  seed: string;
  width: number;
  height: number;
  /** Row-major: `tiles[y][x]`. */
  tiles: Tile[][];
  start: Point;
  /** The village the journey starts from. Null only if no suitable ground existed. */
  settlement: NamedPlace | null;
  landmark: Landmark;
  /** Every river the carver cut, in carve order, named from its source. */
  rivers: River[];
}

export interface GenerateOptions {
  seed?: string;
  width?: number;
  height?: number;
  /**
   * The landform canon declares for this map, if any.
   *
   * Optional so `generateWorld` still works standalone — the procedural walk that predates field
   * maps has no canon behind it and gets `basin`, which is the neutral bowl.
   */
  relief?: string | null;
  /**
   * The ground this map is allowed to be made of.
   *
   * Optional, and absent means "anything" — the procedural walk that predates field maps has no
   * canon palette behind it. When present the generator classifies against these biomes only, so
   * nothing is produced that would have to be substituted afterwards. Non-terrain entries
   * (`river`, `settlement`, `landmark`) are ignored: those are stamped onto finished ground.
   */
  palette?: readonly BiomeId[] | null;
}

/** One entry of `data/biomes.json`. */
export interface Biome {
  id: BiomeId;
  name: string;
  walkable: boolean;
  travelCost: number | null;
  tone: string;
  color: string;
  symbol: string;
  description: string;
  regions: string[];
}

/** Where a species can show up. `lore` species are written about but never placed in play. */
export type Placement = 'encounter' | 'flavour' | 'lore';

export type Rarity = 'common' | 'rare' | 'mythic';

interface SpeciesBase {
  id: string;
  name: string;
  /** Null for the prototype starters, which predate the bestiary and have no binomial. */
  binomial: string | null;
  region: string;
  biomes: BiomeId[];
  placement: Placement;
  rarity: Rarity;
  journalPrompt: string;
}

/**
 * What kind of animal this is, straight from canon.
 *
 * Not derived here. The game used to work this out by matching keywords against names and
 * binomials, and got it wrong six times in a way anybody could see: an Asura-tainted owl drawn as
 * a ghost, a baby crocodile as a mammal, a feathered dinosaurid as a cricket, and three mongooses
 * as the crabs and centipedes they are named after. Canon states it now, for all 256.
 */
export type Clade =
  | 'mammal'
  | 'synapsid'
  | 'bird'
  | 'dinosaur'
  | 'crocodilian'
  | 'reptile'
  | 'amphibian'
  | 'fish'
  | 'insect'
  | 'arachnid'
  | 'crustacean'
  | 'mollusc'
  | 'cnidarian'
  | 'worm'
  | 'construct'
  | 'spectre';

/**
 * What shape a plant takes, straight from canon.
 *
 * Same story, worse numbers: derived from names, this was wrong on **13 of 90**. `gourd` sat in
 * the cactus keywords, `lichen` in moss, and `coral` and `kelp` in seaweed — which caught the two
 * corals and both *Zostera* seagrasses, marine flowering plants that are not algae at all.
 *
 * `coral` and `lichen` have no counterpart in the old vocabulary, because the old vocabulary could
 * not say them.
 */
export type GrowthForm =
  | 'tree'
  | 'palm'
  | 'shrub'
  | 'vine'
  | 'flower'
  | 'grass'
  | 'root'
  | 'fern'
  | 'moss'
  | 'lichen'
  | 'cactus'
  | 'seaweed'
  | 'coral'
  | 'pitcher';

/** One entry of `data/creatures.json`. Exported from canon — see `data/canon.lock.json`. */
export interface Creature extends SpeciesBase {
  mood: string;
  clade: Clade;
}

/** One entry of `data/flora.json`. Exported from canon — see `data/canon.lock.json`. */
export interface Flora extends SpeciesBase {
  growthForm: GrowthForm;
}
