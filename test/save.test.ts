// @vitest-environment jsdom
//
// Saved journeys.
//
// There was no test here until the shape changed, which is the wrong order: the save is the one
// thing in the game that outlives the session, and a mistake in it is a mistake in somebody's
// walk rather than in a render. The version bump is what protects that, so the version bump is
// what these check.

import { afterEach, describe, expect, it } from 'vitest';

import { SAVE_VERSION, clearJourney, hasBegun, loadJourney, saveJourney } from '../src/save';
import { emptyCollection, metOnTile } from '../src/content/collection';
import { emptyProgress } from '../src/journey';

const SEED = 'save-test';

afterEach(() => {
  clearJourney(SEED);
});

/** Write a payload straight to storage, bypassing `saveJourney`, to imitate an older build. */
function writeRaw(payload: unknown): void {
  localStorage.setItem(`south-of-tethys:${SEED}`, JSON.stringify(payload));
}

describe('a journey survives a round trip', () => {
  it('comes back as it went in', () => {
    const collection = metOnTile(emptyCollection(), {
      creature: { id: 'river-otter' },
      flora: { id: 'sweet-indigo' }
    });
    saveJourney(SEED, {
      discovered: ['1,2'],
      collection,
      reached: true,
      progress: emptyProgress()
    });

    const back = loadJourney(SEED);
    expect(back.collection).toEqual(collection);
    expect(back.reached).toBe(true);
    expect(back.discovered).toEqual(['1,2']);
  });

  it('starts empty when nothing was ever written', () => {
    expect(loadJourney('never-walked').collection).toEqual({});
  });
});

describe('an older save is discarded rather than misread', () => {
  /**
   * The reason `SAVE_VERSION` went to 6.
   *
   * Version 5 stored `observed: string[]` -- creature *names*. Reading one of those into a
   * record keyed by species id would produce an album of entries whose ids are prose, none of
   * which resolve to a species, so every one would render blank. Discarding is the honest
   * outcome, and it is what the file has always promised.
   */
  it('throws away a version 5 save with its list of names', () => {
    writeRaw({
      version: 5,
      discovered: ['3,4'],
      observed: ['River Otter', 'Monsoon Crane'],
      reached: true,
      progress: emptyProgress()
    });

    const back = loadJourney(SEED);
    expect(back.version).toBe(SAVE_VERSION);
    expect(back.collection).toEqual({});
    expect(back.discovered).toEqual([]);
    expect(back.reached).toBe(false);
  });

  it('throws away anything that is not JSON at all', () => {
    localStorage.setItem(`south-of-tethys:${SEED}`, 'not json {');
    expect(loadJourney(SEED).collection).toEqual({});
  });

  /**
   * `localStorage` is editable by anyone with a browser console, so a save at the right version
   * can still hold nonsense. It is repaired rather than trusted.
   */
  it('repairs a current-version save whose collection is malformed', () => {
    writeRaw({
      version: SAVE_VERSION,
      discovered: [],
      collection: { 'river-otter': { kind: 'not-a-kind' }, saltreed: { kind: 'flora' } },
      reached: false,
      progress: emptyProgress()
    });

    const back = loadJourney(SEED);
    expect(back.collection['river-otter']).toBeUndefined();
    expect(back.collection.saltreed).toEqual({ id: 'saltreed', kind: 'flora' });
  });
});

describe('whether a journey has begun', () => {
  /**
   * What the front door asks before offering *continue*.
   *
   * **Fog is the test, because it is the earliest thing to move.** `discovered` fills as the
   * traveller walks, before a rung is climbed or anything is picked up — so ten steps and
   * nothing found still counts as begun, which is what somebody who walked ten steps expects.
   * Progress, the satchel and the collection all lag it, and any of them would offer to start
   * over on a walk somebody was in the middle of.
   */
  it('is false for a save nobody has walked', () => {
    expect(hasBegun(loadJourney('nobody-walked-this-one'))).toBe(false);
  });

  it('is true as soon as a single tile is uncovered', () => {
    const seed = 'begun-by-walking';
    saveJourney(seed, { discovered: ['3,4'], collection: {}, reached: false });
    expect(hasBegun(loadJourney(seed))).toBe(true);
  });

  /**
   * The clock counts too: a traveller can stand still and let the hours pass, because resting
   * at a camp moves `travelled` without moving anybody.
   */
  it('is true for a journey that only rested', () => {
    const seed = 'begun-by-resting';
    saveJourney(seed, { discovered: [], collection: {}, reached: false, travelled: 90_000 });
    expect(hasBegun(loadJourney(seed))).toBe(true);
  });
});
