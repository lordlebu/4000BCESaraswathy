// @vitest-environment jsdom
//
// The front door, and where you left off (`docs/a-place-to-stop.md`). There is no house to come
// back to in this game, so a returning player is told where they are before "Go on walking".

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { FrontDoor } from '../src/ui/FrontDoor';

afterEach(cleanup);

const door = (over: Partial<Parameters<typeof FrontDoor>[0]> = {}) =>
  render(
    <FrontDoor
      open
      canContinue
      seed="saraswati"
      characterId="varuna"
      onChoose={vi.fn()}
      onContinue={vi.fn()}
      onBegin={vi.fn()}
      {...over}
    />
  );

describe('the front door', () => {
  it('says where you left off above the way back in', () => {
    door({ leftOff: ['You were on the Narmada Plateau.', 'Carry basket: 2 more any fibre.'] });
    const left = screen.getByRole('region', { name: 'Where you left off' });
    expect(left.textContent).toContain('You were on the Narmada Plateau.');
    expect(left.textContent).toContain('Carry basket: 2 more any fibre.');
    // Above the button, so it is read before it is pressed.
    const go = screen.getByRole('button', { name: 'Go on walking' });
    expect(left.compareDocumentPosition(go) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('says nothing of a walk there is none of', () => {
    door({ canContinue: false, leftOff: ['You were on Lothal.'] });
    expect(screen.queryByRole('region', { name: 'Where you left off' })).toBeNull();
  });

  it('says nothing when there is nothing to say', () => {
    door({ leftOff: [] });
    expect(screen.queryByRole('region', { name: 'Where you left off' })).toBeNull();
  });
});
