// Which painting an activity shows.
//
// **The variant exists because resting is not one thing.** The rules layer already models four
// shelter kinds — a roof, a camp, a bedroll, and sitting the night out — and painting all four as
// the same mat on open ground would flatten a distinction the game makes everywhere else. So a
// camp gets the camp painting and everything else falls back.
//
// Runs under Node. `scenes.ts` reads an `import.meta.glob`, which Vitest resolves the same way
// Vite does, so this is asserting against the real folder rather than a mock — if a file is
// renamed or dropped, this notices.

import { describe, expect, it } from 'vitest';
import { sceneFor } from '../src/ui/scenes';

describe('the painting an activity shows', () => {
  it('has one for every gesture', () => {
    // The four the modal can open with. A missing one is legal at runtime and would show a blank
    // panel; this says they are all actually here now, so a deletion is caught.
    for (const gesture of ['stoop', 'stalk', 'work', 'rest']) {
      expect(sceneFor(gesture), `${gesture} has no painting`).toBeTruthy();
    }
  });

  it('gives a camp its own night, and everything else the plain one', () => {
    const camp = sceneFor('rest', 'camp');
    const plain = sceneFor('rest');
    expect(camp, 'a camp has no painting of its own').toBeTruthy();
    expect(camp, 'a camp is being painted as open ground').not.toBe(plain);
  });

  /**
   * **A variant with no painting falls back rather than failing.**
   *
   * This is what makes `rest-roof.png` a file and no code the day somebody paints it — and the
   * first version of this test asserted the opposite of its own comment. It named `roof` among
   * the kinds that fall back, so **painting `rest-roof.png` broke it**, and the failure read as a
   * regression in the loader rather than as art arriving. A test that pins which files exist
   * cannot also be the test that says a new file needs no code.
   *
   * So it asserts the invariant instead: every shelter kind resolves to *something*, and that
   * something is either its own painting or the plain one. That holds however many of the six
   * have been painted, which is the property worth guarding.
   */
  it('falls back to the gesture when a variant has no painting', () => {
    const plain = sceneFor('rest');
    for (const shelter of ['palace', 'settlement', 'roof', 'camp', 'tent', 'bedroll', 'none']) {
      const shown = sceneFor('rest', shelter);
      expect(shown, `${shelter} showed nothing`).toBeTruthy();
      if (shown !== plain) {
        expect(shown, `${shelter} showed a painting that is not its own`).toContain(
          `rest-${shelter}`
        );
      }
    }
  });

  /** And a variant nobody will ever paint still falls back rather than throwing. */
  it('falls back for a variant that does not exist at all', () => {
    expect(sceneFor('rest', 'not-a-shelter-kind')).toBe(sceneFor('rest'));
  });

  /**
   * **A knapping bench and a quarry both show the striking hands.**
   *
   * `work.png` was a grain harvest for three weeks while the hammerstone take sat unused beside it,
   * so every flint bench in the game showed winnowing and nothing failed. The harvest is now the
   * plains take it is a picture of. This pins the pair apart, and pins that the bench -- which
   * asks for `work-knapping` -- reaches the knapping plate by falling back rather than by a file.
   */
  it('shows knapping for work, and keeps the harvest for a take on the plains', () => {
    const work = sceneFor('work');
    expect(work).toContain('/work.png');
    expect(sceneFor('work', 'knapping')).toBe(work);
    expect(sceneFor('stoop', 'plains')).toContain('stoop-plains');
    expect(sceneFor('stoop', 'mountains')).toContain('stoop-high');
  });

  /** The cliff painting is for climbing ground, and a floating island's underside is climbed. */
  it('shows the cliff on the underside of a floating island, and not on its top', () => {
    expect(sceneFor('stoop', 'sky_underside')).toContain('stoop-high');
    expect(sceneFor('stoop', 'sky_island')).toContain('stoop-sky_island');
  });

  /**
   * A night is two pictures: the dark while you choose it, the light once it is over. A shelter
   * with neither painted falls back to its own night, then to the plain one.
   */
  it('paints a night at midnight and at dawn, and falls back when a moment is unpainted', () => {
    expect(sceneFor('rest', 'none', 0, 'midnight')).toContain('rest-none-midnight');
    expect(sceneFor('rest', 'none', 0, 'dawn')).toContain('rest-none-dawn');
    expect(sceneFor('rest', 'camp', 0, 'dawn')).toBe(sceneFor('rest', 'camp'));
    expect(sceneFor('rest', 'not-a-shelter-kind', 0, 'dawn')).toBe(sceneFor('rest'));
  });

  it('answers null for a gesture nobody has painted', () => {
    expect(sceneFor('dance')).toBeNull();
    expect(sceneFor('dance', 'quickly')).toBeNull();
  });
});
