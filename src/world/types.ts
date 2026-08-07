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

export interface World {
  seed: string;
  width: number;
  height: number;
  /** Row-major: `tiles[y][x]`. */
  tiles: Tile[][];
  start: Point;
  landmark: Point;
  /** Every tile the river carver turned into `river`, in carve order. Used by the tests. */
  rivers: Point[][];
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
