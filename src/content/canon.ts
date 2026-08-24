// The adapter: canon's shape in, the engine's shape out.
//
// Canon used to be exported in this game's exact field list, by a Python script in the
// other repo. That meant the lore repo had to know the engine's data model, and could not
// gain a field — or a whole entity type — without an edit over there. It also meant
// everything that was not a species was thrown away: 441 entities arrived as 346 flat rows.
//
// Now canon exports what canon holds, and this file is the only place that knows how to
// turn that into what the engine wants. Two consequences worth keeping true:
//
//   * canon changes when the fiction changes; the engine changes when the design does.
//     Neither forces an edit in the other repo.
//   * every mapping decision lives here. If a field is renamed on the way in, this is the
//     single file to read to find out why.
//
// The bundle is imported, not fetched — Vite inlines it, so a malformed file is a build
// failure rather than a blank journal, and there is no network on the critical path.

import placesBundle from '../../data/canon/places.json';
import speciesBundle from '../../data/canon/species.json';
import type {
  Biome, BiomeId, Clade, Creature, Flora, GrowthForm, Placement, Rarity
} from '../world/types';

/** A species as canon holds it: more fields than the engine uses, and different names. */
interface CanonSpecies {
  id: string;
  name: string;
  scientific?: string | null;
  region?: string;
  biomes?: string[];
  placement?: string;
  rarity?: string;
  mood?: string;
  clade?: string;
  growth_form?: string;
  journal_prompt?: string;
  notes?: string;
  habitats?: string[];
  source_index?: number;
}

interface CanonBiome {
  id: string;
  name: string;
  realm: string;
  renderable?: boolean;
}

const canonBiomes = (placesBundle as { biomes: CanonBiome[] }).biomes;

/**
 * The biomes this engine can actually draw.
 *
 * Canon's vocabulary is deliberately wider — it can say `sky_island` or `underworld`
 * because those are real places in the fiction, even though the walk has nowhere to put
 * them. Anything not renderable is filtered out here, and a species left with no renderable
 * biome becomes `lore`: authored and published, never placed on a tile.
 */
const RENDERABLE = new Set(canonBiomes.filter((b) => b.renderable).map((b) => b.id));

/**
 * Canon ids carry their type as a prefix; the engine's are bare slugs.
 *
 * Exported because canon's own cross-references — a discovery's `subject`, a question's
 * evidence — are written in canon ids, and anything following those links back to a species
 * needs the same transform rather than a second guess at it.
 */
export function engineId(canonId: string): string {
  const cut = canonId.indexOf('_');
  return cut === -1 ? canonId : canonId.slice(cut + 1).replace(/_/g, '-');
}

interface CanonRegion {
  id: string;
  bestiary_region?: string;
}

/**
 * Canon region id to the region slug the engine uses, e.g.
 * `region_saraswati_delta` → `saraswati-godavari-deltas`.
 *
 * Species imported from the bestiary carry that slug directly. Species authored in canon
 * carry only `habitats`, which hold region ids — so their region has to be recovered from
 * the first habitat that names one. Dropping this quietly relabelled forty species as
 * `canon`, which the parity test caught.
 */
const regionSlug = new Map<string, string>(
  (placesBundle as { regions: CanonRegion[] }).regions
    .filter((r) => r.bestiary_region)
    .map((r) => [r.id, r.bestiary_region as string])
);

function regionOf(entity: CanonSpecies): string {
  if (entity.region) return entity.region;
  for (const habitat of entity.habitats ?? []) {
    const slug = regionSlug.get(habitat);
    if (slug) return slug;
  }
  return 'canon';
}

function toSpecies(entity: CanonSpecies, kind: 'fauna' | 'flora'): Creature | Flora {
  const biomes = (entity.biomes ?? []).filter((b) => RENDERABLE.has(b)) as BiomeId[];
  const base = {
    id: engineId(entity.id),
    name: entity.name,
    binomial: entity.scientific ?? null,
    region: regionOf(entity),
    biomes,
    // Nothing renderable to stand on means nothing to place, whatever canon says.
    placement: (biomes.length ? (entity.placement ?? 'lore') : 'lore') as Placement,
    rarity: (entity.rarity ?? 'common') as Rarity,
    // `notes` is canon's reference fact and `journal_prompt` is the sentence the player
    // reads. They are deliberately separate; entities authored in canon rather than
    // imported from the bestiary have only the former, and are all `lore` anyway.
    journalPrompt: entity.journal_prompt ?? entity.notes ?? ''
  };
  // Canon requires both of these on every species, so a missing one means the bundle is older
  // than this adapter rather than that a default is wanted. Falling back would hide that: the
  // whole point of reading canon is that the game stops deciding what a species is.
  return kind === 'fauna'
    ? { ...base, mood: entity.mood ?? 'watchful', clade: entity.clade as Clade }
    : { ...base, growthForm: entity.growth_form as GrowthForm };
}

const bundle = speciesBundle as { fauna: CanonSpecies[]; flora: CanonSpecies[] };

/**
 * Array order is part of the seed contract.
 *
 * `pickFor` indexes into the per-biome list, so the order these arrive in decides which
 * creature a given tile shows. Canon sorts by `source_index` — the authored bestiary
 * sequence — and anything without one sorts after by id, so adding to canon can never
 * reshuffle what came before. That ordering is preserved here rather than re-sorted.
 */
export const creatures: Creature[] = bundle.fauna.map((e) => toSpecies(e, 'fauna') as Creature);
export const flora: Flora[] = bundle.flora.map((e) => toSpecies(e, 'flora') as Flora);

/**
 * Biomes, in the engine's shape.
 *
 * Colour, symbol, walkability, travel cost and the journal description are the engine's
 * business and stay in `data/biomes.json` — canon has no opinion on what wetland looks
 * like. This only carries across what canon does own: which biomes exist and which are
 * renderable.
 */
export const renderableBiomeIds: readonly BiomeId[] = canonBiomes
  .filter((b) => b.renderable)
  .map((b) => b.id as BiomeId);

export type { Biome };
