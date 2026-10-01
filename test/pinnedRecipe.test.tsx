// @vitest-environment jsdom
//
// The pinned recipe in the dock: what it still wants, ticked off as the satchel fills.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PinnedRecipe } from '../src/ui/PinnedRecipe';
import { WorkshopPanel } from '../src/ui/WorkshopPanel';
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
    fireEvent.click(screen.getAllByRole('button', { name: 'Pin' })[0]!);
    expect(onPin).toHaveBeenCalledTimes(1);
    expect(typeof onPin.mock.calls[0]![0]).toBe('string');
  });
});
