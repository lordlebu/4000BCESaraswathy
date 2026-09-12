// @vitest-environment jsdom
//
// What is on the tile, at the height the walk is spent in.
//
// **The fault this row answers was invisible to the whole suite.** At peek the dock said the biome
// and the surrounding country and nothing about the ground under the traveller -- no animal, no
// plant, no material -- because `.journal-notes` is `display: none` there and took all of it with
// it. Every test passed throughout: the notes rendered, the strings were right, and nothing asked
// whether a player could see them.
//
// These cases are about the row naming exactly what it was handed. The browser half -- that the row
// is on screen at peek without touching the handle, which is the actual complaint -- is
// `e2e/standing.spec.ts`, because it is a question about layout and jsdom has none.

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { StandingRow } from '../src/ui/StandingRow';
import type { Haul } from '../src/content/gathering';

afterEach(cleanup);

const swift = {
  name: 'Cliff Swift',
  note: 'Swifts cut the air above the grass in long scything arcs.',
  species: {
    id: 'cliff-swift',
    name: 'Cliff Swift',
    binomial: null,
    biomes: ['plains' as const],
    clade: 'bird' as const
  }
};

const oleander = {
  name: 'Poison Oleander',
  note: 'Flowers pink and cheerful on the dry margin.',
  species: {
    id: 'poison-oleander',
    name: 'Poison Oleander',
    binomial: null,
    biomes: ['plains' as const],
    growthForm: 'shrub' as const
  }
};

const nothing = { name: null, note: 'Nothing here.', species: null };

/** A material as `takeableAt` hands it over. */
function haul(id: string, name: string, count = 1): Haul {
  return { material: { id, name, classes: ['plant'], renews: 'seasonal', won_from: [] } as never, count };
}

describe('what is on this ground', () => {
  it('names the creature, the plant and every material', () => {
    render(
      <StandingRow
        creature={swift}
        doing="The cliff swift is feeding, and has not decided yet whether you matter."
        flora={oleander}
        standing={[haul('dung-cake', 'Dung cake'), haul('reed-fibre', 'Reed fibre', 2)]}
      />
    );

    expect(screen.getByText('Cliff Swift')).toBeTruthy();
    expect(screen.getByText('Poison Oleander')).toBeTruthy();
    expect(screen.getByText('Dung cake')).toBeTruthy();
    expect(screen.getByText('Reed fibre')).toBeTruthy();
  });

  it('says what the animal is doing, because that is what decides whether it can be approached', () => {
    // `blockedReason` refuses a stalk on the same fact. It was the single most useful line the fold
    // was hiding, and a row that named the swift without saying it was feeding would have answered
    // the easy half of the complaint.
    render(
      <StandingRow
        creature={swift}
        doing="The cliff swift is feeding, and has not decided yet whether you matter."
        flora={nothing}
        standing={[]}
      />
    );
    expect(screen.getByText('feeding')).toBeTruthy();
  });

  it('keeps the whole line when the routine is not the shape it expects', () => {
    // The fallback matters more than the trim. A sentence `journal.ts` writes differently one day
    // should read slightly long here, never vanish -- a chip that silently stopped reporting
    // whether an animal was awake would be the fold again, in miniature.
    render(
      <StandingRow creature={swift} doing="Sleeping through the heat" flora={nothing} standing={[]} />
    );
    expect(screen.getByText('Sleeping through the heat')).toBeTruthy();
  });

  it('shows how many come up, and only when it is more than one', () => {
    const { container } = render(
      <StandingRow
        creature={nothing}
        doing=""
        flora={nothing}
        standing={[haul('reed-fibre', 'Reed fibre', 2), haul('dung-cake', 'Dung cake')]}
      />
    );
    expect(screen.getByText('×2')).toBeTruthy();
    expect(container.querySelectorAll('.standing-doing')).toHaveLength(1);
  });

  it('renders nothing at all on bare ground', () => {
    // Open sea, or a salt flat nothing grows on. An empty row would be a strip of blank parchment
    // exactly where the tile's contents go, on the tiles that have none.
    const { container } = render(
      <StandingRow creature={nothing} doing="" flora={nothing} standing={[]} />
    );
    expect(container.querySelector('.standing-row')).toBeNull();
  });

  it('draws a chip for the half of a tile that has something', () => {
    const { container } = render(
      <StandingRow creature={nothing} doing="" flora={oleander} standing={[]} />
    );
    expect(container.querySelectorAll('.standing')).toHaveLength(1);
    expect(screen.getByText('Poison Oleander')).toBeTruthy();
  });

  it('is a readout, not a second set of buttons', () => {
    // **The correction to the plan that asked for this.** Every chip as a target put the take in two
    // places forty pixels apart -- the arrangement `TileActions` exists to have ended -- and cost
    // the row the 44px tap floor per chip, which pushed the third one out of the dock at peek on a
    // 390px phone. The row says what is here; the rail says what you can do about it.
    const { container } = render(
      <StandingRow
        creature={swift}
        doing="The cliff swift is feeding."
        flora={oleander}
        standing={[haul('dung-cake', 'Dung cake')]}
      />
    );
    expect(container.querySelectorAll('button')).toHaveLength(0);
  });
});
