// Every discovery canon puts at a place is offered there.
//
// **Eighteen were not, at 26 places, and every discovery on the Aravali among them.** Canon attaches
// a discovery to a place from two sides -- the place's `discoveries` list and the discovery's own
// `found_at` -- and the place panel read only the first. The Overworld reads the second, so it
// counted them toward a map's progress while no player could ever look at one. Canon's playability
// check also reads `found_at`, and passed. Found by `test/minutes.test.ts`, which gave the Aravali
// zero rungs.

import { describe, expect, it } from 'vitest';
import { discoveries, offeredAt } from '../src/content/knowledge';
import { fieldMap, poi } from '../src/content/places';

describe('what a place offers to look at', () => {
  it('offers every discovery whose found_at names the place', () => {
    const missing: string[] = [];
    for (const d of discoveries) {
      for (const poiId of d.foundAt) {
        const place = poi(poiId);
        if (!place) continue;
        if (!offeredAt(place.id, place.discoveries).includes(d.id)) missing.push(`${d.id} at ${poiId}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('keeps the place’s own order first, and lists nothing twice', () => {
    for (const d of discoveries) {
      for (const poiId of d.foundAt) {
        const place = poi(poiId);
        if (!place) continue;
        const offered = offeredAt(place.id, place.discoveries);
        expect(offered.slice(0, place.discoveries.length)).toEqual(place.discoveries);
        expect(new Set(offered).size, `${poiId} offers something twice`).toBe(offered.length);
      }
    }
  });

  it('gives the Aravali something to look at', () => {
    const offered = (fieldMap('field_map_aravali')?.pointsOfInterest ?? []).flatMap((id) =>
      offeredAt(id, poi(id)?.discoveries ?? [])
    );
    expect(offered.length, 'the Aravali still offers nothing').toBeGreaterThan(0);
  });
});
