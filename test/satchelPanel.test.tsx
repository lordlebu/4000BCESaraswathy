// @vitest-environment jsdom
//
// The satchel panel, rendered.
//
// Same reason `panels.test.tsx` exists: every bug this codebase has shipped in a panel had a
// rules-shaped cause and a rendering symptom, and neither a unit test nor a browser suite
// catches that seam well. The three recorded ones were a diary that called itself empty while
// holding a question, a place panel that buried the notes, and a settle button that called
// nothing.
//
// The last is the one this file is most about. `onMake` is how the making layer is reached by a
// player at all, and a panel that renders beautifully while calling nothing is precisely the
// failure that shipped three times here.
//
// `onGather` used to be tested here too. Taking what is under foot has moved out of the satchel
// entirely -- picking up a reed should not mean opening your bag -- and its tests moved with it,
// to `tileActions.test.tsx`. The rule that a control must actually call something did not move;
// it applies there now.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { SatchelPanel } from '../src/ui/SatchelPanel';
import { add, emptySatchel } from '../src/content/satchel';

afterEach(cleanup);

const base = {
  // Everything known, so these tests ask about ingredients and ground rather than about
  // teaching. Whether a recipe has to be taught is `journey.test.ts`'s question and the
  // player-path one below it.
  open: true,
  onClose: () => {}
};

describe('the satchel panel', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<SatchelPanel {...base} satchel={emptySatchel()} open={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('says the satchel is empty without implying anything is wrong', () => {
    render(<SatchelPanel {...base} satchel={emptySatchel()} />);
    expect(screen.getByText(/Empty\. Things are picked up as you walk\./)).toBeTruthy();
    // No weight, no capacity, nothing running out. If a number like "0/20" ever appears here
    // the satchel has quietly become an inventory.
    expect(screen.queryByText(/\d+\s*\/\s*\d+/)).toBeNull();
  });

  it('says plainly when it is empty', () => {
    render(<SatchelPanel {...base} satchel={emptySatchel()} />);
    expect(screen.queryByText(/Nothing here worth stooping for\./)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Pick it up' })).toBeNull();
  });

  it('separates stuff from what has been made', () => {
    let s = add(emptySatchel(), 'material_flint', 3);
    s = add(s, 'item_flint_knife', 1);
    render(<SatchelPanel {...base} satchel={s} />);
    expect(screen.getByRole('heading', { name: 'Stuff' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Made' })).toBeTruthy();
    expect(screen.getByText('×3')).toBeTruthy();

    // Each row wears a mark, and the two kinds of row wear different ones — flint is `stone`,
    // a knife is a `tool`. See `ThingIcon.tsx` for why that distinction is the whole point.
    //
    // Scoped to the two stacks rather than the whole panel: the Making list draws marks as
    // well, and several recipes there produce tools. Asserting across the document found five
    // of them, which is the panel working rather than a fault.
    const [stuff, made] = screen.getAllByRole('list').filter((l) => l.className === 'stacks');
    expect(within(stuff!).getByRole('img', { name: 'stone' })).toBeTruthy();
    expect(within(made!).getByRole('img', { name: 'tool' })).toBeTruthy();
  });

  // The crafting tests moved to `workshopPanel.test.tsx` with the crafting itself. A bag is a
  // thing you have and a workshop is a thing you do; putting them on one surface meant crafting
  // required opening your bag.

  it('closes when asked', () => {
    const onClose = vi.fn();
    render(<SatchelPanel {...base} satchel={emptySatchel()} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
