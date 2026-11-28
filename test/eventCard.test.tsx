// @vitest-environment jsdom
//
// The event card with somebody in it.
//
// Rendered rather than reasoned about, because every fault the interface work found was found by
// rendering a component. What this guards:
//
//   * a stranger's face is on the card: a painted one from their own people's part of the pool
//     when the pool has a compatible painting, and otherwise drawn in the colours their figure wears on the road;
//   * an event about nobody is unchanged, with no empty face slot;
//   * a woven choice hands its caller the whole choice, `gives` and `eases` included, exactly once.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { EventCard } from '../src/ui/EventCard';
import { anyConditions, type GameEvent } from '../src/content/events';
import type { NpcLook } from '../src/content/looks';

afterEach(cleanup);

const look: NpcLook = {
  body: 'traveller-carrier', skin: 'as-painted', cloth: 'undyed', second: 'indigo', portraitId: 'harappan-f-04'
};

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
  it('shows the painting assigned to their appearance kit', () => {
    const { baseElement } = render(<EventCard event={event()} holds={[]} onChoose={() => {}} onClose={() => {}} />);
    const face = baseElement.querySelector('img.stranger-face');
    expect(face, 'no painted face on the card').not.toBeNull();
    expect(face!.getAttribute('src')).toContain('harappan-f-04');
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

describe('a road happening with no painting of its own', () => {
  // The owner, 3 October 2026: crossing from Lothal, the road's card showed its painting and the
  // ferry song after it came up blank. The road's own painting is the last thing tried, so the card
  // keeps a picture -- and the happening's own painting still wins the day one is made.
  const ferry = (over: Partial<GameEvent> = {}): GameEvent => {
    const { stranger: _none, ...plain } = event({ id: 'happening_the_ferry_song', title: 'The ferry song', occasion: 'journey', art: 'happening_the_ferry_song', ...over });
    return plain;
  };

  it('is blank with nothing to fall back on, which was the fault', () => {
    const { baseElement } = render(<EventCard event={ferry()} holds={[]} onChoose={() => {}} onClose={() => {}} />);
    expect(baseElement.querySelector('img.activity-scene')).toBeNull();
    expect(baseElement.querySelector('.activity-scene-blank')).not.toBeNull();
  });

  it('shows the road it came by', () => {
    const { baseElement } = render(
      <EventCard event={ferry({ artFallback: 'journey-aravali-lothal' })} holds={[]} onChoose={() => {}} onClose={() => {}} />
    );
    expect(baseElement.querySelector('img.activity-scene')?.getAttribute('src')).toMatch(/journey-aravali-lothal/);
  });

  it('still prefers a painting of its own', () => {
    const { baseElement } = render(
      <EventCard event={ferry({ art: 'woven-company', artFallback: 'journey-aravali-lothal' })} holds={[]} onChoose={() => {}} onClose={() => {}} />
    );
    expect(baseElement.querySelector('img.activity-scene')?.getAttribute('src')).toMatch(/woven-company/);
  });
});

describe('contextual event art', () => {
  it('uses a place fallback and records that semantic source', () => {
    const onChoose = vi.fn();
    const contextual = event({
      origin: 'discovery',
      art: 'not-painted',
      artCandidates: [
        { collection: 'events', key: 'not-painted' },
        { collection: 'places', key: 'kind-archaeological_site' }
      ]
    });
    const { baseElement } = render(<EventCard event={contextual} holds={[]} onChoose={onChoose} onClose={() => {}} />);
    expect(baseElement.querySelector('img.activity-scene')?.getAttribute('src')).toMatch(/kind-archaeological_site/);
    fireEvent.click(screen.getByRole('button', { name: 'Ask the way' }));
    expect(onChoose.mock.calls[0]![1]).toMatchObject({ folder: 'places', key: 'kind-archaeological_site' });
  });

  it('does not reserve an empty painting block when no contextual art exists', () => {
    const contextual = event({ origin: 'sub-location', art: 'not-painted', artCandidates: [] });
    const { baseElement } = render(<EventCard event={contextual} holds={[]} onChoose={() => {}} onClose={() => {}} />);
    expect(baseElement.querySelector('.activity-scene-blank')).toBeNull();
  });
});
