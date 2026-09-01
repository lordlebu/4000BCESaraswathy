// Does the game notice everything canon exports?
//
// Twice now canon has authored a field, the adapter has quietly ignored it, and nothing has
// failed. `neighbours` made the overworld impossible to build; `lines`, `knows` and
// `language` made the vocabulary mechanic dead while the suite stayed green. Both were found
// by hand, late, and only because someone went looking.
//
// This is the decision point that was missing. Every key canon actually exports must be
// declared here as either adapted or deliberately skipped. When canon grows a field, this
// fails with its name, and someone chooses — rather than the field being dropped in silence.
//
// It intentionally does not check that skipped fields stay skipped forever. It checks that
// nobody adds one by accident.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import speciesBundle from '../data/canon/species.json';
import placesBundle from '../data/canon/places.json';
import knowledgeBundle from '../data/canon/knowledge.json';
import craftingBundle from '../data/canon/crafting.json';
import lock from '../data/canon/canon.lock.json';
import { LANDMARK_ORDER, PLACE_ORDER, TERRAIN_ORDER, placeFrame } from '../src/game/frames';
import biomesData from '../data/biomes.json';
import landmarkData from '../data/landmarks.json';

/** Keys the adapters read, and keys they knowingly leave behind. */
interface Coverage {
  adapted: string[];
  /** Left behind on purpose. The comment on each group is the reason. */
  skipped: string[];
}

// Provenance and editorial metadata. On nearly every entity, never on the player's screen:
// `canon` is a confidence tier, `sources` cites where a fact came from, `notes` is written
// for whoever edits canon next, `type` is the entity's own kind and `epochs` waits on the
// epoch filter being wired into content.
const EDITORIAL = ['canon', 'sources', 'notes', 'type', 'epochs'];

const COVERAGE: Record<string, Coverage> = {
  'species.fauna': {
    adapted: ['id', 'name', 'scientific', 'region', 'biomes', 'placement', 'rarity', 'mood',
      'journal_prompt', 'habitats', 'source_index',
      // Read by `SpeciesIcon` to choose a mark. This replaced ~400 lines of keyword matching that
      // guessed it from the name and was wrong nineteen times.
      'clade',
      // The other names a thing goes by. **This moved out of `skipped`, and the old reason is
      // worth keeping because it was true when it was written:** "a species reaches the player
      // through the tile they are standing on, never through a search box". The album now has a
      // search box, so it does not. 28 species carry aliases and the runtime type dropped every
      // one of them.
      'aliases'],
    skipped: [...EDITORIAL,
      // Reference facts for the canon book and the retrieval service. The game shows
      // `journal_prompt`, which is the player-facing prose written separately from `notes`.
      'behaviour', 'diet', 'taxonomy', 'related_species', 'sentient',
      // Placement commentary for editors, and the Dwarka-gate crossing rule, which the
      // engine has no concept of yet.
      'placement_note', 'crosses_at',
      // `subclade` stays skipped, and that one is genuine: canon distinguishes a dromaeosaurid
      // from a sauropodomorph, and the game draws every non-avian dinosaur as 🦖 regardless. It is
      // a finer fact than any view here needs.
      'subclade']
  },
  'species.flora': {
    adapted: ['id', 'name', 'scientific', 'region', 'biomes', 'placement', 'rarity',
      'journal_prompt', 'habitats', 'source_index',
      // As `clade` on fauna. The derived version was wrong on 13 of 90.
      'growth_form',
      // The other names a plant is known by, which canon gained so a reader looking for
      // nux-vomica could find the page filed under Kuchla. It was skipped because that was a
      // problem the book had and the game did not -- see the note on fauna above. The album's
      // search box is what changed that.
      'aliases'],
    skipped: [...EDITORIAL, 'uses', 'placement_note', 'crosses_at']
  },
  'places.field_maps': {
    adapted: ['id', 'name', 'region', 'seed_biomes', 'scale', 'points_of_interest',
      'neighbours', 'arrival', 'climate', 'coordinates', 'relief'],
    skipped: [...EDITORIAL,
      // The name canon used before. There are around four Dwarkas in Jambhudweepa, so the one
      // this game walks became North Dwarka and the bare name was kept as an alias so canon's
      // own older references still resolve. The game shows the current `name` and reaches maps
      // by id, so the previous one has nothing to do here.
      'aliases']
  },
  'places.points_of_interest': {
    adapted: ['id', 'name', 'field_map', 'kind', 'terrain', 'stands', 'description', 'arrival',
      'discoveries', 'npcs', 'sub_locations', 'ruin_of'],
    skipped: [...EDITORIAL,
      // Canon cross-references — the character or event a place belongs to. Useful to the
      // retrieval service; the game reaches its own entities by id.
      'related_entities']
  },
  'places.npcs': {
    adapted: ['id', 'name', 'role', 'found_at', 'would_settle', 'language', 'knows', 'lines'],
    skipped: [...EDITORIAL,
      // Which canon character this person descends from. Lineage is book material.
      'descended_from']
  },
  'places.regions': {
    // Only `bestiary_region` is read, to recover a species' region from its habitats.
    adapted: ['id', 'bestiary_region'],
    skipped: [...EDITORIAL, 'name', 'biomes', 'biomes_note', 'continent', 'habitats',
      'landmarks', 'settlements',
      // The region's outline on canon's abstract 0-100 world grid, traced for the atlas it
      // draws per era. That grid describes where things sit relative to each other across the
      // whole world; this game generates its ground from a field map's own seed and never
      // places anything on a world grid.
      'extent']
  },
  'places.biomes': {
    adapted: ['id', 'name', 'renderable'],
    skipped: ['notes', 'realm', 'region']
  },
  'knowledge.discoveries': {
    adapted: ['id', 'name', 'discipline', 'subject', 'found_at', 'levels', 'answers',
      'helps', 'restores'],
    skipped: [...EDITORIAL,
      // A reading aid between discoveries; the ladders express the real dependencies
      // through `requires`, which is what the rules actually walk.
      'related_discoveries']
  },
  'knowledge.field_questions': {
    adapted: ['id', 'question', 'discipline', 'raised_at', 'raised_by', 'evidence',
      'resolutions', 'local_knowledge', 'academic_hypothesis'],
    skipped: [...EDITORIAL]
  },
  'knowledge.vocabulary': {
    adapted: ['id', 'word', 'language', 'gloss', 'literal', 'learned_from'],
    skipped: [...EDITORIAL]
  },
  // The making layer. Canon withholds `canon` and `sources` from this bundle alone — they are
  // provenance for the canon book and the retrieval service, both of which read `database/`
  // directly, and dropping them paid for 18 KB of the export budget. So EDITORIAL is not
  // spread here: two of its five keys are not in this bundle at all, and a `skipped` entry for
  // a key that cannot appear is a claim that rots quietly.
  'crafting.materials': {
    // `notes` is adapted here rather than skipped, unlike everywhere else. A species carries
    // `journal_prompt` written for the player and `notes` written for whoever edits canon
    // next; a material has only the one field, and it is the prose the player reads.
    adapted: ['id', 'name', 'classes', 'found_in', 'rarity', 'won_from', 'notes'],
    skipped: ['type', 'epochs', 'source_index',
      // Which processes can transform this. Canon calls it a convenience for the atlas and
      // says the recipe is the source of truth, so the game reads the recipes.
      'worked_by']
  },
  'crafting.items': {
    adapted: ['id', 'name', 'kind', 'affords', 'base_item', 'materials', 'notes'],
    skipped: ['type', 'epochs', 'source_index',
      // Canon cross-references: who made one, who carried one. Book material.
      'made_by', 'wielded_by']
  },
  'crafting.processes': {
    adapted: ['id', 'name', 'performed_at', 'needs', 'notes'],
    skipped: ['type', 'source_index']
  },
  'crafting.recipes': {
    adapted: ['id', 'name', 'process', 'ingredients', 'outputs', 'known_by', 'taught_by', 'notes'],
    skipped: ['type', 'epochs', 'source_index']
  },
  'crafting.vehicles': {
    adapted: ['id', 'name', 'kind', 'crosses', 'capacity', 'materials', 'notes'],
    skipped: ['type', 'epochs', 'source_index',
      // The named vessels of this kind — the Kelpfang, the Ekranoplan. They are `place`
      // entities canon does not export, so the ids would not resolve to anything here.
      'exemplars',
      // Which process builds one. The game has no boatyard yet.
      'built_by']
  }
};

/** Nested shapes, which is where `requires` and `gives` live and where drift would hurt most. */
const NESTED: Record<string, Coverage> = {
  'points_of_interest.sub_locations': {
    adapted: ['id', 'name', 'description', 'requires'],
    skipped: []
  },
  'npcs.lines': {
    adapted: ['text', 'requires', 'gives', 'costs'],
    skipped: []
  },
  'discoveries.levels': {
    adapted: ['entry', 'requires', 'conditions', 'needs_tool'],
    skipped: []
  },
  'field_questions.resolutions': {
    adapted: ['conclusion', 'requires', 'sound', 'revisit', 'revisit_after'],
    skipped: []
  }
};

const BUNDLES: Record<string, Record<string, unknown>> = {
  species: speciesBundle as Record<string, unknown>,
  places: placesBundle as Record<string, unknown>,
  knowledge: knowledgeBundle as Record<string, unknown>,
  crafting: craftingBundle as Record<string, unknown>
};

function keysOf(items: unknown[]): Set<string> {
  const out = new Set<string>();
  for (const item of items) {
    if (item && typeof item === 'object') for (const k of Object.keys(item)) out.add(k);
  }
  return out;
}

function collection(path: string): unknown[] {
  const [bundle, name] = path.split('.') as [string, string];
  return (BUNDLES[bundle]?.[name] ?? []) as unknown[];
}

describe('every field canon exports is accounted for', () => {
  for (const [path, cover] of Object.entries(COVERAGE)) {
    it(`${path}`, () => {
      const present = keysOf(collection(path));
      expect(present.size, `${path} is empty — the bundle or the path is wrong`).toBeGreaterThan(0);

      const declared = new Set([...cover.adapted, ...cover.skipped]);
      const undeclared = [...present].filter((k) => !declared.has(k)).sort();
      expect(
        undeclared,
        `canon now exports ${path}.{${undeclared.join(', ')}} and nothing here mentions it — ` +
          'adapt it in src/content/, or add it to `skipped` with a reason'
      ).toEqual([]);
    });
  }
});

describe('nested shapes too, where the rules live', () => {
  const sources: Record<string, unknown[]> = {
    'points_of_interest.sub_locations': collection('places.points_of_interest'),
    'npcs.lines': collection('places.npcs'),
    'discoveries.levels': collection('knowledge.discoveries'),
    'field_questions.resolutions': collection('knowledge.field_questions')
  };

  for (const [path, cover] of Object.entries(NESTED)) {
    it(`${path}`, () => {
      const field = path.split('.')[1]!;
      const nested = sources[path]!.flatMap((parent) => {
        const value = (parent as Record<string, unknown>)[field];
        return Array.isArray(value) ? value : [];
      });
      const present = keysOf(nested);
      expect(present.size, `${path} found nothing to check`).toBeGreaterThan(0);

      const declared = new Set([...cover.adapted, ...cover.skipped]);
      const undeclared = [...present].filter((k) => !declared.has(k)).sort();
      expect(
        undeclared,
        `canon now puts ${path}.{${undeclared.join(', ')}} in the bundle and nothing reads it`
      ).toEqual([]);
    });
  }
});

describe('the declarations do not rot', () => {
  it('claims no field that canon has stopped exporting', () => {
    // A stale `adapted` entry is how you end up confidently reading a field that is gone.
    const stale: string[] = [];
    for (const [path, cover] of Object.entries(COVERAGE)) {
      const present = keysOf(collection(path));
      for (const key of cover.adapted) {
        if (!present.has(key)) stale.push(`${path}.${key}`);
      }
    }
    expect(stale, 'declared as adapted but no longer in the bundle').toEqual([]);
  });

  it('ships exactly four bundles and no more', () => {
    // world.json was 46 KB that nothing imported, and Vite inlines every byte into the page.
    // The lock is the list of what actually ships, so growing it back is a deliberate act.
    //
    // It grew once, deliberately: `crafting.json` carries the making layer — materials,
    // items, processes, recipes and vehicles. Unlike world.json it is read, by
    // `src/content/making.ts` and everything downstream of it. Canon withholds `canon` and
    // `sources` from this one bundle to pay for the weight, and enforces a total budget of
    // its own in `check_export_boundary.py`.
    const shipped = Object.keys((lock as { sha256: Record<string, string> }).sha256).sort();
    expect(shipped).toEqual(['crafting.json', 'knowledge.json', 'places.json', 'species.json']);
  });
});

describe('the artwork points at places that exist', () => {
  // `placeFrame` looks a point of interest up by canon id. A typo there does not throw and does
  // not fail a build -- it silently returns null, the place keeps the generic diamond, and the
  // sprite that was drawn for it never appears. That is exactly what happened to the Stepped
  // Quarry, whose art was wired to `poi_stepped_quarry` while canon calls it `poi_basalt_quarry`.
  it('draws no place canon does not name', () => {
    const known = new Set(
      collection('places.points_of_interest').map((poi) => (poi as { id: string }).id)
    );
    // `null` entries are retired places whose sprite-sheet slot has to stay, because the sheet is
    // laid out in this order and `KIND_FRAMES` counts the array. They are holes on purpose; a
    // wrongly-*named* id is the bug this guards.
    const unknown = PLACE_ORDER.filter((id): id is string => id !== null && !known.has(id));
    expect(unknown, 'art wired to point-of-interest ids that are not in canon').toEqual([]);
  });

  it('draws every biome the game can put on the ground, by art or by placeholder', () => {
    // The reverse risk to the one above: a biome present in the data but missing from the sheet
    // used to fall back silently to plains, so a whole terrain type rendered as grassland.
    //
    // It no longer has to. `placeholderTileKey` draws any biome from its own `color` and `symbol`,
    // so ground the art has not caught up with is drawn as itself rather than mistaken for a
    // meadow. What this test now guards is that every biome has *one* of the two -- a frame in
    // the sheet, or the two fields a placeholder needs. A biome with neither is undrawable, which
    // is the failure that actually matters.
    const biomes = biomesData as { id: string; color?: string; symbol?: string }[];
    const undrawable = biomes
      .filter((b) => !TERRAIN_ORDER.includes(b.id as (typeof TERRAIN_ORDER)[number]))
      .filter((b) => !b.color || !b.symbol)
      .map((b) => b.id);
    expect(undrawable, 'biomes with neither terrain art nor a colour and symbol to stand in').toEqual([]);
  });

  it('says which biomes are standing in for missing art', () => {
    // Not a failure -- a ledger. These are drawn from colour and symbol until someone draws them,
    // and the list should be short and deliberate rather than quietly growing.
    const biomes = (biomesData as { id: string }[]).map((b) => b.id);
    const standIns = biomes.filter((id) => !TERRAIN_ORDER.includes(id as (typeof TERRAIN_ORDER)[number]));
    expect(standIns.sort()).toEqual(
      ['lava_field', 'open_sky', 'sky_island', 'sky_underside', 'underworld'].sort()
    );
  });

  it('draws every place, by its own art or by its kind', () => {
    // All twenty-four points of interest were showing the same diamond until eight got their own
    // drawing; the other sixteen now fall back to their kind. A kind marker says more without
    // claiming more -- reeds for an eco-site, a doorway leading nowhere for an anomaly, a roof and
    // a well for a place people live, worn steps for a wilderness, a cold fire-ring for a camp.
    const places = collection('places.points_of_interest') as { id: string; kind: string }[];
    const bare = places.filter((p) => placeFrame(p.id, p.kind) === null);
    expect(bare.map((p) => `${p.id} (${p.kind})`), 'places with no picture at all').toEqual([]);
  });

  it('prefers its own art over its kind', () => {
    // Kavik's Tower is an archaeological site and so is the Silted Granary; if the kind ever won,
    // canon's eight authored places would silently collapse into one generic ruin.
    const own = placeFrame('poi_kavik_tower', 'archaeological_site');
    const kind = placeFrame('poi_bone_midden', 'archaeological_site');
    expect(own).not.toBe(kind);
    expect(own).toBeLessThan(PLACE_ORDER.length);
  });

  it('draws every kind of landmark a journey can end at', () => {
    // A landmark kind with no frame draws nothing at all, so the destination -- the emotional
    // beat the whole session builds to -- would be an empty tile.
    const kinds = (landmarkData as { id: string }[]).map((kind) => kind.id);
    const missing = kinds.filter((id) => !LANDMARK_ORDER.includes(id));
    expect(missing, 'landmark kinds in data/landmarks.json with no frame').toEqual([]);
  });
});

describe('the plate queue reads the same rarity weights the engine picks with', () => {
  // `tools/reachable-species.js` ranks species by how often a player will meet one, so a painter
  // works down the list in the order they appear in play. It reads the shipped JSON bundle and
  // cannot import TypeScript, so it copies RARITY_WEIGHT from `src/content/species.ts`.
  //
  // A copied rule needs a test or it drifts, which is the cost CLAUDE.md records for
  // `check_playability.py` duplicating `journey.ts`. This is that test.
  //
  // Leaving the weights out entirely was the first version of the tool and it was wrong by a
  // factor of twelve: a mythic species holds one pool slot where a common one holds twelve, so an
  // unweighted ranking put nine Asura conjurations in the top twenty-five fauna -- precisely the
  // creatures a player meets least often.
  const weights = (source: string) => {
    const line = source.match(/RARITY_WEIGHT[^=]*=\s*\{([^}]*)\}/);
    expect(line, 'no RARITY_WEIGHT found').not.toBeNull();
    const out: Record<string, number> = {};
    for (const [, k, v] of line![1].matchAll(/(\w+)\s*:\s*(\d+)/g)) out[k] = Number(v);
    return out;
  };

  it('matches, weight for weight', () => {
    const engine = weights(readFileSync('src/content/species.ts', 'utf8'));
    const tool = weights(readFileSync('tools/reachable-species.js', 'utf8'));
    expect(Object.keys(engine).length).toBeGreaterThan(0);
    expect(tool).toEqual(engine);
  });
});