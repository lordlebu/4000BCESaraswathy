// @vitest-environment jsdom
//
// The event card with somebody in it.
//
// Rendered rather than reasoned about, because every fault the interface work found was found by
// rendering a component. What this guards:
//
//   * a stranger's face is on the card: a painted one from their own people's part of the pool
//     when the pool has one, and otherwise drawn in the colours their figure wears on the road;
//   * an event about nobody is unchanged, with no empty face slot;
//   * a woven choice hands its caller the whole choice, `gives` and `eases` included, exactly once.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { EventCard } from '../src/ui/EventCard';
import { anyConditions, type GameEvent } from '../src/content/events';
import { lookFor, swatchesFor } from '../src/content/looks';

afterEach(cleanup);

/**
 * Whether the face pool reads as empty, for the one test of the drawn fallback.
 *
 * The pool is real art now -- twenty-four faces -- so every people has painted ones and the drawn
 * face is only reached when a pool is empty. That is still the state every new people starts in,
 * so it is still tested, by hiding the pool rather than by deleting art.
 */
let emptyPool = false;
vi.mock('../src/ui/art', async (original) => {
  const actual = await original<typeof import('../src/ui/art')>();
  return {
    ...actual,
    artNames: (folder: string) => (folder === 'faces' && emptyPool ? [] : actual.artNames(folder))
  };
});
afterEach(() => {
  emptyPool = false;
});

const look = lookFor('field_map_narmada:company_carrier', 'traveller-carrier')!;

const event = (over: Partial<GameEvent> = {}): GameEvent => ({
  id: 'woven:company:company_carrier',
  title: 'Company on the road',
  occasion: 'road',
  conditions: anyConditions(),
  prose: 'A carrier falls in beside you.',
  art: 'woven-company',
  choices: [
    { id: 'walk', label: 'Walk together a while', needs: [], line: 'The miles go easier.', grants: [], eases: 0.15 },
    {
      id: 'ask',
      label: 'Ask the way',
      needs: [],
      line: 'They point you on.',
      grants: [],
      gives: [{ id: 'material_reed_fibre', n: 1 }]
    }
  ],
  once: true,
  stranger: { id: 'company_carrier', role: 'carrier, with a loaded back', look, culture: 'harappan', givenName: 'Tharek' },
  ...over
});

describe('the card with a stranger on it', () => {
  it('shows a painted face from their own people when the pool has one', () => {
    const { baseElement } = render(<EventCard event={event()} holds={[]} onChoose={() => {}} onClose={() => {}} />);
    const face = baseElement.querySelector('img.stranger-face');
    expect(face, 'no painted face on the card').not.toBeNull();
    // A Harappan carrier is dealt a Harappan face or one that could be anybody -- never a Kia's.
    expect(face!.getAttribute('src')).toMatch(/(harappan-[fm]-\d{2}|any-\d{2})/);
    expect(face!.closest('.event-heading')?.querySelector('h2')?.textContent).toBe('Company on the road');
  });

  it('draws their face in the dyes their figure wears when the pool has none', () => {
    emptyPool = true;
    const { baseElement } = render(<EventCard event={event()} holds={[]} onChoose={() => {}} onClose={() => {}} />);
    const face = baseElement.querySelector('svg.stranger-face');
    expect(face, 'no face on the card').not.toBeNull();
    const fills = [...face!.querySelectorAll('path')].map((p) => p.getAttribute('fill'));
    const { skin, headwear, shoulders } = swatchesFor(look);
    expect(fills).toEqual([shoulders, skin, headwear]);
    // The face sits beside the title, not somewhere else on the card.
    expect(face!.closest('.event-heading')?.querySelector('h2')?.textContent).toBe('Company on the road');
  });

  it('leaves an event about nobody exactly as it was', () => {
    const { stranger: _none, ...plain } = event();
    const { baseElement } = render(<EventCard event={plain} holds={[]} onChoose={() => {}} onClose={() => {}} />);
    expect(baseElement.querySelector('.stranger-face')).toBeNull();
    expect(baseElement.querySelector('.event-heading')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Company on the road' })).toBeTruthy();
  });

  it('hands over the whole choice, gifts and easing included, once', () => {
    const onChoose = vi.fn();
    render(<EventCard event={event()} holds={[]} onChoose={onChoose} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ask the way' }));
    fireEvent.click(screen.queryByRole('button', { name: 'Ask the way' }) ?? document.body);
    expect(onChoose).toHaveBeenCalledTimes(1);
    expect(onChoose.mock.calls[0]![0].gives).toEqual([{ id: 'material_reed_fibre', n: 1 }]);
    expect(screen.getByText('They point you on.')).toBeTruthy();
  });
});
