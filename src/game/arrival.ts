// What arriving somewhere does to the camera and the traveller.
//
// Pure, and deliberately so. This decision used to live inline in `WorldScene.arriveAt`, which
// imports Phaser and which therefore no test can load -- and `docs/testing.md` records what that
// costs: every placement bug this project has shipped needed a dev server, a scripted walk and a
// screenshot to find, while everything in a pure module was caught in milliseconds.
//
// The scene keeps the *doing*: it owns the camera and the sprite. This file only decides.

import type { PoiKind } from '../content/places';

/** What a single arrival does. Durations are milliseconds. */
export interface ArrivalBeat {
  /** Multiplier on the camera's current zoom. Relative, never absolute -- see `settleZoom`. */
  zoom: number;
  /** How long the camera takes to settle there. */
  settleMs: number;
  /** A warm wash over the screen, or null for none. */
  flash: { durationMs: number; rgb: [number, number, number] } | null;
  /** Whether the traveller sits down on arriving. */
  sits: boolean;
}

/** Where an arrival can happen. The landmark is not a point of interest, so it is its own case. */
export type ArrivalPlace = { kind: 'landmark' } | { kind: 'poi'; poiKind: PoiKind };

/**
 * The landmark's beat, unchanged from what shipped.
 *
 * These numbers are pinned by a test rather than described as "roughly a quarter", because they
 * are the one arrival that already felt right and this phase is not the place to retune it.
 */
const LANDMARK: ArrivalBeat = {
  zoom: 1.25,
  settleMs: 900,
  flash: { durationMs: 700, rgb: [255, 246, 213] },
  sits: true
};

/**
 * A point of interest's beat: the same gesture, quieter.
 *
 * **Why places do not flash.** The sitting is what reads as "you have arrived somewhere"; the
 * flash is what reads as "this is the end of the journey". There is one landmark per map and six
 * or so places, so giving places the full flash would fire it seven times in a walk -- a strobe,
 * in a game whose day and night are deliberately one gentle shift. Keeping the two beats
 * different is what lets the landmark still mean something when you finally reach it.
 */
const POI: ArrivalBeat = {
  zoom: 1.12,
  settleMs: 600,
  flash: null,
  sits: true
};

/**
 * The beat for arriving somewhere, or null if there is nothing to play.
 *
 * `firstTime` is the caller's: the scene remembers which places have been beaten. Returning null
 * rather than a silent beat keeps "should anything happen" in one place.
 */
export function beatFor(place: ArrivalPlace, firstTime: boolean): ArrivalBeat | null {
  if (!firstTime) return null;
  return place.kind === 'landmark' ? LANDMARK : POI;
}

/**
 * Where the camera should settle for a beat.
 *
 * **Relative, and clamped.** A fixed 1.25 was a zoom *out* on every desktop, where the fit is 2 or
 * 3 -- the reward for a hundred-tile walk was the map pulling away from you. The half-step past
 * `maxZoom` is deliberate: the settle is allowed to exceed what the player can dial to by hand,
 * because it comes back on its own.
 */
export function settleZoom(current: number, beat: ArrivalBeat, maxZoom: number): number {
  return Math.min(current * beat.zoom, maxZoom + 0.5);
}

/** A stable key for "this place has had its beat", for the scene's set. */
export function beatKey(place: ArrivalPlace, poiId: string | null): string {
  return place.kind === 'landmark' ? 'landmark' : `poi:${poiId ?? 'unknown'}`;
}
