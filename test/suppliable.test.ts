// What a map's ground can never supply: the workshop's "Not on this ground", and the ratchet over it.
//
// **Why this exists.** The crafting audit of 3 October 2026 (`docs/crafting-audit.md`) found that
// `criticalPath.test.ts` asked only about recipes a map's people *teach*, so the 9 to 29 recipes per
// map known from the first step and impossible on that ground were invisible to every test. The
// ratchet at the bottom holds every known recipe on every map: a new impossible one fails, and one
// that becomes possible fails until it is struck off, so the lists only shorten.

import { describe, expect, it } from 'vitest';
import { FINDABLE_TILES, groundOf, outOfReach } from '../src/content/suppliable';
import { buildFieldMap } from '../src/world/fieldMap';
import { fieldMap, fieldMaps, npcsAt } from '../src/content/places';
import { recipe } from '../src/content/making';
import { add, emptySatchel } from '../src/content/satchel';

/** What a player on this map knows: everything common, and whatever this map's people teach. */
function knowsOn(mapId: string) {
  const people = new Set(fieldMap(mapId)!.pointsOfInterest.flatMap((p) => npcsAt(p).map((n) => n.id)));
  return (id: string) => {
    const r = recipe(id);
    return Boolean(r && (r.taughtBy.length === 0 || r.taughtBy.some((t) => people.has(t))));
  };
}

const SEEDS = Array.from({ length: 6 }, (_, i) => `suppliable-${i}`);
/** Findable on this many of the six: the crafting audit's own measure, so its numbers match. */
const ON_SEEDS = 5;

const reliable = new Map<string, Set<string>>();
/** What the ground gives on five of six seeds: findable on nearly any journey. */
function reliableGround(mapId: string): Set<string> {
  const known = reliable.get(mapId);
  if (known) return known;
  const seen = new Map<string, number>();
  for (const seed of SEEDS) {
    for (const id of groundOf(buildFieldMap(fieldMap(mapId)!, { seed }).world)) seen.set(id, (seen.get(id) ?? 0) + 1);
  }
  const found = new Set([...seen].filter(([, n]) => n >= ON_SEEDS).map(([id]) => id));
  reliable.set(mapId, found);
  return found;
}

describe('not on this ground', () => {
  it('counts a material only where enough of it lies', () => {
    expect(FINDABLE_TILES).toBeGreaterThanOrEqual(2);
    const ground = groundOf(buildFieldMap(fieldMap('field_map_narmada')!, { seed: SEEDS[0]! }).world);
    expect(ground.size).toBeGreaterThan(10);
    // The Narmada has no coast: sea salt can never be on it.
    expect(ground.has('material_sea_salt')).toBe(false);
  });

  it('names what is missing, and moves a recipe back up when the missing thing is carried', () => {
    const map = 'field_map_narmada';
    const ground = reliableGround(map);
    const away = outOfReach(ground, emptySatchel(), map, knowsOn(map));
    const dates = 'recipe_date_block';
    expect(recipe(dates), 'the date block recipe was renamed').not.toBeNull();
    expect(away.get(dates)).toEqual(['dates']);
    // Dates carried in from Dwarka: nothing is missing any more.
    const carrying = add(emptySatchel(), 'material_date_fruit', 4);
    expect(outOfReach(ground, carrying, map, knowsOn(map)).has(dates)).toBe(false);
  });

  it('never sets apart a recipe that wants only a tool', () => {
    // A tool is the tool step's to answer; out of reach means a material the ground does not give.
    for (const map of fieldMaps) {
      const away = outOfReach(reliableGround(map.id), emptySatchel(), map.id, knowsOn(map.id));
      for (const [id, missing] of away) expect(missing.length, `${id} set apart with nothing missing`).toBeGreaterThan(0);
    }
  });
});

/**
 * Every known recipe this map's ground can never supply, from the crafting audit's measurement.
 * **Strike a line when it closes; never add one without a reason beside it.** What is left is mostly
 * one map's things wanted on another -- dates and myrrh are Dwarka's now that it is a cold desert,
 * guggul and shilajit the Narmada's, taro Lothal's -- which "Not on this ground" says to carry in.
 */
const NEVER_ON: Record<string, string[]> = {
  field_map_aravali: [
    'recipe_boar_spear', // boar tusk
    'recipe_clay_seal', // bone awl
    'recipe_date_block', // dates
    'recipe_flood_bread', // lotus-root taro
    'recipe_guggul_pill', // guggul
    'recipe_hide_tent', // husk hawser
    'recipe_kuchla_grain', // purified kuchla
    'recipe_myrrh_poultice', // myrrh gum
    'recipe_purify_kuchla', // kuchla seed
    'recipe_salt_fish_stew', // dried fish, lotus-root taro
    'recipe_sandalwood_comb', // sandalwood billet
    'recipe_shilajit_tonic', // shilajit
    'recipe_travel_cake', // dates
    'recipe_water_skin', // bone awl
  ],
  field_map_dwarka: [
    'recipe_bow_drill', // bamboo cane
    'recipe_flood_bread', // lotus-root taro
    'recipe_guggul_pill', // guggul, pippali
    'recipe_hill_curd', // anything milk
    'recipe_jackfruit_curry', // jackfruit, ginger
    'recipe_kuchla_grain', // purified kuchla
    'recipe_purify_kuchla', // kuchla seed
    'recipe_reed_flute', // bamboo cane
    'recipe_reed_spear', // bamboo cane
    'recipe_salt_fish_stew', // dried fish, lotus-root taro
    'recipe_shilajit_tonic', // shilajit
    'recipe_sitar', // iron-teak timber, sky-balloon shell
  ],
  field_map_lothal: [
    'recipe_clay_seal', // bone awl
    'recipe_date_block', // dates
    'recipe_guggul_pill', // guggul
    'recipe_hide_tent', // husk hawser
    'recipe_hill_curd', // anything milk
    'recipe_kuchla_grain', // purified kuchla
    'recipe_myrrh_poultice', // myrrh gum
    'recipe_purify_kuchla', // kuchla seed
    'recipe_shilajit_tonic', // shilajit
    'recipe_sitar', // sky-balloon shell
    'recipe_travel_cake', // dates
    'recipe_water_skin', // bone awl
  ],
  field_map_narmada: [
    'recipe_date_block', // dates
    'recipe_fire_rattle', // anything shell
    'recipe_flood_bread', // lotus-root taro
    'recipe_glass_lancet', // anything glass
    'recipe_guggul_pill', // guggul
    'recipe_hide_tent', // husk hawser
    'recipe_kuchla_grain', // purified kuchla
    'recipe_myrrh_poultice', // myrrh gum
    'recipe_purify_kuchla', // kuchla seed
    'recipe_salt_fish_stew', // dried fish, lotus-root taro
    'recipe_serpent_mantle', // shed snakeskin
    'recipe_sitar', // sky-balloon shell
    'recipe_travel_cake', // dates
  ]
};

describe('every known recipe on every map, as a ratchet', () => {
  for (const map of fieldMaps) {
    it(`${map.id}: what its ground can never supply`, { timeout: 60_000 }, () => {
      const away = outOfReach(reliableGround(map.id), emptySatchel(), map.id, knowsOn(map.id));
      expect([...away.keys()].sort()).toEqual(NEVER_ON[map.id] ?? []);
    });
  }
});
