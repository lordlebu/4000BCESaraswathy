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
      'journal_prompt', 'habitats', 'source_index'],
    skipped: [...EDITORIAL,
      // Reference facts for the canon book and the retrieval service. The game shows
      // `journal_prompt`, which is the player-facing prose written separately from `notes`.
      'aliases', 'behaviour', 'diet', 'taxonomy', 'related_species', 'sentient',
      // Placement commentary for editors, and the Dwarka-gate crossing rule, which the
      // engine has no concept of yet.
      'placement_note', 'crosses_at',
      // Canon states what every animal is; the game still guesses it from the name.
      //
      // `clade` and `subclade` are the fields that would end that -- `bodyPlanOf` matches
      // keywords against names and binomials, and has been wrong six separate times: an owl drawn
      // as a ghost, a baby crocodile as a mammal, a feathered dinosaurid as a cricket, three
      // mongooses as the prey they are named after. Reading the clade instead deletes the
      // classifier and the whole class of bug.
      //
      // Skipped rather than adapted because that is a game-side change with its own plan, and
      // doing it here would smuggle a rewrite of `SpeciesIcon` into a data sync. This line is the
      // reminder, and it should be deleted the day the adapter reads them.
      'clade', 'subclade']
  },
  'species.flora': {
    adapted: ['id', 'name', 'scientific', 'region', 'biomes', 'placement', 'rarity',
      'journal_prompt', 'habitats', 'source_index'],
    skipped: [...EDITORIAL, 'uses', 'placement_note', 'crosses_at',
      // The plant half of the same debt as `clade` on fauna. Canon now states every plant's
      // growth form; `growthFormOf` still derives it from the name, and diffing the two put the
      // derived answer wrong on **13 of 90** -- `gourd` sits in its cactus keywords so two
      // trailing vines are cacti, `lichen` sits in moss, and `coral` and `kelp` sit in seaweed,
      // which catches the actual corals and both Zostera seagrasses.
      //
      // Skipped rather than adapted for the same reason as `clade`: reading it deletes the
      // derivation, and that is a game-side change with its own plan. Delete both lines the day
      // the adapter reads them.
      'growth_form']
  },
  'places.field_maps': {
    adapted: ['id', 'name', 'region', 'seed_biomes', 'scale', 'points_of_interest',
      'neighbours', 'arrival', 'climate', 'coordinates', 'relief'],
    skipped: [...EDITORIAL]
  },
  'places.points_of_interest': {
    adapted: ['id', 'name', 'field_map', 'kind', 'terrain', 'description', 'arrival',
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
      'landmarks', 'settlements']
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
  }
};

/** Nested shapes, which is where `requires` and `gives` live and where drift would hurt most. */
const NESTED: Record<string, Coverage> = {
  'points_of_interest.sub_locations': {
    adapted: ['id', 'name', 'description', 'requires'],
    skipped: []
  },
  'npcs.lines': {
    adapted: ['text', 'requires', 'gives'],
    skipped: []
  },
  'discoveries.levels': {
    adapted: ['entry', 'requires', 'conditions'],
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
  knowledge: knowledgeBundle as Record<string, unknown>
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

  it('ships exactly three bundles and no more', () => {
    // world.json was 46 KB that nothing imported, and Vite inlines every byte into the page.
    // The lock is the list of what actually ships, so growing it back is a deliberate act.
    const shipped = Object.keys((lock as { sha256: Record<string, string> }).sha256).sort();
    expect(shipped).toEqual(['knowledge.json', 'places.json', 'species.json']);
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

  it('draws every biome the game can put on the ground', () => {
    // The reverse risk to the one above: a biome present in the data but missing from the sheet
    // silently falls back to plains, so a whole terrain type would render as grassland.
    const biomes = (biomesData as { id: string }[]).map((biome) => biome.id);
    const missing = biomes.filter((id) => !TERRAIN_ORDER.includes(id as (typeof TERRAIN_ORDER)[number]));
    expect(missing, 'biomes in data/biomes.json with no frame in the terrain sheet').toEqual([]);
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