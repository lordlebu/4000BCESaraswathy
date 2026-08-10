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
  | 'landmark';

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

export interface Landmark extends NamedPlace {
  /**
   * What the tile was before it became the landmark.
   *
   * The content layer picks which *kind* of landmark this is from the terrain — a shell beach
   * belongs on a coast, a heron pool in a marsh. Keeping the terrain here rather than the kind is
   * what lets `world/` stay free of `data/*.json`: the generator says "something worth seeing
   * stands here, on forest", and `content/landmarks.ts` decides it is a great banyan.
   */
  terrain: TerrainBiomeId;
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
  binomial: string;
  region: string;
  biomes: BiomeId[];
  placement: Placement;
  rarity: Rarity;
  journalPrompt: string;
}

/** One entry of `data/creatures.json`. Generated — see `tools/build-species-data.js`. */
export interface Creature extends SpeciesBase {
  mood: string;
}

/** One entry of `data/flora.json`. Generated — see `tools/build-species-data.js`. */
export type Flora = SpeciesBase;
