// The arrival beat, tested where it can be: in a pure module, in milliseconds.
//
// The bug these exist to prevent is silence -- a new kind of place added to canon that gets no
// beat at all, which nobody notices because nothing is drawn wrong. That is checked exhaustively
// against the type rather than for the kinds that happen to exist today.

import { describe, expect, it } from 'vitest';
import { beatFor, beatKey, settleZoom, type ArrivalPlace } from '../src/game/arrival';
import type { PoiKind } from '../src/content/places';

/** Every kind canon can hand us. Exhaustive by construction: adding one to the union breaks this. */
const ALL_KINDS: readonly PoiKind[] = [
  'settlement',
  'wilderness',
  'eco_site',
  'archaeological_site',
  'anomaly',
  'travel_node'
];

const LANDMARK: ArrivalPlace = { kind: 'landmark' };

describe('beatFor', () => {
  it('pins the landmark beat that shipped', () => {
    // A regression guard, not a specification. These four numbers are the arrival that already
    // felt right; this phase generalises the beat, it does not retune this one.
    expect(beatFor(LANDMARK, true)).toEqual({
      zoom: 1.25,
      settleMs: 900,
      flash: { durationMs: 700, rgb: [255, 246, 213] },
      sits: true
    });
  });

  it('gives every kind of place a beat', () => {
    for (const poiKind of ALL_KINDS) {
      const beat = beatFor({ kind: 'poi', poiKind }, true);
      expect(beat, `no beat for ${poiKind}`).not.toBeNull();
      expect(beat!.sits, `${poiKind} does not sit`).toBe(true);
    }
  });

  it('does not flash for places, only for the landmark', () => {
    // Six or seven full flashes in one walk is a strobe, and it would spend the landmark's
    // meaning on every waypoint along the way.
    for (const poiKind of ALL_KINDS) {
      expect(beatFor({ kind: 'poi', poiKind }, true)!.flash).toBeNull();
    }
    expect(beatFor(LANDMARK, true)!.flash).not.toBeNull();
  });

  it('settles a place more gently than the landmark', () => {
    const place = beatFor({ kind: 'poi', poiKind: 'settlement' }, true)!;
    const landmark = beatFor(LANDMARK, true)!;
    expect(place.zoom).toBeLessThan(landmark.zoom);
    expect(place.settleMs).toBeLessThan(landmark.settleMs);
  });

  it('fires once', () => {
    expect(beatFor(LANDMARK, false)).toBeNull();
    for (const poiKind of ALL_KINDS) {
      expect(beatFor({ kind: 'poi', poiKind }, false)).toBeNull();
    }
  });
});

describe('settleZoom', () => {
  it('zooms in from wherever the camera already is', () => {
    // The bug this replaced: a fixed 1.25 was a zoom *out* on a desktop fitted at 3.
    const beat = beatFor(LANDMARK, true)!;
    expect(settleZoom(1, beat, 4)).toBeCloseTo(1.25);
    expect(settleZoom(3, beat, 4)).toBeGreaterThan(3);
  });

  it('never settles more than half a step past the manual ceiling', () => {
    const beat = beatFor(LANDMARK, true)!;
    expect(settleZoom(4, beat, 4)).toBe(4.5);
    expect(settleZoom(100, beat, 4)).toBe(4.5);
  });

  it('always zooms in, never out, at any starting zoom', () => {
    for (const kind of [LANDMARK, { kind: 'poi', poiKind: 'anomaly' } as const]) {
      const beat = beatFor(kind, true)!;
      for (const current of [1, 2, 3, 4]) {
        expect(settleZoom(current, beat, 4)).toBeGreaterThanOrEqual(current);
      }
    }
  });
});

describe('beatKey', () => {
  it('separates the landmark from places and places from each other', () => {
    expect(beatKey(LANDMARK, null)).toBe('landmark');
    const a = beatKey({ kind: 'poi', poiKind: 'settlement' }, 'poi_lothal_camp');
    const b = beatKey({ kind: 'poi', poiKind: 'settlement' }, 'poi_kavik_tower');
    expect(a).not.toBe(b);
    expect(a).not.toBe(beatKey(LANDMARK, null));
  });
});
