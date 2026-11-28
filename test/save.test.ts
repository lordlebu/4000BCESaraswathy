// @vitest-environment jsdom
//
// Saved journeys.
//
// There was no test here until the shape changed, which is the wrong order: the save is the one
// thing in the game that outlives the session, and a mistake in it is a mistake in somebody's
// walk rather than in a render. The version bump is what protects that, so the version bump is
// what these check.

import { afterEach, describe, expect, it } from 'vitest';

import { SAVE_VERSION, hasBegun, loadJourney, saveJourney } from '../src/save';
import { emptyProgress } from '../src/journey';
import { hasLeftArrival } from '../src/content/encounterState';
import { eraseRetiredStorage, journeyStorageKey, LAST_SEED_KEY, worldStorageKey } from '../src/storageKeys';

const SEED = 'save-test';

afterEach(() => {
  localStorage.clear();
});

/** Write a payload straight to storage, bypassing `saveJourney`, to imitate an older build. */
function writeRaw(payload: unknown): void {
  localStorage.setItem(journeyStorageKey(SEED), JSON.stringify(payload));
}

describe('current journeys', () => {
  it('round trips every part of a snapshot, including a pending wagon after arrival', () => {
    const journey = {
      ...loadJourney(SEED),
      characterId: 'enkidu',
      fieldMapId: 'field_map_dwarka',
      discovered: ['1,2'],
      reached: true,
      collection: { saltreed: { id: 'saltreed', kind: 'flora' as const } },
      progress: { ...emptyProgress(), words: ['word_kia_thal'] },
      satchel: { material_reed: 3 },
      nodesByMap: { field_map_dwarka: { '12,30,material_reed': { left: 1, day: 1 } } },
      travelled: 90_000,
      seenEvents: ['woven:dream:wetland'],
      met: ['field_map_dwarka:company_carrier'],
      eventDays: { 'woven:dream:wetland': 0 },
      flags: ['sheltered:somebody'],
      pinned: 'recipe_reed_rope',
      diaryEvents: [{
        id: 'sighting-1', eventId: 'woven:dream:wetland', origin: 'happening' as const,
        title: 'By the water', prose: 'Reeds.', choiceId: 'watch', choiceLabel: 'Watch',
        outcome: 'It passes.', day: 0, fieldMapId: 'field_map_dwarka',
        art: { collection: 'places' as const, key: 'kind-wilderness', take: 0 }
      }],
      encounters: {
        map: 'field_map_dwarka', arrival: { x: 2, y: 2 }, leftArrival: true, roadDay: 1,
        pending: [{ kind: 'wagon' as const, id: 'sinauli', vehicle: 'sinauli-wagon', at: { x: 5, y: 2 } }]
      }
    };
    saveJourney(SEED, journey);
    expect(loadJourney(SEED)).toEqual(journey);
    expect(hasBegun(loadJourney(SEED))).toBe(true);
  });

  it('discards old versions wholesale even when stored at the new key', () => {
    writeRaw({ ...loadJourney(SEED), version: SAVE_VERSION - 1, discovered: ['3,4'],
      fieldMapId: 'field_map_dwarka', flags: ['known'], travelled: 9 });
    expect(hasBegun(loadJourney(SEED))).toBe(false);
    expect(loadJourney(SEED)).toMatchObject({ discovered: [], flags: [], travelled: 0 });
    expect(localStorage.getItem(journeyStorageKey(SEED))).toBeNull();
  });

  it('discards incomplete and corrupt snapshots', () => {
    writeRaw({ version: SAVE_VERSION, discovered: ['3,4'], travelled: 9 });
    expect(hasBegun(loadJourney(SEED))).toBe(false);
    localStorage.setItem(journeyStorageKey(SEED), 'not-json');
    expect(hasBegun(loadJourney(SEED))).toBe(false);
    expect(localStorage.getItem(journeyStorageKey(SEED))).toBeNull();
  });

  it('retains current data and preferences while removing the retired namespace', () => {
    const kept = [journeyStorageKey(SEED), worldStorageKey(SEED, 'field_map_dwarka'), LAST_SEED_KEY,
      'varuna:showing', 'other-app:journey'];
    const retired = [`south-of-tethys:${SEED}`, `south-of-tethys:world:${SEED}:field_map_dwarka`, 'south-of-tethys:last-seed'];
    for (const key of [...kept, ...retired]) localStorage.setItem(key, 'present');
    expect(eraseRetiredStorage(localStorage)).toBe(true);
    expect(eraseRetiredStorage(localStorage)).toBe(false);
    for (const key of kept) expect(localStorage.getItem(key)).toBe('present');
    for (const key of retired) expect(localStorage.getItem(key)).toBeNull();
  });

  it('unlocks sightings three tiles from arrival, including diagonals', () => {
    const arrival = { x: 6, y: 8 };
    expect(hasLeftArrival(arrival, arrival)).toBe(false);
    expect(hasLeftArrival(arrival, { x: 8, y: 10 })).toBe(false);
    expect(hasLeftArrival(arrival, { x: 3, y: 8 })).toBe(true);
    expect(hasLeftArrival(arrival, { x: 9, y: 11 })).toBe(true);
  });
});
