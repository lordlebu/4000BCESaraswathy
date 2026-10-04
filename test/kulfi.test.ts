// Kulfi: milk and ice, and only on the Narmada.
//
// **The owner's ask of 4 October 2026.** Ice comes only from snow, and snow lies only on the Narmada's
// high ground -- but nothing in the satchel spoils, so ice carried down to the delta would set a
// kulfi there. `Recipe.madeOn` is what holds it to the plateau, and `crafting.mapAllows` is where it
// is asked. These check the rule through `benchAt`, the bench the workshop builds, and through
// `canMake` and `shortfalls`, which the workshop asks -- never through a parallel answer.

import { describe, expect, it } from 'vitest';
import { canMake, mapAllows, placeAllows, shortfalls } from '../src/content/crafting';
import { benchAt } from '../src/content/stations';
import { fieldMap, fieldMaps, npc, poi } from '../src/content/places';
import { material, recipe } from '../src/content/making';
import { add, emptySatchel } from '../src/content/satchel';

const ready = () => {
  let s = emptySatchel();
  s = add(s, 'material_zebu_milk', 2);
  s = add(s, 'material_glacier_ice', 1);
  s = add(s, 'item_cooking_pot', 1);
  s = add(s, 'material_dung_cake', 1);
  return s;
};

describe('kulfi', () => {
  it('is milk and ice, set over a fire', () => {
    const r = recipe('recipe_kulfi')!;
    expect(r).toBeTruthy();
    expect(r.ingredients.some((n) => n.tag === 'milk')).toBe(true);
    expect(r.ingredients.some((n) => n.material === 'material_glacier_ice')).toBe(true);
    expect(r.madeOn).toEqual(['field_map_narmada']);
  });

  it('is shown by Tolla on the herders’ terraces, and by nobody else', () => {
    // The owner, 4 October 2026: taught, not known from the start. Canon's line gives it.
    const r = recipe('recipe_kulfi')!;
    expect(r.taughtBy).toEqual(['npc_tolla']);
    expect(r.knownBy).toEqual([]);
    const teaching = npc('npc_tolla')!.lines.filter((l) => l.gives.includes('recipe_kulfi'));
    expect(teaching.length).toBe(1);
    expect(npc('npc_tolla')!.foundAt.every((at) => fieldMap('field_map_narmada')!.pointsOfInterest.includes(at))).toBe(true);
  });

  it('can be made on the Narmada', () => {
    expect(canMake(ready(), 'recipe_kulfi', benchAt(null, 'field_map_narmada'))).toBe(true);
  });

  it('cannot be made anywhere else, whatever is carried', () => {
    for (const map of ['field_map_lothal', 'field_map_dwarka', 'field_map_aravali']) {
      const bench = benchAt(null, map);
      expect(canMake(ready(), 'recipe_kulfi', bench), map).toBe(false);
      const why = shortfalls(ready(), 'recipe_kulfi', bench).find((s) => s.kind === 'place');
      expect(why?.why, map).toBe('is only made on the Narmada Plateau');
    }
  });

  it('is refused by a caller that does not say which map it is on', () => {
    // A rule nobody wired is this codebase's signature fault: an unknown map is not "anywhere".
    expect(mapAllows('recipe_kulfi', benchAt(null))).toBe(false);
  });

  it('leaves the board alone: the kind of place still answers as it did', () => {
    // The map is asked beside `placeAllows`, not inside it, so the board and the rule still agree
    // everywhere (`test/benches.test.ts`).
    const camp = poi('poi_lothal_camp')!;
    expect(placeAllows('recipe_kulfi', benchAt(camp, 'field_map_lothal'))).toBe(true);
    expect(mapAllows('recipe_kulfi', benchAt(camp, 'field_map_lothal'))).toBe(false);
  });

  it('takes its ice from snow, and only the Narmada has snow', () => {
    expect(material('material_glacier_ice')?.foundIn).toEqual(['snow']);
    const snowy = fieldMaps.filter((m) => m.seedBiomes.includes('snow')).map((m) => m.id);
    expect(snowy).toEqual(['field_map_narmada']);
  });

  it('leaves every other recipe free of any map', () => {
    expect(mapAllows('recipe_hill_curd', benchAt(null))).toBe(true);
  });
});
