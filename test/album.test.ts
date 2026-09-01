// Finding one species among two hundred.
//
// The album holds 145 to 193 distinct species on a single map, so the two flat lists it had were
// fine at twenty and a wall at two hundred. These check the two things that fix it, and both are
// pure functions precisely so they can be checked here rather than through a rendered panel.

import { describe, expect, it } from 'vitest';
import { byBiome, matches } from '../src/content/album';
import { creatures, flora } from '../src/content/canon';
import { TERRAIN_ORDER } from '../src/game/frames';
import type { Meeting } from '../src/content/collection';

const met = (id: string, kind: 'creature' | 'flora' = 'creature'): Meeting => ({ id, kind });

/** Everything placeable, as though a very thorough player had met all of it. */
const everything: Meeting[] = [
  ...creatures.filter((c) => c.placement !== 'lore').map((c) => met(c.id, 'creature')),
  ...flora.filter((f) => f.placement !== 'lore').map((f) => met(f.id, 'flora'))
];

describe('searching the album', () => {
  it('finds a thing by its name', () => {
    const anything = creatures.find((c) => c.placement !== 'lore')!;
    expect(matches(met(anything.id), anything.name)).toBe(true);
    expect(matches(met(anything.id), 'zzzzzz')).toBe(false);
  });

  it('finds a plant by a name canon does not file it under', () => {
    // **The failure this exists for.** Canon calls the strychnine tree `Kuchla`, and a player who
    // knows it as nux-vomica found nothing at all -- which is why `aliases` went into canon. A
    // search that read only the name would reintroduce exactly that.
    const kuchla = flora.find((f) => f.id === 'nux-vomica' || f.name === 'Kuchla');
    expect(kuchla, 'canon should still hold the strychnine tree').toBeTruthy();
    expect(kuchla!.aliases.length, 'and it should still carry its other names').toBeGreaterThan(0);
    expect(matches(met(kuchla!.id, 'flora'), 'nux-vom')).toBe(true);
  });

  it('matches inside a word, not only at the start', () => {
    // Somebody searching "vomica" should find "Strychnos nux-vomica". Requiring them to start at
    // the beginning of a binomial is asking them to know the answer first.
    const kuchla = flora.find((f) => f.name === 'Kuchla')!;
    expect(matches(met(kuchla.id, 'flora'), 'vomica')).toBe(true);
  });

  it('ignores case and surrounding space', () => {
    const kuchla = flora.find((f) => f.name === 'Kuchla')!;
    expect(matches(met(kuchla.id, 'flora'), '  KUCHLA ')).toBe(true);
  });

  it('an empty query matches everything, so the album is not empty before you type', () => {
    expect(everything.every((m) => matches(m, ''))).toBe(true);
    expect(everything.every((m) => matches(m, '   '))).toBe(true);
  });

  it('a species the game does not know matches nothing rather than throwing', () => {
    // `localStorage` is editable by anyone with a console, and a collection can outlive a
    // species canon retired.
    expect(matches(met('not-a-species'), 'anything')).toBe(false);
  });
});

describe('grouping the album by ground', () => {
  it('puts a species under every biome it lives on', () => {
    // Not just the first. A mangrove crab is a fact about the wetland *and* the coast, and
    // picking one would make the other list wrong for somebody asking about that ground.
    const multi = creatures.find((c) => c.placement !== 'lore' && c.biomes.length > 1)!;
    const groups = byBiome([met(multi.id)], TERRAIN_ORDER);
    expect(groups.length).toBe(multi.biomes.length);
    for (const group of groups) {
      expect(multi.biomes).toContain(group.id);
    }
  });

  it('leaves out a biome nothing has been met in', () => {
    // An empty heading costs a line and says nothing.
    const one = creatures.find((c) => c.placement !== 'lore')!;
    const groups = byBiome([met(one.id)], TERRAIN_ORDER);
    expect(groups.length).toBeLessThan(TERRAIN_ORDER.length);
    expect(groups.every((g) => g.members.length > 0)).toBe(true);
  });

  it('keeps the order the map and the legend already use', () => {
    const groups = byBiome(everything, TERRAIN_ORDER);
    const seen = groups.map((g) => g.id).filter((id) => TERRAIN_ORDER.includes(id as never));
    const expected = TERRAIN_ORDER.filter((b) => seen.includes(b));
    expect(seen).toEqual(expected);
  });

  it('names each group the way the legend does', () => {
    const groups = byBiome(everything, TERRAIN_ORDER);
    const wetland = groups.find((g) => g.id === 'wetland');
    expect(wetland?.name).toBe('Wetland');
  });

  it('loses nothing: every species met appears somewhere', () => {
    // The one property that matters. An album that quietly drops entries is worse than a flat
    // list, because a player cannot tell it happened.
    const groups = byBiome(everything, TERRAIN_ORDER);
    const placed = new Set(groups.flatMap((g) => g.members.map((m) => m.id)));
    expect(placed.size).toBe(new Set(everything.map((m) => m.id)).size);
  });

  it('gives ground the caller forgot a heading rather than dropping it', () => {
    // A new biome must not vanish from the album by being missing from one list.
    const groups = byBiome(everything, ['plains']);
    expect(groups.length).toBeGreaterThan(1);
    expect(groups[0]!.id).toBe('plains');
  });
});
