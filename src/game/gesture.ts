// Whether letting go of the screen means "walk there" or "I was pinching".
//
// **The bug this exists to stop.** `WorldScene` binds tap-to-walk to `POINTER_UP` and the map is
// pinch-to-zoom, and nothing connected the two: lifting either finger at the end of a two-finger
// zoom fired `POINTER_UP`, the scene read the world point under that finger, and the traveller set
// off for it -- spending in-game hours on a walk nobody asked for. Every zoom on a phone ended in
// an unwanted journey.
//
// It is here rather than in the scene for the reason `dayNight.ts`, `arrival.ts`, `night.ts` and
// `fatigue.ts` are: nothing in this file imports Phaser, so `test/` exercises the exact rule that
// ships. A three-line flag inside the scene would have been shorter and only provable by driving a
// real browser with two synthetic fingers.
//
// **What is deliberately not here: a distance threshold.** "The finger moved more than N pixels, so
// it was a drag" is the other half of how this is usually written, and it is declined -- there is
// nothing to drag on this map, no panning and no selection, so the only thing such a rule could do
// is silently refuse a walk for somebody whose thumb slid four pixels. The fault was multi-touch,
// so the guard is multi-touch.

/** How many fingers are on the screen, and whether this gesture was ever more than one. */
export interface Gesture {
  /** Pointers currently down. */
  down: number;
  /**
   * Whether two or more have been down at once since this gesture began.
   *
   * It has to outlive the first release, not just the moment: a pinch ends in **two**
   * `POINTER_UP`s, and by the second one only one finger was ever down. Clearing on the first
   * release would let the second finger walk the traveller, which is the same bug with an extra
   * step.
   */
  multi: boolean;
}

/** Nobody is touching the screen. */
export const NO_GESTURE: Gesture = { down: 0, multi: false };

/**
 * A finger went down.
 *
 * The first one starts a fresh gesture and clears `multi` -- which is what makes an ordinary tap
 * after a pinch work rather than being swallowed for ever.
 */
export function pressed(gesture: Gesture): Gesture {
  const down = gesture.down + 1;
  return down === 1 ? { down, multi: false } : { down, multi: true };
}

/**
 * A finger came up. `walk` is whether this release should be read as a tap.
 *
 * `multi` is carried while any finger is still down and cleared when the last one leaves, so both
 * halves of a pinch are refused and the next tap is not.
 */
export function released(gesture: Gesture): { gesture: Gesture; walk: boolean } {
  const down = Math.max(0, gesture.down - 1);
  return {
    gesture: { down, multi: down === 0 ? false : gesture.multi },
    walk: !gesture.multi
  };
}
