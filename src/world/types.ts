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
  // Caps high ground rather than being a climate of its own -- the generator stamps it as a
  // patch, the way the settlement already is. See docs/art-brief.md, Asset 2d.
  | 'snow'
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
  // Standing water on a floating island, and its own biome rather than `river` with a filter.
  // `data/biomes.json` is the one place a biome's journal line lives, and a pool hanging in the
  // sky is not "a bright river line braiding the land together" -- the alternative is deciding
  // the prose from what a tile's neighbours are, which is a second implementation of the
  // description and will drift. See docs/sky-islands-plan.md.
  | 'sky_water'
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
  /**
   * A railway crosses here.
   *
   * **A flag rather than a biome, because the sea underneath stays sea.** The first attempt turned
   * the crossed tiles into `coast`, which is a causeway -- piled stone at sea level -- and that is
   * not what the Aravali line is. It runs *over* open water on trestles: a boat can pass beneath
   * it, the water is navigable, and the tile is still sea in every way that matters to weather,
   * to what lives there, and to what it looks like.
   *
   * What it changes is only whether a traveller can walk it, which is why `isWalkable` reads this
   * and nothing else does. Overlays like `river` and `settlement` are biomes because they replace
   * the ground; a bridge does not replace the water it spans.
   */
  track?: boolean;
  /**
   * A worn path runs through here.
   *
   * **A flag rather than a biome, for `track`'s reason exactly**: a road does not replace the grass
   * it is worn into. Plains with a path through them are still plains -- to the weather, to what
   * grows there, to what the journal says about the ground -- and the only new fact is that people
   * have walked this way often enough to show.
   *
   * Unlike `track` it changes nothing about walkability. Every tile that carries it was already
   * walkable, because it is a line `findPath` returned.
   *
   * This is the route between the places, kept from `easeRoutes` rather than recomputed. The two
   * are not interchangeable: see `EasedRoutes` in `routes.ts` for why the *eased* tiles are not
   * the road, and what taking them for the road would have drawn.
   */
  road?: boolean;
  /**
   * A plank laid across a one-tile notch in a floating island.
   *
   * **Unlike `road` and like `track`, this changes walkability** — it is the whole point of it.
   * The islands come out of `stampIslands` with gaps in them: measured across five seeds of the
   * Aravali, **9 to 19** one-tile holes with island on both sides, which a walker has to go round
   * for no reason a player can see. The plank is what someone living up here would do about that,
   * and it is the only thing on the map the mill's tenant has visibly done outside their own door.
   *
   * It costs what the crossing costs on foot rather than what grass costs: the biome underneath is
   * still open sky, so `stepCost` falls through to `CROSSING_ON_FOOT`.
   */
  plank?: boolean;
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
  /**
   * The nomad camp, if this world has one.
   *
   * Its tiles are `settlement` like any other, because that is what gets them huts, fences and a
   * name in the journal for free. What the renderer needs on top is *which* settlement tiles are
   * felt rather than brick -- people who are not from here do not build in mud.
   *
   * A centre and a radius rather than a list of tiles: the patch is a diamond and stating it that
   * way keeps the baked world small.
   */
  camp: { at: Point; radius: number } | null;
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
  /**
   * Other names the same thing goes by. Empty for most.
   *
   * On the base rather than on flora alone, because canon carries them on both -- 23 plants and
   * 5 animals today. The game had no field for them at all and dropped every one, which is the
   * failure they were authored to fix: canon calls the strychnine tree `Kuchla`, and a player
   * who knows it as nux-vomica could find nothing.
   */
  aliases: string[];
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
