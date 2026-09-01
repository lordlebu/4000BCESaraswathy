// @vitest-environment jsdom
//
// The workshop, rendered.
//
// These moved from `satchelPanel.test.tsx` with the crafting they test. That file's header states
// the rule they exist for and it has not changed: **every bug this codebase has shipped in a panel
// had a rules-shaped cause and a rendering symptom**, and three mechanics shipped with the rule
// written, tested and never called. A panel that renders beautifully and calls nothing is the
// failure this guards.
//
// One test is new, and it is the reason the panel exists at all: a place that can work a material
// must say so, whether or not the traveller is carrying anything for it.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { WorkshopPanel } from '../src/ui/WorkshopPanel';
import { openGround } from '../src/content/crafting';
import { add, emptySatchel } from '../src/content/satchel';

afterEach(cleanup);

const base = {
  bench: openGround(),
  lastMade: [],
  // Everything known, so these ask about ingredients and ground rather than about teaching.
  knows: () => true,
  onMake: () => {},
  open: true,
  onClose: () => {}
};

describe('the workshop', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <WorkshopPanel {...base} satchel={emptySatchel()} open={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('makes a thing, and hands the recipe id back', () => {
    // The test that matters. Two flint is a knife, `crafting.ts` says so, and the panel must
    // actually offer it and actually call back.
    const onMake = vi.fn();
    const s = add(emptySatchel(), 'material_flint', 2);
    render(<WorkshopPanel {...base} satchel={s} onMake={onMake} />);

    expect(screen.getByText('Knapping a flint knife')).toBeTruthy();
    const make = screen.getAllByRole('button', { name: 'Make' })[0]!;
    fireEvent.click(make);
    expect(onMake).toHaveBeenCalledWith('recipe_flint_knife');
  });

  it('shows why something cannot be made, in the rules layer’s own words', () => {
    // One reed is not a rope. The panel must not merely grey the row out — the reason is the
    // useful part, and it comes from `blockedBy` rather than being written here.
    const s = add(emptySatchel(), 'material_reed_fibre', 1);
    render(<WorkshopPanel {...base} satchel={s} />);
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
    const { rerender } = render(<WorkshopPanel {...base} satchel={s} />);
    expect(screen.getAllByText(/needs to be done at a settlement/).length).toBeGreaterThan(0);

    rerender(<WorkshopPanel {...base} satchel={s} bench={{ kind: 'settlement' }} />);
    expect(screen.queryAllByText(/needs to be done at a settlement/)).toHaveLength(0);
  });

  it('says what a place can make, carrying nothing at all', () => {
    // **The reason this panel exists.** Six of canon's seventeen processes can only be performed
    // somewhere, and that rule has been enforced since the making layer landed with no surface
    // ever mentioning it -- so a player could stand in the only kind of place in the world that
    // can smelt and never find out. Standing somewhere is itself a reason to show a recipe.
    const empty = emptySatchel();

    const { rerender } = render(<WorkshopPanel {...base} satchel={empty} />);
    expect(
      screen.getByText(/Out in the open/),
      'open ground should say plainly that it is hand work only'
    ).toBeTruthy();

    rerender(<WorkshopPanel {...base} satchel={empty} bench={{ kind: 'settlement' }} />);
    expect(screen.getByText(/can be made here that cannot be made in the open/)).toBeTruthy();
    // And the recipes themselves are listed, empty-handed, rather than waiting for materials.
    expect(screen.getAllByRole('button', { name: 'Not yet' }).length).toBeGreaterThan(0);
  });

  it('closes when asked', () => {
    const onClose = vi.fn();
    render(<WorkshopPanel {...base} satchel={emptySatchel()} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
