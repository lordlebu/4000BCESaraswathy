// Which regrowth tier a material belongs in, by how much the game uses it.
//
// **The owner's ruling, 2 October 2026** (`docs/a-lighter-game.md`, phase 2): the tiers were canon's
// `renews`, chosen by what a thing is like in the world -- a fossil needs another age of rock,
// sandalwood takes years -- which made bamboo slow on the map that needed it most. Now the game
// counts what asks for each material: a recipe ingredient or a building-stage need that names it,
// and a fraction for each tagged need it could fill. The answer is stored in the data, and
// `test/regrowth.test.ts` re-runs this to fail on a drift; a material moved by hand is named in
// `REGROWTH_EXCEPTIONS` with its reason.
//
// Pure, and free of React and Phaser.

import type { Material, Recipe, Regrowth } from './making';
import { REGROWTH_RULE } from './tiers';

/** Something that needs materials: a recipe's ingredients, or a building stage's needs. */
export interface Need {
  id?: string | null;
  material?: string | null;
  tag?: string | null;
}

/** How much the game uses each material, from every recipe and building-stage need. */
export function usesOf(materials: readonly Material[], needs: readonly Need[]): Map<string, number> {
  const uses = new Map(materials.map((m) => [m.id, 0]));
  for (const need of needs) {
    const named = need.material ?? need.id ?? null;
    if (named && uses.has(named)) uses.set(named, uses.get(named)! + 1);
    if (need.tag) {
      const kind = need.tag.replace(/^#/, '');
      for (const m of materials) if ((m.classes as string[]).includes(kind)) uses.set(m.id, uses.get(m.id)! + REGROWTH_RULE.tagged);
    }
  }
  return uses;
}

/** The tier a use count puts a material in. */
export function tierFor(uses: number): Regrowth {
  if (uses >= REGROWTH_RULE.quickFrom) return 'quick';
  if (uses >= REGROWTH_RULE.steadyFrom) return 'steady';
  return 'slow';
}

/** Every need in the game that asks for a material: recipe ingredients and building stages. */
export function needsOf(recipes: readonly Recipe[], stages: readonly { needs: readonly Need[] }[]): Need[] {
  return [
    ...recipes.flatMap((r) => r.ingredients.map((i) => ({ material: i.material ?? null, id: i.item ?? null, tag: i.tag ?? null }))),
    ...stages.flatMap((s) => s.needs)
  ];
}
