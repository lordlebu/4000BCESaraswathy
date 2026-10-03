// Every material's regrowth tier is the one the game's use of it says.
//
// **The owner's ruling, 2 October 2026** (`docs/a-lighter-game.md`, phase 2): tiers are set by how
// much the game uses a material, not by what the lore says the thing is like. The tier is stored
// in `data/making/crafting.json` so tuning one by hand is one edit -- and this re-sorts every
// material by the rule, so a recipe added or removed that changes what a material is for fails
// here by name until the data says so too. A material moved on purpose is named in
// `REGROWTH_EXCEPTIONS` with its reason; a stale exception fails as well.

import { describe, expect, it } from 'vitest';
import { materials, recipes } from '../src/content/making';
import { homesteads } from '../src/content/homestead';
import { needsOf, tierFor, usesOf } from '../src/content/regrowth';
import { REGROW_DAYS, REGROWTH_EXCEPTIONS } from '../src/content/tiers';

const uses = usesOf(materials, needsOf(recipes, homesteads.flatMap((h) => h.stages)));

describe('regrowth tiers, sorted by use', () => {
  it('stores the tier the rule gives, or a named exception', () => {
    const drift = materials
      .filter((m) => m.regrows !== (REGROWTH_EXCEPTIONS[m.id]?.tier ?? tierFor(uses.get(m.id) ?? 0)))
      .map((m) => `${m.id}: stored ${m.regrows}, the rule says ${tierFor(uses.get(m.id) ?? 0)} (${uses.get(m.id)} uses)`);
    expect(drift, 'update data/making/crafting.json, or name the material in REGROWTH_EXCEPTIONS').toEqual([]);
  });

  it('keeps no exception the rule already agrees with, and none for a material that is gone', () => {
    for (const [id, { tier, why }] of Object.entries(REGROWTH_EXCEPTIONS)) {
      expect(materials.some((m) => m.id === id), `${id} is not a material`).toBe(true);
      expect(tier, `${id} is listed as an exception the rule already gives`).not.toBe(tierFor(uses.get(id) ?? 0));
      expect(why.length, `${id} needs a reason`).toBeGreaterThan(0);
    }
  });

  it('brings back what is used most soonest', () => {
    expect(REGROW_DAYS.quick).toBeLessThan(REGROW_DAYS.steady);
    expect(REGROW_DAYS.steady).toBeLessThan(REGROW_DAYS.slow);
    // The Narmada's bamboo, which the old lore-chosen tiers made slow on the map that needed it.
    expect(materials.find((m) => m.id === 'material_bamboo_cane')?.regrows).toBe('quick');
  });

  it('counts a tagged need as a share, because any of several materials answers it', () => {
    const fibre = materials.filter((m) => (m.classes as string[]).includes('fibre'));
    const once = usesOf(fibre, [{ tag: 'fibre' }]);
    for (const m of fibre) expect(once.get(m.id)).toBeLessThan(1);
  });
});
