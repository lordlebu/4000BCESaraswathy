// @vitest-environment jsdom
//
// The pinned recipe in the dock: what it still wants, ticked off as the satchel fills.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PinnedRecipe } from '../src/ui/PinnedRecipe';
import { WorkshopPanel } from '../src/ui/WorkshopPanel';
import { GoalsSection } from '../src/ui/GoalsSection';
import { openGround } from '../src/content/crafting';
import { add, emptySatchel } from '../src/content/satchel';

afterEach(cleanup);

describe('the pinned recipe', () => {
  it('says what is still wanted, and how many more', () => {
    const s = add(emptySatchel(), 'material_palm_husk', 1);
    const { container } = render(<PinnedRecipe recipeId="recipe_husk_hawser" satchel={s} bench={openGround()} />);
    const text = container.textContent ?? '';
    expect(text).toMatch(/more palm husk/i);
    expect(text).toMatch(/something that can work/);
  });

  it('says nothing when nothing is pinned', () => {
    const { container } = render(<PinnedRecipe recipeId={null} satchel={emptySatchel()} bench={openGround()} />);
    expect(container.firstChild).toBeNull();
  });

  it('reads ready once everything is carried', () => {
    const s = add(emptySatchel(), 'material_flint', 2);
    const { container } = render(<PinnedRecipe recipeId="recipe_flint_knife" satchel={s} bench={openGround()} />);
    expect(container.querySelector('[data-ready="true"]')).toBeTruthy();
  });
});

describe('pinning from the workshop', () => {
  it('pins anything known, even with nothing carried towards it', () => {
    const onPin = vi.fn();
    render(
      <WorkshopPanel
        station={null}
        satchel={emptySatchel()}
        bench={openGround()}
        lastMade={[]}
        knows={() => true}
        onMake={() => {}}
        pinned={null}
        onPin={onPin}
        open
        onClose={() => {}}
      />
    );
    expect(screen.getByText(/Everything you know how to make/)).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: /^Pin / })[0]!);
    expect(onPin).toHaveBeenCalledTimes(1);
    expect(typeof onPin.mock.calls[0]![0]).toBe('string');
  });
});

describe('unpinning, which the owner could not find', () => {
  it('makes the pinned line a button that opens the workshop, when asked to', () => {
    const onOpen = vi.fn();
    render(<PinnedRecipe recipeId="recipe_flint_knife" satchel={emptySatchel()} bench={openGround()} onOpen={onOpen} />);
    fireEvent.click(screen.getByRole('button', { name: /Working towards/ }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('says Unpin on the pinned recipe, even once it is ready to make', () => {
    // A ready recipe moves to the Ready list, which had no pin button at all: once a pinned recipe
    // could be made, there was nowhere left to unpin it.
    const onPin = vi.fn();
    render(
      <WorkshopPanel
        station={null}
        satchel={add(emptySatchel(), 'material_flint', 2)}
        bench={openGround()}
        lastMade={[]}
        knows={() => true}
        onMake={() => {}}
        pinned="recipe_flint_knife"
        onPin={onPin}
        open
        onClose={() => {}}
      />
    );
    const unpins = screen.getAllByRole('button', { name: /^Unpin / });
    // Once at the top, beside "Working towards", and once on the recipe's own row.
    expect(unpins.length).toBe(2);
    fireEvent.click(unpins[1]!);
    expect(onPin).toHaveBeenCalledWith(null);
  });

  it('names and unpins a building stage at the top of the workshop', () => {
    const onPin = vi.fn();
    render(
      <WorkshopPanel
        station={null}
        satchel={emptySatchel()}
        bench={openGround()}
        lastMade={[]}
        knows={() => true}
        onMake={() => {}}
        pinned="stage:field_map_narmada"
        onPin={onPin}
        open
        onClose={() => {}}
      />
    );
    expect(screen.getByText('Lay the footing')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Unpin Lay the footing' }));
    expect(onPin).toHaveBeenCalledWith(null);
  });
});

describe('the diary’s Goals', () => {
  it('lists what could be worked towards, and pins or unpins from the row', () => {
    const toggle = vi.fn();
    render(
      <GoalsSection
        rows={[
          { id: 'stage', line: 'Raise the tower, at the Eastern Field.', pin: { on: false, label: 'Raise the tower', toggle } },
          { id: 'news:uma', line: 'Uma has something new to tell you.' }
        ]}
      />
    );
    expect(screen.getByRole('heading', { name: 'Goals' })).toBeTruthy();
    expect(screen.getByText('Uma has something new to tell you.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Pin Raise the tower' }));
    expect(toggle).toHaveBeenCalledTimes(1);
  });

  it('says nothing when there is nothing to work towards', () => {
    const { container } = render(<GoalsSection rows={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
