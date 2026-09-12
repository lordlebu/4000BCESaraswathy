// @vitest-environment jsdom
//
// A painted plate can be opened, and opening it shows the painting.
//
// **The fault this covers was invisible to every existing test.** Twenty watercolour plates
// shipped, and `test/platesFolder.test.ts` proved the loader found them, and `panels.test.tsx`
// proved the album rendered an entry. Nothing asked how *large* a plate was ever drawn, so nothing
// noticed that a 384-pixel painting was only ever shown at 38 — on the one screen whose whole job
// is looking back over what you have met.
//
// So these assertions are about size and reach rather than about presence: that the thumbnail is a
// control, that pressing it opens the file itself, and that the 277 species without a painting are
// untouched by all of it.

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CollectionPanel } from '../src/ui/CollectionPanel';
import { emptyCollection, metOnTile } from '../src/content/collection';
import { metSpecies } from '../src/content/species';
import { plateFor } from '../src/ui/plates';

afterEach(cleanup);

const noop = () => {};

/** A plated animal and an unplated plant, so both halves are exercised by one render. */
const PLATED = 'river-otter';
const UNPLATED = 'sweet-indigo';

const met = metOnTile(emptyCollection(), {
  creature: { id: PLATED },
  flora: { id: UNPLATED }
});

function album() {
  return render(<CollectionPanel collection={met} open onClose={noop} canAsk={false} />);
}

/**
 * The plate control for a species, and there is more than one of it.
 *
 * **The album lists a species under every ground it lives on**, which the panel says in a comment
 * of its own and is the reason its counts add to more than the collection holds. So a plated
 * animal has a card — and a plate — in each of its biomes, and a `getByRole` here fails with
 * "found multiple" on a panel that is behaving exactly as designed. Any one of them opens the same
 * painting; this takes the first.
 */
function plateControl(name: string): HTMLElement {
  return screen.getAllByRole('button', { name: new RegExp(`${name}.*see the plate`) })[0]!;
}

describe('the fixtures this suite stands on', () => {
  // Both of these are true today and either could stop being true — a plate is a file somebody
  // drops in a folder, and canon renames species. A failure here means the fixture went stale,
  // not that the feature broke, and saying which saves the next reader the hunt.
  it('has a plate for the creature it tests with', () => {
    expect(plateFor(PLATED), `${PLATED} has no plate — pick another plated species`).toBeTruthy();
  });

  it('has no plate for the plant it tests with', () => {
    expect(plateFor(UNPLATED), `${UNPLATED} now has a plate — pick another unplated species`).toBeNull();
  });
});

describe('a plate in the album', () => {
  it('is a control, not just a picture', () => {
    album();
    const name = metSpecies(PLATED)!.name;
    expect(plateControl(name)).toBeTruthy();
  });

  it('opens the painting itself, at the file rather than the thumbnail', () => {
    album();
    const name = metSpecies(PLATED)!.name;
    fireEvent.click(plateControl(name));

    const specimen = screen.getByRole('dialog', { name });
    const shown = specimen.querySelector('img.plate-card-image') as HTMLImageElement | null;
    expect(shown, 'the opened plate is not on screen').not.toBeNull();
    expect(shown!.getAttribute('src')).toBe(plateFor(PLATED));
  });

  it('carries what canon wrote about the animal, under the picture', () => {
    // The painting alone is a picture with no caption. `journalPrompt` has shipped in the bundle
    // from the beginning and has never had a screen wide enough to sit on.
    album();
    const species = metSpecies(PLATED)!;
    fireEvent.click(plateControl(species.name));

    const specimen = screen.getByRole('dialog', { name: species.name });
    expect(specimen.textContent).toContain(species.journalPrompt);
    if (species.binomial) expect(specimen.textContent).toContain(species.binomial);
  });

  it('closes again, and leaves the album standing', () => {
    album();
    const name = metSpecies(PLATED)!.name;
    fireEvent.click(plateControl(name));
    fireEvent.click(screen.getByRole('button', { name: 'Close the plate' }));

    expect(screen.queryByRole('dialog', { name })).toBeNull();
    expect(screen.getByRole('dialog', { name: 'Collection' })).toBeTruthy();
  });

  it('closes on Escape, because it is a modal like the rest', () => {
    album();
    const name = metSpecies(PLATED)!.name;
    fireEvent.click(plateControl(name));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name })).toBeNull();
  });

  it('Escape closes the plate and leaves the album open underneath', () => {
    // **A plate opens over the album, so this is the first time two modals are on screen at
    // once — and the obvious implementation gets it backwards.** Both listen on the window in the
    // capture phase, and capture listeners fire in registration order, so the album's handler runs
    // first and the album closes: a player who pressed Escape to put a picture down loses the
    // screen they were browsing. Only the topmost modal may answer a key.
    album();
    const name = metSpecies(PLATED)!.name;
    fireEvent.click(plateControl(name));
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(screen.queryByRole('dialog', { name }), 'the plate should have closed').toBeNull();
    expect(
      screen.queryByRole('dialog', { name: 'Collection' }),
      'the album closed too — the wrong modal answered Escape'
    ).not.toBeNull();
  });
});

describe('a species without a plate', () => {
  it('offers nothing to open', () => {
    album();
    const name = metSpecies(UNPLATED)!.name;
    expect(screen.queryByRole('button', { name: new RegExp(`${name}.*see the plate`) })).toBeNull();
  });

  it('still keeps its mark and its entry', () => {
    // The point of the `null` return in `PlateButton`: 277 of 297 species are drawn exactly as
    // they were, and the album is not two different lists depending on what has been painted.
    album();
    const species = metSpecies(UNPLATED)!;
    expect(screen.getAllByText(species.name).length).toBeGreaterThan(0);
  });
});
