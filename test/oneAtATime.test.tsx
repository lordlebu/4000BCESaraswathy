// @vitest-environment jsdom
//
// One person talks at a time.
//
// **The fault, measured before it was fixed:** `PlacePanel` rendered a `<Person>` for every NPC at
// a point of interest and each one mounted a live `Dialogue`. Canon holds 15 people across 22
// inhabited places — 16 with one, five with two, and **Lothal Camp with three** — so a fifth of the
// inhabited game started two or three typewriters at once, each with a 96-pixel portrait, stacked
// in a panel that showed 29% of itself on a landscape phone. Their lines average 32 words and run
// to 61. They are written to be listened to.
//
// Nothing in the suite could see it. `conversation.test.ts` proves the right *lines* are chosen and
// is pure; `talking.spec.ts` drives a browser and reads `.person` **first**, so it passed happily
// with three of them on screen. What was missing was the count.
//
// So these assertions are about how many, and about the way in and the way back — the parts that
// only exist once a conversation is a mode rather than a section of a panel.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PlacePanel } from '../src/ui/PlacePanel';
import { Conversation } from '../src/ui/Conversation';
import { npcsAt } from '../src/content/places';
import { whoIsHere } from '../src/content/presence';
import { emptyProgress } from '../src/journey';
import { emptySatchel } from '../src/content/satchel';

afterEach(cleanup);

const noop = () => {};

/** The busiest place canon has. If this stops being true the test below says so rather than lying. */
const CROWDED = 'poi_lothal_camp';

const place = (over: Record<string, unknown> = {}) => ({
  poiId: CROWDED,
  // Nothing reported yet, so every traveller counts as here -- the busiest the place can be.
  presence: whoIsHere(CROWDED, 'field_map_lothal', 0, []),
  progress: emptyProgress(),
  moment: null,
  firstVisit: false,
  onLook: noop,
  onTalkTo: noop,
  onClose: noop,
  ...over
});

describe('the fixture this suite stands on', () => {
  it('has a place with more than one person in it', () => {
    expect(
      npcsAt(CROWDED).length,
      `${CROWDED} holds ${npcsAt(CROWDED).length} people — pick a busier place, or this proves nothing`
    ).toBeGreaterThan(1);
  });
});

describe('a place with several people in it', () => {
  it('lists them rather than playing them', () => {
    render(<PlacePanel onOpenStation={null} {...place()} />);

    // Everybody is named...
    for (const person of npcsAt(CROWDED)) {
      expect(screen.getByRole('button', { name: new RegExp(person.name) })).toBeTruthy();
    }
    // ...and nobody is talking. This is the assertion the old arrangement failed, three times over.
    expect(
      document.querySelectorAll('.dialogue-beat').length,
      'somebody is mid-sentence in a list of who is here'
    ).toBe(0);
  });

  it('says what each of them does, which is how you choose', () => {
    // Canon's own word — fisher, hunter, potter. A row of names alone gives a player no reason to
    // pick one, and picking is the whole of the new interaction.
    render(<PlacePanel onOpenStation={null} {...place()} />);
    const roles = [...document.querySelectorAll('.who-role')].map((el) => el.textContent);
    expect(roles.length).toBe(npcsAt(CROWDED).length);
    expect(roles.every(Boolean), 'a person is listed with no role').toBe(true);
  });

  it('hands back who was chosen, and nothing else', () => {
    const chosen = vi.fn();
    render(<PlacePanel onOpenStation={null} {...place({ onTalkTo: chosen })} />);
    const first = npcsAt(CROWDED)[0]!;

    fireEvent.click(screen.getByRole('button', { name: new RegExp(first.name) }));
    expect(chosen).toHaveBeenCalledOnce();
    expect(chosen).toHaveBeenCalledWith(first.id);
  });
});

describe('one of them, talking', () => {
  const talk = (over: Record<string, unknown> = {}) =>
    render(
      <Conversation
        npcId={npcsAt(CROWDED)[0]!.id}
        progress={emptyProgress()}
        satchel={emptySatchel()}
        traits={null}
        onListen={noop}
        onClose={noop}
        {...over}
      />
    );

  it('mounts exactly one exchange, at a place that holds three people', () => {
    talk();
    expect(document.querySelectorAll('.person').length).toBe(1);
  });

  it('names who is talking, and offers the way back', () => {
    talk();
    const person = npcsAt(CROWDED)[0]!;
    expect(screen.getByRole('heading', { name: person.name })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Back' })).toBeTruthy();
  });

  it('closes when asked, without touching what was heard', () => {
    // Going back is navigation. Whether a line counted as heard is `Dialogue`'s to decide, as it
    // finishes each beat, and `keepOnLeave` means walking out does not take it away.
    const closed = vi.fn();
    const heard = vi.fn();
    talk({ onClose: closed, onListen: heard });

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(closed).toHaveBeenCalledOnce();
    expect(heard).not.toHaveBeenCalled();
  });

  it('renders nothing for somebody canon no longer has', () => {
    // A save and a bundle can disagree after an export. A conversation with nobody is better closed
    // than rendered blank.
    const { container } = talk({ npcId: 'npc_nobody_at_all' });
    expect(container.textContent).toBe('');
  });
});

describe('asking for something, in a conversation', () => {
  const talk = (ask: { label: string; onAsk: () => string | null; hint?: string } | null, more: { label: string; onAsk: () => string | null; hint?: string }[] = []) =>
    render(
      <Conversation
        npcId="npc_thrali"
        progress={emptyProgress()}
        satchel={emptySatchel()}
        traits={null}
        onListen={noop}
        onClose={noop}
        asks={[...(ask ? [ask] : []), ...more]}
      />
    );

  it('offers nothing to ask when there is nothing to ask for', () => {
    talk(null);
    expect(screen.queryByRole('button', { name: 'Ask about a boat' })).toBeNull();
  });

  it('says "not yet" in the person\'s own words, and the row gives way to the answer', () => {
    const onAsk = vi.fn(() => 'A boat? Not yet.');
    talk({ label: 'Ask about a boat', onAsk });
    fireEvent.click(screen.getByRole('button', { name: 'Ask about a boat' }));
    expect(onAsk).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/A boat\? Not yet\./)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Ask about a boat' })).toBeNull();
  });

  it('asks about the road beside the boat, each answered on its own, the hint under the answer', () => {
    talk({ label: 'Ask about a boat', onAsk: () => 'A boat? Not yet.' }, [
      { label: 'Ask about the road', onAsk: () => 'The coastal dhow goes from the Camp in the Kilns.', hint: 'Stand at the Camp in the Kilns and press Travel.' }
    ]);
    expect(screen.queryByText(/press Travel/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Ask about the road' }));
    expect(screen.getByText(/coastal dhow goes from/)).toBeTruthy();
    expect(screen.getByText(/press Travel/)).toBeTruthy();
    // The boat row is still there to ask, and answering it leaves the road's answer standing.
    fireEvent.click(screen.getByRole('button', { name: 'Ask about a boat' }));
    expect(screen.getByText(/A boat\? Not yet\./)).toBeTruthy();
    expect(screen.getByText(/coastal dhow goes from/)).toBeTruthy();
  });

  it('leaves the row alone when asking opened the loan instead', () => {
    const onAsk = vi.fn(() => null);
    talk({ label: 'Ask about a boat', onAsk });
    fireEvent.click(screen.getByRole('button', { name: 'Ask about a boat' }));
    expect(onAsk).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/Not yet/)).toBeNull();
  });
});
