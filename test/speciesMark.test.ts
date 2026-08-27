// Every species gets a mark, and the marks come from canon.
//
// This replaces `bodyPlan.test.ts` and `growthForm.test.ts`, which guarded two keyword classifiers
// that no longer exist. Those tests were mostly assertions that a particular name produced a
// particular answer — *Baurusuchus* is a crocodilian, `Herpestes` is not a crab — and every one of
// them is now canon's problem, checked by `lint_story.py` against `clades.json` and
// `growth_forms.json` before the bundle is ever built.
//
// What is left for this side is narrower and worth more: the game has two lookup tables, and the
// only way they can fail is by not covering something canon says. That is what these check.

import { describe, expect, it } from 'vitest';
import speciesBundle from '../data/canon/species.json';
import { creatures, flora } from '../src/content/species';
import { CLADE_MARK, FORM_MARK } from '../src/ui/SpeciesIcon';
import { plateFor } from '../src/ui/plates';

const bundle = speciesBundle as {
  fauna: { name: string; clade?: string }[];
  flora: { name: string; growth_form?: string }[];
};

// Imported from the component rather than copied here, so a table edited in one place and not the
// other cannot pass.
const marks = { CLADE_MARK, FORM_MARK } as {
  CLADE_MARK: Record<string, string>;
  FORM_MARK: Record<string, string>;
};

describe('canon says what a species is, and the game only chooses a glyph', () => {
  it('gives every animal in canon a clade the game can draw', () => {
    // The failure this catches: canon adds a seventeenth clade, the bundle ships it, and the game
    // renders `undefined` into the panel. TypeScript cannot see it because the bundle is JSON.
    const used = new Set(bundle.fauna.map((f) => f.clade));
    expect(used.size).toBeGreaterThan(10);
    for (const clade of used) {
      expect(clade, 'canon shipped a fauna with no clade').toBeTruthy();
      expect(marks.CLADE_MARK?.[clade!], `no mark for clade '${clade}'`).toBeTruthy();
    }
  });

  it('gives every plant in canon a growth form the game can draw', () => {
    const used = new Set(bundle.flora.map((f) => f.growth_form));
    expect(used.size).toBeGreaterThan(8);
    for (const form of used) {
      expect(form, 'canon shipped a flora with no growth form').toBeTruthy();
      expect(marks.FORM_MARK?.[form!], `no mark for growth form '${form}'`).toBeTruthy();
    }
  });

  it('carries the field onto every runtime record', () => {
    // The adapter is the seam where canon becomes the game, and a species that loses its clade
    // there is invisible until something tries to draw it.
    for (const c of creatures) expect(c.clade, c.name).toBeTruthy();
    for (const p of flora) expect(p.growthForm, p.name).toBeTruthy();
  });

  it('does not give two clades the same mark', () => {
    // Splitting `crocodilian` out of `reptile` was the point of half this work; drawing them
    // identically would undo it silently.
    const values = Object.values(marks.CLADE_MARK ?? {});
    expect(new Set(values).size).toBe(values.length);
  });

  it('reads the clade rather than the name', () => {
    // The regression that matters, stated as a property rather than a list of species.
    //
    // Six animals were once drawn wrong because their *names* were read: an Asura-tainted owl, a
    // Camelosuchus calf, a Silvanus dinosaurid, and three Herpestes mongooses named for their
    // prey. All six are ordinary now, and the proof is that their marks match their clade-mates
    // and owe nothing to what they are called.
    const byName = new Map(creatures.map((c) => [c.name, c]));
    const pairs: [string, string][] = [
      ['Asura-Tainted Owl', 'bird'],
      ['Camelosuchus Calf', 'crocodilian'],
      ['Iridescent Lothal Silvanus', 'bird'],
      ['Mangrove Crab-Eater', 'mammal'],
      ['Vindhya Centipede-Eater', 'mammal'],
      ['Honey-Guide Bird', 'bird']
    ];
    for (const [name, clade] of pairs) {
      const c = byName.get(name);
      expect(c, `${name} is not in the bundle`).toBeTruthy();
      expect(c!.clade, name).toBe(clade);
    }
  });
});

describe('a painted plate beats a glyph', () => {
  // The bug: twenty animals have watercolour plates and the collection showed every one of them
  // as a paw print, because the plate lookup lived only in `JournalPanel`. The plates appeared
  // once, at the moment of meeting, and never again on the screen built for looking back.

  it('has a plate file for a species the game actually carries', () => {
    // Guards the join, which is where this would fail silently: plates are keyed by *engine* id
    // (`desert-fox`), and canon's ids are `fauna_desert_fox`. A change to `engineId` that stopped
    // matching would not throw -- every plate would simply stop resolving and every animal would
    // quietly go back to being an emoji.
    const withPlates = creatures.filter((c) => plateFor(c.id) !== null);
    expect(withPlates.length, 'no runtime species resolves a plate — the ids have drifted').toBeGreaterThan(10);
  });

  it('never leaves a species with neither plate nor mark', () => {
    for (const c of creatures) {
      const has = plateFor(c.id) !== null || Boolean(CLADE_MARK[c.clade]);
      expect(has, `${c.name} would render as nothing`).toBe(true);
    }
  });
});
