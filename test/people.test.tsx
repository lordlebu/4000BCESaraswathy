// @vitest-environment jsdom
//
// Who you have met, as a record.
//
// Two things worth guarding here, and only one of them is about this panel.
//
// The first is a property of the *writing*: "met" is derived from somebody having handed something
// over, which works only because every introduction in canon contains at least one line that gives
// something freely. A person whose opening gave nothing would be invisible in this tab having been
// talked to, and nothing else in the game would notice.
//
// The second is that the record and the ending must never disagree about who was helped. They read
// the same rule -- a finished discovery naming that person -- and the ending has read it since long
// before this panel existed.

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { met, threadWith } from '../src/content/people';
import { PeoplePanel, nameOfGift } from '../src/ui/PeoplePanel';
import { allNpcs, npc } from '../src/content/places';
import { emptyProgress, gatherable, hear, staying } from '../src/journey';
import type { Progress } from '../src/journey';

afterEach(cleanup);

/** Hear everything somebody will say to a traveller carrying nothing. */
function talkTo(progress: Progress, npcId: string): Progress {
  let out = progress;
  const who = npc(npcId)!;
  for (let i = 0; i < who.lines.length; i += 1) {
    out = hear(out, npcId, i).progress;
  }
  return out;
}

describe('every introduction leaves a trace', () => {
  it('so meeting anybody can be derived rather than remembered', () => {
    // The property `met` depends on. If canon ever gives somebody an opening that hands nothing
    // over, this fails here rather than showing an empty People tab to a player who has talked to
    // them.
    for (const person of allNpcs()) {
      const opening = person.lines.filter(
        (l) => l.requires.length === 0 && l.costs === null && l.gives.length > 0
      );
      expect(
        opening.length,
        `${person.name}'s introduction hands nothing over, so meeting them leaves no trace`
      ).toBeGreaterThan(0);
    }
  });
});

describe('met', () => {
  it('is empty before anybody has been spoken to', () => {
    expect(met(emptyProgress())).toEqual([]);
  });

  it('holds somebody once they have said their piece', () => {
    const after = talkTo(emptyProgress(), 'npc_thrali');
    const names = met(after).map((a) => a.person.name);
    expect(names).toContain('Thrali');
  });

  it('does not hold anybody else', () => {
    const after = talkTo(emptyProgress(), 'npc_thrali');
    expect(met(after)).toHaveLength(1);
  });

  it('records what they handed over', () => {
    const after = talkTo(emptyProgress(), 'npc_thrali');
    const thrali = met(after).find((a) => a.person.id === 'npc_thrali')!;
    // His opening gives the silver-water question, which is the game's first thread.
    expect(thrali.gave).toContain('question_silver_water');
  });
});

describe('helped', () => {
  it('agrees with the ending about who was helped', () => {
    // The record and the ending read the same rule. If they ever diverge, one of them is lying to
    // the player about the same fact.
    const after = talkTo(emptyProgress(), 'npc_thrali');
    const ending = new Set([...gatherable(after), ...staying(after)]);
    for (const a of met(after)) {
      expect(a.helped, `${a.person.name}`).toBe(ending.has(a.person.id));
    }
  });

  it('is false for somebody merely talked to', () => {
    // Knowledge is how you help, and talking is not finishing a discovery.
    const after = talkTo(emptyProgress(), 'npc_thrali');
    expect(met(after).every((a) => !a.helped)).toBe(true);
  });
});

describe('threadWith', () => {
  it('says there is more when a line is still to come', () => {
    const after = talkTo(emptyProgress(), 'npc_thrali');
    expect(threadWith(after, npc('npc_thrali')!)).toMatch(/more/i);
  });

  it('never names the thing that would unlock it', () => {
    // A quest marker is the one thing this must not become. Nothing here should contain a canon
    // id or a discovery's name.
    const after = talkTo(emptyProgress(), 'npc_thrali');
    const said = threadWith(after, npc('npc_thrali')!) ?? '';
    expect(said).not.toMatch(/discovery_|word_|question_/);
  });
});

describe('nameOfGift', () => {
  it('renders a word with its gloss, never its id', () => {
    const said = nameOfGift('word_kia_thal');
    expect(said).not.toBeNull();
    expect(said).not.toMatch(/word_/);
  });

  it('drops an id that resolves to nothing rather than printing it', () => {
    expect(nameOfGift('word_not_a_real_word')).toBeNull();
    expect(nameOfGift('something_else_entirely')).toBeNull();
  });
});

describe('the panel', () => {
  it('says nothing is there yet rather than showing an empty list', () => {
    render(<PeoplePanel progress={emptyProgress()} open onClose={() => {}} />);
    expect(screen.getByText(/have not talked to anybody/i)).toBeTruthy();
  });

  it('shows somebody once met, with their trade and what they gave', () => {
    const after = talkTo(emptyProgress(), 'npc_thrali');
    render(<PeoplePanel progress={after} open onClose={() => {}} />);
    expect(screen.getByRole('heading', { name: /Thrali/ })).toBeTruthy();
    // His trade, and the question his opening hands over, rendered as prose rather than an id.
    expect(screen.getAllByText(/fisher/).length).toBeGreaterThan(0);
    expect(screen.getByText(/silver/i)).toBeTruthy();
  });

  it('never prints a canon id at the player', () => {
    const after = talkTo(emptyProgress(), 'npc_thrali');
    const { container } = render(<PeoplePanel progress={after} open onClose={() => {}} />);
    expect(container.textContent).not.toMatch(/word_|question_|recipe_|discovery_|npc_|poi_/);
  });

  it('renders nothing at all when closed', () => {
    const { container } = render(
      <PeoplePanel progress={emptyProgress()} open={false} onClose={() => {}} />
    );
    expect(container.textContent).toBe('');
  });
});
