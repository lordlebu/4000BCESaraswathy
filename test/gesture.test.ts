// A pinch must not walk the traveller.
//
// Written after the fault, and the fault was invisible to everything: the map zoomed correctly, the
// walk was a legal walk to a real tile, no console warning, no failing assertion. It was found by
// reading `POINTER_UP` while measuring whether the zoom buttons could be removed on a touch screen.
//
// The case that matters most is the **second** release. A pinch ends in two `POINTER_UP`s and by
// the second one only one finger was ever down, so the obvious implementation -- clear the flag on
// release -- reproduces the whole bug on the second finger.

import { describe, expect, it } from 'vitest';
import { NO_GESTURE, pressed, released, type Gesture } from '../src/game/gesture';

/** Press n fingers, in order. */
function press(n: number, from: Gesture = NO_GESTURE): Gesture {
  let g = from;
  for (let i = 0; i < n; i += 1) g = pressed(g);
  return g;
}

describe('one finger is a tap', () => {
  it('walks on release', () => {
    const { walk } = released(press(1));
    expect(walk).toBe(true);
  });

  it('leaves nothing behind, so the next tap is a tap too', () => {
    const { gesture } = released(press(1));
    expect(gesture).toEqual(NO_GESTURE);
    expect(released(pressed(gesture)).walk).toBe(true);
  });
});

describe('two fingers are a pinch', () => {
  it('refuses the first release', () => {
    expect(released(press(2)).walk).toBe(false);
  });

  it('refuses the second release as well', () => {
    // **The one the obvious implementation gets wrong.** By now a single finger is on the screen
    // and lifting it looks exactly like a tap -- which is how the bug would survive its own fix.
    const first = released(press(2));
    expect(first.gesture.down).toBe(1);
    expect(released(first.gesture).walk).toBe(false);
  });

  it('is over once both fingers have gone', () => {
    const after = released(released(press(2)).gesture).gesture;
    expect(after).toEqual(NO_GESTURE);
  });

  it('does not swallow the tap that comes after it', () => {
    // A guard that never cleared would fix the bug by breaking the game: no walking, ever again,
    // after the first pinch.
    const after = released(released(press(2)).gesture).gesture;
    expect(released(pressed(after)).walk).toBe(true);
  });
});

describe('three fingers, and other things hands do', () => {
  it('is still a pinch', () => {
    let g = press(3);
    for (let i = 0; i < 3; i += 1) {
      const step = released(g);
      expect(step.walk, `release ${i + 1} of 3 walked the traveller`).toBe(false);
      g = step.gesture;
    }
    expect(g).toEqual(NO_GESTURE);
  });

  it('counts a second finger arriving after the first', () => {
    // The real sequence: one finger down, then the second. The gesture is only a pinch from the
    // moment the second arrives, and the first finger must not have been treated as a tap yet --
    // nothing walks on press.
    const one = pressed(NO_GESTURE);
    expect(one.multi).toBe(false);
    expect(pressed(one).multi).toBe(true);
  });

  it('survives a release with nothing down', () => {
    // A pointer that leaves the canvas mid-press can deliver an up with no matching down. It must
    // not push the count negative and strand the guard.
    const { gesture, walk } = released(NO_GESTURE);
    expect(gesture.down).toBe(0);
    expect(walk).toBe(true);
  });
});
