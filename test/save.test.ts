// @vitest-environment jsdom
//
// Saved journeys.
//
// There was no test here until the shape changed, which is the wrong order: the save is the one
// thing in the game that outlives the session, and a mistake in it is a mistake in somebody's
// walk rather than in a render. The version bump is what protects that, so the version bump is
// what these check.

import { afterEach, describe, expect, it } from 'vitest';

import { KNOWLEDGE_VERSION, SAVE_VERSION, clearJourney, hasBegun, loadJourney, saveJourney } from '../src/save';
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

/**
 * Which events have already happened.
 *
 * **Added without bumping `SAVE_VERSION`, following `characterId`'s precedent** — absent means
 * "none so far", which is true of every journey written before events existed. A bump would have
 * discarded every save in the world to record an empty list, and throwing away progress to
 * remember nothing is the wrong trade.
 */
describe('seenEvents', () => {
  it('reads as none when a save predates events entirely', () => {
    localStorage.setItem(
      'south-of-tethys:old',
      JSON.stringify({ version: SAVE_VERSION, discovered: ['1,1'], collection: {}, reached: false })
    );
    expect(loadJourney('old').seenEvents).toEqual([]);
    // And the rest of that journey still loads, which is the whole point of not bumping.
    expect(loadJourney('old').discovered).toEqual(['1,1']);
  });

  it('survives a round trip', () => {
    saveJourney('trip', {
      discovered: [],
      collection: {},
      reached: false,
      seenEvents: ['event_a', 'event_b']
    });
    expect(loadJourney('trip').seenEvents).toEqual(['event_a', 'event_b']);
  });

  /**
   * **A non-string must never reach `canHappen`.** It would compare unequal to every id, so every
   * `once` event the player has already had would quietly come round again — the kind of fault
   * that looks like a content bug and is a parsing one.
   */
  it('keeps only strings, whatever was stored', () => {
    localStorage.setItem(
      'south-of-tethys:junk',
      JSON.stringify({
        version: SAVE_VERSION,
        discovered: [],
        collection: {},
        reached: false,
        seenEvents: ['event_a', 42, null, { id: 'event_b' }]
      })
    );
    expect(loadJourney('junk').seenEvents).toEqual(['event_a']);
  });

  it('reads a non-list as none rather than as something', () => {
    localStorage.setItem(
      'south-of-tethys:wrong',
      JSON.stringify({ version: SAVE_VERSION, discovered: [], collection: {}, reached: false, seenEvents: 'event_a' })
    );
    expect(loadJourney('wrong').seenEvents).toEqual([]);
  });
});

describe('the ground moving keeps what you know', () => {
  /**
   * **Why the save has two halves.** Most of the eighteen `SAVE_VERSION` bumps were the ground
   * moving, and each one threw away the diary along with the fog. Now a ground bump empties only
   * the half that names tiles.
   */
  const known = {
    collection: { saltreed: { id: 'saltreed', kind: 'flora' } },
    progress: { ...emptyProgress(), words: ['word_kia_tide'] },
    satchel: { material_reed_fibre: 3 },
    travelled: 5_000,
    seenEvents: ['woven:dream:wetland'],
    met: ['field_map_lothal:company_carrier'],
    characterId: 'mithra'
  };

  it('keeps the diary, the satchel and the people met when only the ground moved', () => {
    writeRaw({
      version: SAVE_VERSION - 1,
      knowledgeVersion: KNOWLEDGE_VERSION,
      discovered: ['3,4'],
      reached: true,
      nodes: { '3,4': { left: 0, day: 1 } },
      ...known
    });
    const back = loadJourney(SEED);
    expect(back.progress.words).toEqual(['word_kia_tide']);
    expect(back.collection.saltreed).toEqual({ id: 'saltreed', kind: 'flora' });
    expect(back.satchel).toEqual({ material_reed_fibre: 3 });
    expect(back.seenEvents).toEqual(['woven:dream:wetland']);
    expect(back.met).toEqual(['field_map_lothal:company_carrier']);
    expect(back.travelled).toBe(5_000);
    expect(back.characterId).toBe('mithra');
    // And forgets exactly the tiles, which name ground that is not there any more.
    expect(back.discovered).toEqual([]);
    expect(back.reached).toBe(false);
    expect(back.nodes).toEqual({});
    // A journey whose fog was reset but whose clock ran is still one somebody is on.
    expect(hasBegun(back)).toBe(true);
  });

  it('keeps the fog when only what-you-know changed shape', () => {
    writeRaw({ version: SAVE_VERSION, knowledgeVersion: KNOWLEDGE_VERSION + 1, discovered: ['3,4'], reached: true, ...known });
    const back = loadJourney(SEED);
    expect(back.discovered).toEqual(['3,4']);
    expect(back.progress).toEqual(emptyProgress());
    expect(back.satchel).toEqual({});
  });

  it('reads a save from before the split as knowledge version 1', () => {
    // Written by the build before this one: `version` 18 and no `knowledgeVersion` at all.
    writeRaw({ version: 18, discovered: ['1,1'], reached: false, ...known });
    const back = loadJourney(SEED);
    expect(back.progress.words).toEqual(['word_kia_tide']);
    expect(back.discovered).toEqual(SAVE_VERSION === 18 ? ['1,1'] : []);
  });

  it('stamps both versions on every save it writes', () => {
    saveJourney(SEED, { discovered: [], collection: {}, reached: false, met: ['a:b'] });
    const raw = JSON.parse(localStorage.getItem(`south-of-tethys:${SEED}`)!);
    expect(raw.version).toBe(SAVE_VERSION);
    expect(raw.knowledgeVersion).toBe(KNOWLEDGE_VERSION);
    expect(loadJourney(SEED).met).toEqual(['a:b']);
  });
});
