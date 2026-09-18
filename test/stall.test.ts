// The stall watchdog's decisions, which are the half that can be wrong quietly.

import { describe, expect, it } from 'vitest';
import {
  KEEP,
  STALL_MS,
  describeStall,
  isStall,
  lateness,
  remember,
  type Stall
} from '../src/game/stall';

const stall = (lateBy: number, walker: unknown = null): Stall => ({ lateBy, at: 0, walker });

describe('lateness', () => {
  it('measures how far past the expected tick it is', () => {
    expect(lateness(1000, 5000)).toBe(4000);
  });

  it('floors at zero, because a timer firing early is not news', () => {
    expect(lateness(1000, 900)).toBe(0);
  });
});

describe('isStall', () => {
  it('ignores the ordinary jitter of a frame', () => {
    expect(isStall(16, false)).toBe(false);
    expect(isStall(300, false)).toBe(false);
  });

  it('reports a gap a player would call a freeze', () => {
    expect(isStall(STALL_MS, false)).toBe(true);
    expect(isStall(4000, false)).toBe(true);
  });

  /**
   * **A hidden tab is never a stall, and this is the assertion that earns the whole guard.**
   * Browsers throttle a background tab's timers to about once a minute, so without this every
   * return from another app reports a sixty-second freeze -- which would bury the real one under
   * noise indistinguishable from it.
   */
  it('never reports a backgrounded tab, however late the tick', () => {
    expect(isStall(60_000, true)).toBe(false);
  });
});

describe('remember', () => {
  it('keeps the most recent, and keeps the list short', () => {
    let list: Stall[] = [];
    for (let i = 0; i < KEEP + 10; i += 1) list = remember(list, stall(i));
    expect(list).toHaveLength(KEEP);
    expect(list[list.length - 1]!.lateBy).toBe(KEEP + 9);
  });

  it('does not mutate what it was given, because two readers share it', () => {
    const before: Stall[] = [stall(1)];
    const after = remember(before, stall(2));
    expect(before).toHaveLength(1);
    expect(after).toHaveLength(2);
  });
});

describe('describeStall', () => {
  it('says where and what, in one line a phone console can show', () => {
    expect(describeStall(stall(4200, { x: 44, y: 10, biome: 'lava_field', moving: true }))).toBe(
      'stalled 4200ms at 44,10 on lava_field, mid-step'
    );
  });

  it('still says something when the scene was not up yet', () => {
    expect(describeStall(stall(1500))).toBe('stalled 1500ms');
  });
});
