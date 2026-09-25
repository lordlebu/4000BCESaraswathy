// @vitest-environment jsdom
//
// The event card with somebody in it.
//
// Rendered rather than reasoned about, because every fault the interface work found was found by
// rendering a component. What this guards:
//
//   * a stranger's face is on the card, drawn in the colours their figure wears on the road --
//     read off the same table, so the card and the map cannot disagree;
//   * an event about nobody is unchanged, with no empty face slot;
//   * a woven choice hands its caller the whole choice, `gives` and `eases` included, exactly once.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { EventCard } from '../src/ui/EventCard';
import { anyConditions, type GameEvent } from '../src/content/events';
import { lookFor, swatchesFor } from '../src/content/looks';

afterEach(cleanup);

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
  it('draws their face in the dyes their figure wears', () => {
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
