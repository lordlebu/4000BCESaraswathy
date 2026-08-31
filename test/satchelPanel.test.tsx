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
import { openGround } from '../src/content/crafting';
import { add, emptySatchel } from '../src/content/satchel';

afterEach(cleanup);

const base = {
  bench: openGround(),
  // Everything known, so these tests ask about ingredients and ground rather than about
  // teaching. Whether a recipe has to be taught is `journey.test.ts`'s question and the
  // player-path one below it.
  knows: () => true,
  onMake: () => {},
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

  it('makes a thing, and hands the recipe id back', () => {
    // The test that matters. Two flint is a knife, `crafting.ts` says so, and the panel must
    // actually offer it and actually call back.
    const onMake = vi.fn();
    const s = add(emptySatchel(), 'material_flint', 2);
    render(<SatchelPanel {...base} satchel={s} onMake={onMake} />);

    expect(screen.getByText('Knapping a flint knife')).toBeTruthy();
    const make = screen.getAllByRole('button', { name: 'Make' })[0]!;
    fireEvent.click(make);
    expect(onMake).toHaveBeenCalledWith('recipe_flint_knife');
  });

  it('shows why something cannot be made, in the rules layer’s own words', () => {
    // One reed is not a rope. The panel must not merely grey the row out — the reason is the
    // useful part, and it comes from `blockedBy` rather than being written here.
    const s = add(emptySatchel(), 'material_reed_fibre', 1);
    render(<SatchelPanel {...base} satchel={s} />);
    expect(screen.getByText('Twisting reed rope')).toBeTruthy();
    expect(screen.getByText(/needs 4 Reed fibre, has 1/)).toBeTruthy();
    // And the button for it is dead rather than absent, so the player can see it is a thing.
    const notYet = screen.getAllByRole('button', { name: 'Not yet' });
    expect(notYet.length).toBeGreaterThan(0);
    expect((notYet[0] as HTMLButtonElement).disabled).toBe(true);
  });

  it('respects where the traveller is standing', () => {
    // Firing needs a settlement. On open ground the panel must say so rather than offering it.
    let s = add(emptySatchel(), 'material_river_clay', 4);
    s = add(s, 'material_dung_cake', 4);
    // More than one kiln recipe is in reach with clay and fuel in hand, so this is
    // deliberately `getAll` — the panel saying it about several of them is it working.
    const { rerender } = render(<SatchelPanel {...base} satchel={s} />);
    expect(screen.getAllByText(/needs to be done at a settlement/).length).toBeGreaterThan(0);

    rerender(<SatchelPanel {...base} satchel={s} bench={{ kind: 'settlement' }} />);
    expect(screen.queryAllByText(/needs to be done at a settlement/)).toHaveLength(0);
  });

  it('closes when asked', () => {
    const onClose = vi.fn();
    render(<SatchelPanel {...base} satchel={emptySatchel()} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
