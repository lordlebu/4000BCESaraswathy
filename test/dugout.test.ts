// The dugout from three sides, and the traveller the right way round in it.
//
// Three faults were reported from play, and each is held here by the thing it got wrong:
//
//   1. **He sat facing the stern.** No sheet's "seated, facing right" frame faced right -- four had
//      two left profiles and Varuna's pair was swapped -- so paddling east he looked west. Seated
//      side views are now the left profile, mirrored for right.
//   2. **Going north was drawn crossing the screen.** There was one side-on hull and nothing for up
//      or down. There are now three, and the scene picks by heading.
//   3. **The hull was two tiles long and its hollow rose above its rim.** The opening was an
//      ellipse laid over the hull rather than cut into it.
//
// The scene cannot run under Node, so the numbers it cuts the art at live in `frames.ts` and are
// checked here against the pixels themselves: a redrawn hull with a different rim fails by name
// instead of seating the traveller in mid-air.

import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { DUGOUT_VIEWS, dugoutFor, GRID, type DugoutView } from '../src/game/frames';
import { animFor, sitFrame } from '../src/game/player';

const { decodePng } = createRequire(import.meta.url)('../tools/sprite-png.js') as {
  decodePng: (file: string) => { width: number; height: number; data: Uint8Array };
};
const art = (view: DugoutView) => decodePng(join(__dirname, '..', 'assets', `${DUGOUT_VIEWS[view].image}.png`));
const VIEWS = Object.keys(DUGOUT_VIEWS) as DugoutView[];

/** The lit gunwale, as `tools/draw-river-art.py` draws it. */
const RIM_LIT = [190, 138, 84];

describe('which hull, which way', () => {
  it('draws the side view east and west, mirrored for west, and an end-on view north and south', () => {
    expect(dugoutFor('right')).toEqual({ view: 'side', flipX: false });
    expect(dugoutFor('left')).toEqual({ view: 'side', flipX: true });
    expect(dugoutFor('up')).toEqual({ view: 'north', flipX: false });
    expect(dugoutFor('down')).toEqual({ view: 'south', flipX: false });
  });

  it('seats him facing the way he paddles: the left profile, mirrored for right', () => {
    const left = sitFrame('left');
    const right = sitFrame('right');
    expect(right.frame, 'one profile serves both sides').toBe(left.frame);
    expect([left.flipX, right.flipX]).toEqual([false, true]);
    expect(animFor('varuna', 'right', 'sit').flipX).toBe(true);
    // Walking is never mirrored -- the satchel would change shoulder every other step.
    expect(animFor('varuna', 'right', 'walk').flipX).toBe(false);
    expect(sitFrame('down').flipX || sitFrame('up').flipX).toBe(false);
  });
});

describe('the art the scene cuts', () => {
  it('is keyed, and no longer than a tile and a half', () => {
    for (const view of VIEWS) {
      const hull = art(view);
      expect(hull.data[3], `${view}: the magenta was not keyed out`).toBe(0);
      expect(Math.max(hull.width, hull.height), `${view}: longer than a tile and a half`).toBeLessThanOrEqual(GRID * 1.6);
    }
  });

  it('keeps the seat, the cut and the wake inside the image', () => {
    for (const view of VIEWS) {
      const { rim, seat, wake } = DUGOUT_VIEWS[view];
      const hull = art(view);
      expect(rim + seat, `${view}: seated below the keel`).toBeLessThan(hull.height);
      expect(wake.y, `${view}: wake below the hull`).toBeLessThan(hull.height);
      expect(wake.width, `${view}: wake narrower than half the hull`).toBeGreaterThan(hull.width / 2);
    }
  });

  it('cuts the side view at its near gunwale', () => {
    const hull = art('side');
    const { rim } = DUGOUT_VIEWS.side;
    const x = hull.width >> 1;
    const at = (y: number) => [...hull.data.slice((y * hull.width + x) * 4, (y * hull.width + x) * 4 + 3)];
    // Doubled pixels: the lit rim is two rows, and the cut is on the first.
    expect(at(rim), 'the cut is not on the lit gunwale').toEqual(RIM_LIT);
  });

  it('cuts the hollow into the side view rather than stacking it on top', () => {
    // The old ellipse stood 22 rows proud of the rim at its middle. The opening is now the lens
    // between the far and near gunwales, so the silhouette above the cut is that lens and no more.
    const hull = art('side');
    const { rim } = DUGOUT_VIEWS.side;
    const x = hull.width >> 1;
    let top = 0;
    while (top < hull.height && hull.data[(top * hull.width + x) * 4 + 3] === 0) top += 1;
    expect(rim - top, 'the opening rises above the hull').toBeLessThanOrEqual(18);
  });

  it('cuts the end-on views across the opening, with hull on both sides of him', () => {
    for (const view of ['north', 'south'] as const) {
      const hull = art(view);
      const { rim } = DUGOUT_VIEWS[view];
      const row = [...Array(hull.width).keys()].map((x) => hull.data[(rim * hull.width + x) * 4 + 3]!);
      const solid = row.filter((a) => a > 0).length;
      // He is 104 pixels across at the knees; the beam at his seat has to hold him.
      expect(solid, `${view}: the beam at the cut`).toBeGreaterThanOrEqual(96);
    }
  });
});
