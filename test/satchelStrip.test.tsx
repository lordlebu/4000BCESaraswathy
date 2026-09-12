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

/** The strip's dismiss, for the cases that are not about it. */
const noop = () => {};

afterEach(cleanup);

describe('the satchel strip', () => {
  it('shows what is carried, with counts', () => {
    let s = add(emptySatchel(), 'material_flint', 3);
    s = add(s, 'material_reed_fibre', 1);
    const { container } = render(<SatchelStrip satchel={s} onOpen={() => {}} onHide={noop} />);

    expect(container.querySelectorAll('.satchel-held')).toHaveLength(2);
    expect(container.textContent).toContain('3');
    expect(container.textContent).toContain('1');
  });

  it('shows the count even at one', () => {
    // Unlike the full panel, which drops `×1` because a bare name reads better there. Somebody
    // scanning a readout is counting, and a missing number reads as a missing thing.
    const s = add(emptySatchel(), 'material_flint', 1);
    const { container } = render(<SatchelStrip satchel={s} onOpen={() => {}} onHide={noop} />);
    expect(container.querySelector('.satchel-held-n')?.textContent).toBe('1');
  });

  it('says what would fill it rather than that it is empty', () => {
    // An empty satchel is the one moment a player most needs telling that gathering exists.
    // "Empty" is a state; "take what the ground offers" is the next move.
    render(<SatchelStrip satchel={emptySatchel()} onOpen={() => {}} onHide={noop} />);
    expect(screen.getByText(/take what the ground offers/i)).toBeTruthy();
  });

  it('opens the full satchel when pressed', () => {
    // The strip deliberately holds no prose -- what a thing is and what it is for live in the
    // panel. If this callback ever stops firing, that detail becomes unreachable.
    //
    // Named rather than `getByRole('button')`, which is how this case first failed: there are two
    // controls in the strip now and an unqualified query cannot say which one a player pressed.
    const onOpen = vi.fn();
    render(<SatchelStrip satchel={add(emptySatchel(), 'material_flint', 2)} onOpen={onOpen} onHide={noop} />);
    fireEvent.click(screen.getByRole('button', { name: /open for detail/i }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('can be put away from where it is', () => {
    // **The whole of the report.** Closing the strip has been possible for months and the switch
    // lives in the map sheet, two taps deep, with nothing on the strip saying it could be
    // dismissed. This is the control that makes the option findable.
    const onHide = vi.fn();
    render(<SatchelStrip satchel={emptySatchel()} onOpen={() => {}} onHide={onHide} />);
    fireEvent.click(screen.getByRole('button', { name: /put the satchel away/i }));
    expect(onHide).toHaveBeenCalledTimes(1);
  });

  it('says where the strip goes, not just that it closes', () => {
    // A control that hides something has to say how to get it back. The way back is inside a sheet
    // behind another button, which is not somewhere a player goes on a guess.
    render(<SatchelStrip satchel={emptySatchel()} onOpen={() => {}} onHide={() => {}} />);
    expect(screen.getByRole('button', { name: /show it again from the map sheet/i })).toBeTruthy();
  });

  it('is two controls, not a button inside a button', () => {
    // **The structural note that is the whole of the work.** The readout used to be one `<button>`
    // wrapping everything, and a `<button>` inside a `<button>` is invalid -- browsers resolve it
    // by discarding the inner one, so the dismiss could not simply be added. If this element ever
    // becomes a button again, the dismiss silently stops existing.
    const { container } = render(
      <SatchelStrip satchel={emptySatchel()} onOpen={() => {}} onHide={() => {}} />
    );
    const strip = container.querySelector('.satchel-strip')!;
    expect(strip.tagName).toBe('DIV');
    expect(strip.querySelectorAll('button')).toHaveLength(2);
  });

  it('keeps a stable order as things are gathered', () => {
    // Not sorted by count. A strip that reorders itself when you pick something up is one you
    // have to re-read every time, which defeats the point of it never hiding.
    const first = add(add(emptySatchel(), 'material_flint', 1), 'material_reed_fibre', 1);
    const { container, rerender } = render(<SatchelStrip satchel={first} onOpen={() => {}} onHide={noop} />);
    const before = [...container.querySelectorAll('.satchel-held')].map((n) => n.textContent);

    // Gather more of the second one, so a count-sorted list would flip them.
    const later = add(first, 'material_reed_fibre', 9);
    rerender(<SatchelStrip satchel={later} onOpen={() => {}} onHide={noop} />);
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
    const { container } = render(<SatchelStrip satchel={s} onOpen={() => {}} onHide={noop} />);
    const marks = [...container.querySelectorAll('.thing-mark')].map((n) => n.textContent);
    expect(marks).toHaveLength(2);
    expect(marks[0]).not.toBe(marks[1]);
  });
});
