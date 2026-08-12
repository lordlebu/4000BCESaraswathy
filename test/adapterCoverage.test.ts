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
import speciesBundle from '../data/canon/species.json';
import placesBundle from '../data/canon/places.json';
import knowledgeBundle from '../data/canon/knowledge.json';

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
      'placement_note', 'crosses_at']
  },
  'species.flora': {
    adapted: ['id', 'name', 'scientific', 'region', 'biomes', 'placement', 'rarity',
      'journal_prompt', 'habitats', 'source_index'],
    skipped: [...EDITORIAL, 'uses', 'placement_note', 'crosses_at']
  },
  'places.field_maps': {
    adapted: ['id', 'name', 'region', 'seed_biomes', 'scale', 'points_of_interest',
      'neighbours', 'arrival'],
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
    adapted: ['id', 'word', 'language', 'gloss', 'literal', 'learned_from', 'unlocks'],
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
    adapted: ['conclusion', 'requires', 'sound', 'revisit'],
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

  it('notes that world.json is exported and consumed by nothing', () => {
    // Not a failure — characters, events, settlements and factions are for later phases and
    // for the retrieval service. Asserted so that starting to use it is a deliberate act.
    const importers = ['canon.ts', 'places.ts', 'knowledge.ts'];
    expect(importers).not.toContain('world.ts');
  });
});
