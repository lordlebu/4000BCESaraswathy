// When the main thread stopped answering, and what it was doing when it came back.
//
// **Reported from play and not reproducible here: "the whole game seems to be stuck when I'm
// moving to a different tile", on a landscape phone, walking towards the basalt columns in
// Dwarka's lava field.** Three harnesses failed to reproduce it on this machine. Two of them
// produced React's `Maximum update depth exceeded` under CPU contention without the page dying,
// and the runs where a page genuinely stopped answering could not be told apart from the runner
// starvation `e2e/walk.ts` already documents at length -- which is the trap of measuring a stall
// with a budget tuned on a machine that is not the one the stall happens on.
//
// So this does not try to reproduce anything. It records.
//
// **The mechanism is a timer noticing it ran late.** A blocked main thread cannot run the check
// either, so the check fires *after* the block ends and measures the gap: a tick due 250ms ago
// that arrives four seconds late is four seconds the page answered nothing. That is the one
// measurement a page can make about its own paralysis, and it costs one timer.
//
// Free of Phaser and of React, so `test/stall.test.ts` can exercise the decisions under Node. The
// wiring lives in `PhaserGame.tsx`, which already owns a mount-scoped effect with a disposer.

/** How late a tick has to be before it is worth recording, in milliseconds. */
export const STALL_MS = 1_000;

/** How often to check. Short enough to bound the report, long enough to cost nothing. */
export const CHECK_MS = 250;

/** How many to keep. The first one is the interesting one; the rest say whether it repeats. */
export const KEEP = 20;

export interface Stall {
  /** Milliseconds beyond the expected tick, which is how long nothing ran. */
  lateBy: number;
  /** When it was noticed, on `performance.now()`'s clock. */
  at: number;
  /** Whatever the scene could say about itself, or null if it was not up yet. */
  walker: unknown;
}

/**
 * Whether a late tick is a stall worth recording.
 *
 * **A hidden tab is never a stall.** Browsers throttle timers in a background tab to once a minute
 * or stop them outright, so every return from another app would otherwise be reported as a
 * sixty-second freeze -- which would bury the real one. Visibility is passed in rather than read so
 * this stays pure; the caller owns the browser.
 */
export function isStall(lateBy: number, hidden: boolean, threshold: number = STALL_MS): boolean {
  return !hidden && lateBy >= threshold;
}

/** How late a tick was, floored at zero: a timer that fires early is not news. */
export function lateness(expected: number, actual: number): number {
  return Math.max(0, actual - expected);
}

/**
 * Add one to the record, keeping the most recent `KEEP`.
 *
 * Returns a new array rather than mutating, because the caller hands this to `window` and to
 * `localStorage` and a shared mutable array is how those two come to disagree.
 */
export function remember(stalls: readonly Stall[], next: Stall, keep: number = KEEP): Stall[] {
  return [...stalls, next].slice(-keep);
}

/** One line a person can read out of a phone's console without unpacking anything. */
export function describeStall(stall: Stall): string {
  const where = stall.walker as { x?: number; y?: number; biome?: string; moving?: boolean } | null;
  const at = where && typeof where.x === 'number' ? ` at ${where.x},${where.y} on ${where.biome}` : '';
  const moving = where?.moving ? ', mid-step' : '';
  return `stalled ${Math.round(stall.lateBy)}ms${at}${moving}`;
}
