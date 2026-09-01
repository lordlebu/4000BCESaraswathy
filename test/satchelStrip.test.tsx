// @vitest-environment jsdom
//
// What you are carrying, always on screen.
//
// The rule this file exists for is the one `satchelPanel.test.tsx` states: every failure this
// codebase has shipped in a panel had a rules-shaped cause and a rendering symptom, and three
// mechanics shipped with the rule written, tested and never called. A readout is a new way to
// fail that — it can render a plausible number that is not the number.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SatchelStrip } from '../src/ui/SatchelStrip';
import { add, emptySatchel } from '../src/content/satchel';

afterEach(cleanup);

describe('the satchel strip', () => {
  it('shows what is carried, with counts', () => {
    let s = add(emptySatchel(), 'material_flint', 3);
    s = add(s, 'material_reed_fibre', 1);
    const { container } = render(<SatchelStrip satchel={s} onOpen={() => {}} />);

    expect(container.querySelectorAll('.satchel-held')).toHaveLength(2);
    expect(container.textContent).toContain('3');
    expect(container.textContent).toContain('1');
  });

  it('shows the count even at one', () => {
    // Unlike the full panel, which drops `×1` because a bare name reads better there. Somebody
    // scanning a readout is counting, and a missing number reads as a missing thing.
    const s = add(emptySatchel(), 'material_flint', 1);
    const { container } = render(<SatchelStrip satchel={s} onOpen={() => {}} />);
    expect(container.querySelector('.satchel-held-n')?.textContent).toBe('1');
  });

  it('says what would fill it rather than that it is empty', () => {
    // An empty satchel is the one moment a player most needs telling that gathering exists.
    // "Empty" is a state; "take what the ground offers" is the next move.
    render(<SatchelStrip satchel={emptySatchel()} onOpen={() => {}} />);
    expect(screen.getByText(/take what the ground offers/i)).toBeTruthy();
  });

  it('opens the full satchel when pressed', () => {
    // The strip deliberately holds no prose -- what a thing is and what it is for live in the
    // panel. If this callback ever stops firing, that detail becomes unreachable.
    const onOpen = vi.fn();
    render(<SatchelStrip satchel={add(emptySatchel(), 'material_flint', 2)} onOpen={onOpen} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('keeps a stable order as things are gathered', () => {
    // Not sorted by count. A strip that reorders itself when you pick something up is one you
    // have to re-read every time, which defeats the point of it never hiding.
    const first = add(add(emptySatchel(), 'material_flint', 1), 'material_reed_fibre', 1);
    const { container, rerender } = render(<SatchelStrip satchel={first} onOpen={() => {}} />);
    const before = [...container.querySelectorAll('.satchel-held')].map((n) => n.textContent);

    // Gather more of the second one, so a count-sorted list would flip them.
    const later = add(first, 'material_reed_fibre', 9);
    rerender(<SatchelStrip satchel={later} onOpen={() => {}} />);
    const after = [...container.querySelectorAll('.satchel-held')].map((n) => n.textContent);

    expect(after.length).toBe(before.length);
    // The marks stay in the same slots; only the numbers move.
    expect(after[0]!.replace(/\d+/g, '')).toBe(before[0]!.replace(/\d+/g, ''));
    expect(after[1]!.replace(/\d+/g, '')).toBe(before[1]!.replace(/\d+/g, ''));
  });

  it('separates stuff from what has been made', () => {
    // Materials first, then items -- the order the full panel uses. Reed fibre and reed rope
    // must not share a glyph at the moment a player is learning they are not the same thing.
    let s = add(emptySatchel(), 'material_flint', 2);
    s = add(s, 'item_flint_knife', 1);
    const { container } = render(<SatchelStrip satchel={s} onOpen={() => {}} />);
    const marks = [...container.querySelectorAll('.thing-mark')].map((n) => n.textContent);
    expect(marks).toHaveLength(2);
    expect(marks[0]).not.toBe(marks[1]);
  });
});
