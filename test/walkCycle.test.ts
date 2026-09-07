// How fast the walk cycle runs, and why it is not a constant.
//
// **The fault this was written against is one a unit test could not have found on its own.** The
// walk looked wrong in the browser -- it stuttered, and the last frames of the cycle were never
// drawn. Two causes, and only the second is arithmetic:
//
//   1. every completed step dropped the sprite to `idle` for one frame before the next step began,
//      so a held direction restarted the walk from frame 0 on every tile. That lives in
//      `WorldScene.update`, needs a running scene, and is guarded by `e2e/travellers.spec.ts`
//      walking each character.
//   2. the cycle ran at a fixed rate while the step did not. Four frames at 7fps is 571ms; a step
//      across plains is 425ms. The cycle was cut off three quarters through, every time.
//
// This file owns the second. It is the part that can be stated as a number, so it is the part that
// belongs under Node.

import { describe, expect, it } from 'vitest';
import { WALK_FPS, WALK_FRAMES, walkTimeScale } from '../src/game/player';

/** The scene's own constant. Duplicated here on purpose -- see the assertion that uses it. */
const STEP_MS = 425;

const cycleMs = (scale: number) => (WALK_FRAMES / WALK_FPS) * 1000 / scale;

describe('walkTimeScale', () => {
  it('fits one whole stride into one step across open ground', () => {
    // The point of the whole thing: the feet finish their cycle exactly as the tile is crossed.
    expect(cycleMs(walkTimeScale(STEP_MS))).toBeCloseTo(STEP_MS, 5);
  });

  it('slows the legs on ground that slows the traveller', () => {
    // Wetland is travel cost 2, so the step takes twice as long and so must the stride. Without
    // this the same brisk walk plays over slower movement, which is the skating the fix removes.
    const plains = walkTimeScale(STEP_MS);
    const wetland = walkTimeScale(STEP_MS * 2);
    expect(wetland).toBeLessThan(plains);
    expect(cycleMs(wetland)).toBeCloseTo(STEP_MS * 2, 5);
  });

  it('is faster than the authored rate at the pace the game actually walks', () => {
    // Guards the direction of the fix. The authored 7fps is slower than a 425ms step needs, so a
    // scale at or below 1 here would mean the cycle is still being cut off.
    expect(walkTimeScale(STEP_MS)).toBeGreaterThan(1);
  });

  it('clamps rather than blurring or freezing', () => {
    // A pathological duration should degrade to a strange walk, never to a still frame or a smear.
    expect(walkTimeScale(1)).toBeLessThanOrEqual(2);
    expect(walkTimeScale(100_000)).toBeGreaterThanOrEqual(0.5);
  });

  it('survives a duration that is not a number', () => {
    // `paceFor` and `travelCost` both feed this, and a missing biome cost has produced a NaN
    // elsewhere in this codebase. A NaN timeScale stops a Phaser animation dead.
    expect(walkTimeScale(0)).toBe(1);
    expect(walkTimeScale(-1)).toBe(1);
    expect(walkTimeScale(Number.NaN)).toBe(1);
    expect(walkTimeScale(Number.POSITIVE_INFINITY)).toBe(1);
  });
});
