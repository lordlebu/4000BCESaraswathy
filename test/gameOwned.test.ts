// What crosses between canon and the game's own making data, in both directions.
//
// **Making moved to the game on 2 October 2026** (the owner's ruling): materials, items, processes,
// recipes, vehicles and homesteads are `data/making/`, edited here. Canon keeps the world -- species
// and where they grow, places, people, discoveries, words -- and the lore gives it context rather
// than driving the game's arithmetic. But the two still name each other's ids:
//
//   canon -> game   a line that teaches a recipe or asks for an item, a field map's boat, a happening
//                   that grants a recipe, a storyline's beat
//   game -> canon   a material's `won_from` species, a homestead's map, grounds, holders, words and
//                   discoveries
//
// Neither repository can resolve the other's ids on its own, so this does both. A rename on either
// side fails here by name, which is the guard canon's lint used to be for the half it owned.
//
// Below that, the checks canon's lint made on the making layer, ported rather than dropped: the
// vocabularies are declared, a material is gathered only where its source lives, a boat can float
// on the map that lists it, one homestead a map, and no id in prose a player reads.

import { describe, expect, it } from 'vitest';
import speciesBundle from '../data/canon/species.json';
import placesBundle from '../data/canon/places.json';
import knowledgeBundle from '../data/canon/knowledge.json';
import crafting from '../data/making/crafting.json';
import homesteadData from '../data/making/homesteads.json';
import affordancesFile from '../data/making/affordances.json';
import classesFile from '../data/making/material_classes.json';
import ratesFile from '../data/making/renewal_rates.json';

type Doc = Record<string, unknown> & { id: string };

const making = crafting as unknown as Record<'materials' | 'items' | 'processes' | 'recipes' | 'vehicles', Doc[]>;
const homesteads = (homesteadData as unknown as { homesteads: Doc[] }).homesteads;
const canon = {
  ...(speciesBundle as unknown as Record<string, unknown>),
  ...(placesBundle as unknown as Record<string, unknown>),
  ...(knowledgeBundle as unknown as Record<string, unknown>)
};

/** Prefixes of the ids the game owns, and of the ids canon owns and exports. */
const GAME = /^(material|item|process|recipe|vehicle|homestead)_[a-z0-9_]+$/;
const CANON = /^(fauna|flora|poi|npc|word|discovery|field_map|question|happening|region|storyline|saying)_[a-z0-9_]+$/;

/** Every string anywhere under a value, with the path it was found at. */
function strings(value: unknown, path: string, out: [string, string][] = []): [string, string][] {
  if (typeof value === 'string') out.push([path, value]);
  else if (Array.isArray(value)) value.forEach((v, i) => strings(v, `${path}[${i}]`, out));
  else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) strings(v, `${path}.${k}`, out);
  return out;
}

function idsIn(collections: Record<string, unknown>): Set<string> {
  const out = new Set<string>();
  for (const v of Object.values(collections)) if (Array.isArray(v)) for (const e of v) if (e && typeof e === 'object' && 'id' in e) out.add(String((e as Doc).id));
  return out;
}

const gameIds = new Set([...idsIn(making), ...homesteads.map((h) => h.id)]);
const canonIds = idsIn(canon);
const vocab = (file: unknown, key: string): Set<string> => {
  const v = (file as Record<string, unknown>)[key];
  return new Set(Array.isArray(v) ? (v as string[]) : Object.keys(v as object));
};
const AFFORDANCES = vocab(affordancesFile, 'affordances');
const CLASSES = vocab(classesFile, 'classes');
const RATES = vocab(ratesFile, 'rates');

describe('ids across the boundary', () => {
  it('every game-owned id canon names exists in the game', () => {
    const missing = strings(canon, 'canon')
      .filter(([, v]) => GAME.test(v) && !gameIds.has(v))
      .map(([p, v]) => `${p}: ${v}`);
    expect(missing, 'canon names a making id the game does not have').toEqual([]);
  });

  it('every canon id the game names is in the bundle', () => {
    const missing = strings({ making, homesteads }, 'game')
      .filter(([, v]) => CANON.test(v) && !canonIds.has(v))
      .map(([p, v]) => `${p}: ${v}`);
    expect(missing, 'the game names a canon id canon does not export').toEqual([]);
  });

  it('owns its ids once', () => {
    const all = [...Object.values(making).flat().map((e) => e.id), ...homesteads.map((h) => h.id)];
    expect(all.filter((id, i) => all.indexOf(id) !== i)).toEqual([]);
  });
});

describe('the vocabularies are the declared ones', () => {
  it('materials carry declared classes and renewal rates', () => {
    for (const m of making.materials) {
      for (const c of (m.classes as string[]) ?? []) expect(CLASSES.has(c), `${m.id}: class ${c}`).toBe(true);
      if (m.renews) expect(RATES.has(m.renews as string), `${m.id}: renews ${String(m.renews)}`).toBe(true);
    }
  });

  it('items afford, processes need and rungs ask for declared affordances', () => {
    for (const i of making.items) for (const a of (i.affords as string[]) ?? []) expect(AFFORDANCES.has(a), `${i.id}: ${a}`).toBe(true);
    for (const p of making.processes) for (const a of (p.needs as string[]) ?? []) expect(AFFORDANCES.has(a), `${p.id}: ${a}`).toBe(true);
    for (const d of (canon.discoveries as Doc[]) ?? [])
      for (const level of (d.levels as { needs_tool?: string[] }[]) ?? [])
        for (const a of level.needs_tool ?? []) expect(AFFORDANCES.has(a), `${d.id} needs_tool ${a}`).toBe(true);
  });

  it('a recipe tag is a declared class with a hash', () => {
    for (const r of making.recipes)
      for (const need of (r.ingredients as { tag?: string }[]) ?? [])
        if (need.tag) expect(CLASSES.has(need.tag.replace(/^#/, '')), `${r.id}: ${need.tag}`).toBe(true);
    for (const h of homesteads)
      for (const s of h.stages as { needs: { tag?: string }[] }[])
        for (const need of s.needs) if (need.tag) expect(CLASSES.has(need.tag.replace(/^#/, '')), `${h.id}: ${need.tag}`).toBe(true);
  });
});

describe('the making layer agrees with the world', () => {
  it('a material is gathered only where one of its sources lives', () => {
    // Three outrun their source on purpose: they wash up or crust a pan the living thing never
    // reached. Canon's lint carried the same three.
    const travels = new Set(['material_leviathan_bone', 'material_oyster_shell', 'material_salt_crust']);
    const biomesOf = new Map<string, string[]>();
    for (const s of [...((canon.fauna as Doc[]) ?? []), ...((canon.flora as Doc[]) ?? [])]) biomesOf.set(s.id, (s.biomes as string[]) ?? []);
    const wrong: string[] = [];
    for (const m of making.materials) {
      if (travels.has(m.id)) continue;
      const sources = ((m.won_from as string[]) ?? []).filter((s) => biomesOf.has(s));
      if (sources.length === 0) continue;
      const reach = new Set(sources.flatMap((s) => biomesOf.get(s)!));
      for (const b of (m.found_in as string[]) ?? []) if (!reach.has(b)) wrong.push(`${m.id} in ${b}`);
    }
    expect(wrong, 'gathered in a biome none of its sources live in').toEqual([]);
  });

  it('a boat a field map lists can float there', () => {
    const vehicles = new Map(making.vehicles.map((v) => [v.id, v]));
    for (const map of (canon.field_maps as Doc[]) ?? []) {
      const palette = new Set((map.seed_biomes as string[]) ?? []);
      for (const id of (map.vehicles as string[]) ?? []) {
        const v = vehicles.get(id);
        expect(v, `${map.id} lists ${id}, which is not a vehicle`).toBeTruthy();
        expect(((v!.crosses as string[]) ?? []).some((b) => palette.has(b)), `${map.id}: ${id} has nothing to cross`).toBe(true);
      }
    }
  });

  it('one homestead a map, on a map that exists', () => {
    const maps = homesteads.map((h) => h.field_map as string);
    expect(new Set(maps).size).toBe(maps.length);
    for (const m of maps) expect(canonIds.has(m), m).toBe(true);
  });

  it('no id in the prose a player reads', () => {
    // A material's, item's, vehicle's or process's notes are the description under its name.
    const cited = /`[a-z]+_[a-z0-9_]+`/;
    for (const key of ['materials', 'items', 'vehicles', 'processes'] as const)
      for (const e of making[key]) if (typeof e.notes === 'string') expect(cited.test(e.notes), `${e.id} shows an id to the player`).toBe(false);
  });
});
