// A cook fire from fuel (`docs/satchel-and-hearth.md`, phase 3; the owner's ruling, 2 October 2026).
//
// The owner carried a satchel of dung cakes and could not cook: every dish asked for a carried thing
// that burns, and fuel was only ever an ingredient in a kiln. Now any one carried fuel lights a fire
// from the kit's lamp and the meal spends it; a settlement's hearth costs nothing; and something
// carried that burns still does it for nothing, as before.

import { describe, expect, it } from 'vitest';
import { blockedBy, canMake, fireFor, make } from '../src/content/crafting';
import { add, count, emptySatchel, type Satchel } from '../src/content/satchel';

/** Two greens of jackfruit, a ginger and salt -- jackfruit curry -- and a basket to cook it in. */
const curry = (): Satchel => {
  let s = emptySatchel();
  s = add(s, 'material_jackfruit_flesh', 2);
  s = add(s, 'material_ginger_root', 1);
  s = add(s, 'material_sea_salt', 1);
  s = add(s, 'item_carry_basket', 1);
  return s;
};
const CURRY = 'recipe_jackfruit_curry';

describe('a cook fire', () => {
  it('cannot be had from nothing, and says fuel will do', () => {
    expect(canMake(curry(), CURRY)).toBe(false);
    expect(blockedBy(curry(), CURRY).join(' ')).toMatch(/or any fuel to light a fire/);
  });

  it('is lit from a dung cake on open ground, and the meal spends it', () => {
    const s = add(curry(), 'material_dung_cake', 3);
    expect(fireFor(s, CURRY)).toEqual({ by: 'fuel', fuel: 'material_dung_cake' });
    expect(canMake(s, CURRY)).toBe(true);
    const after = make(s, CURRY);
    expect(count(after, 'material_dung_cake')).toBe(2);
    expect(count(after, 'item_jackfruit_curry')).toBe(2);
  });

  it('burns the most plentiful fuel, so the last of one is not the one used', () => {
    const s = add(add(curry(), 'material_dung_cake', 1), 'material_pine_resin', 4);
    expect(fireFor(s, CURRY)).toEqual({ by: 'fuel', fuel: 'material_pine_resin' });
  });

  it('costs nothing at a settlement, whose hearths are already lit', () => {
    const s = add(curry(), 'material_dung_cake', 1);
    expect(fireFor(s, CURRY, { kind: 'settlement' })).toEqual({ by: 'hearth' });
    expect(count(make(s, CURRY, { kind: 'settlement' }), 'material_dung_cake')).toBe(1);
  });

  it('costs nothing when something carried already burns', () => {
    const s = add(add(curry(), 'material_dung_cake', 1), 'item_bow_drill', 1);
    expect(fireFor(s, CURRY)).toEqual({ by: 'tool' });
    expect(count(make(s, CURRY), 'material_dung_cake')).toBe(1);
  });

  it('never burns a fuel the dish is cooked from', () => {
    // Beedu oil is an oil and a fuel. With it as the only oil and the only fuel, the tonic has its
    // oil and no fire, rather than a fire and no oil.
    let s = emptySatchel();
    s = add(s, 'material_ashwagandha_root', 2);
    s = add(s, 'material_beedu_bladder_oil', 1);
    s = add(s, 'item_carry_basket', 1);
    expect(fireFor(s, 'recipe_ashwagandha_tonic')).toBeNull();
    expect(canMake(s, 'recipe_ashwagandha_tonic')).toBe(false);
    // A second one is spare, and lights it.
    expect(canMake(add(s, 'material_beedu_bladder_oil', 1), 'recipe_ashwagandha_tonic')).toBe(true);
  });

  it('is only for cooking: a kiln still wants what a kiln wants', () => {
    const s = add(add(add(emptySatchel(), 'material_river_clay', 2), 'material_dung_cake', 4), 'material_potters_grog', 1);
    expect(fireFor(s, 'recipe_cooking_pot', { kind: 'settlement' })).toBeNull();
  });
});
