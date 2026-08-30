// What somebody says when you talk to them.
//
// The bug this replaces was presentational: every available line rendered at once, each with a
// button beside it, so meeting a person was a queue to clear. Measured first — almost everybody has
// exactly one line available on arrival, so the list was usually a list of one, which is all of the
// paperwork and none of the volume.
//
// These pin the rules. `test/conversation.test.ts` still walks the maps through the player's own
// paths and is the acceptance test; this is the arithmetic underneath it.

import { describe, expect, it } from 'vitest';
import { quietNote, saysNow } from '../src/content/conversation';
import { linesFor, lineIsSpent, emptyProgress, hear } from '../src/journey';
import type { Progress } from '../src/journey';
import { discovery, discoveries } from '../src/content/knowledge';
import { npc, npcsAt, poisOn, fieldMaps } from '../src/content/places';
import type { Line } from '../src/content/places';

const line = (text: string, gives: string[] = []): Line => ({
  text,
  requires: [],
  gives,
  costs: null
});

/** "Already given" as a predicate, which is how the real caller derives it from `Progress`. */
const spentIf = (...texts: string[]) => (l: Line) => texts.includes(l.text);
const nothingSpent = () => false;

describe('saysNow', () => {
  it('says one thing, not a list', () => {
    const said = saysNow([line('first'), line('second', ['word_x'])], nothingSpent);
    expect(said.line).not.toBeNull();
    expect(typeof said.line!.text).toBe('string');
  });

  it('offers what is still to be given, newest first', () => {
    // Lines are authored in the order a person's life unfolds: an opening offer, then what they
    // will tell you once you have seen something. The last available one is what the player has
    // just earned, so saying the first would replay the introduction every visit.
    const said = saysNow([line('old', ['word_a']), line('new', ['word_b'])], nothingSpent);
    expect(said.line!.text).toBe('new');
    expect(said.gives).toBe(true);
  });

  it('does not repeat a line that already handed something over', () => {
    const said = saysNow([line('old', ['word_a']), line('new', ['word_b'])], spentIf('new'));
    expect(said.line!.text).toBe('old');
  });

  it('reports whether there is more where that came from', () => {
    const two = saysNow([line('a', ['x']), line('b', ['y'])], nothingSpent);
    expect(two.more).toBe(true);
    const one = saysNow([line('a', ['x']), line('b', ['y'])], spentIf('a'));
    expect(one.more).toBe(false);
  });

  it('still says something when there is nothing left to give', () => {
    // A panel that runs dry reads as broken, and people do repeat themselves. What must not happen
    // is silence.
    const said = saysNow([line('plain'), line('also plain')], spentIf('plain', 'also plain'));
    expect(said.line).not.toBeNull();
    expect(said.gives).toBe(false);
    expect(said.more).toBe(false);
  });

  it('says the most recent thing rather than the introduction', () => {
    const said = saysNow([line('hello'), line('later')], nothingSpent);
    expect(said.line!.text).toBe('later');
  });

  it('has nothing to say only when there is genuinely nothing', () => {
    const said = saysNow([], nothingSpent);
    expect(said.line).toBeNull();
    expect(said.index).toBe(-1);
    expect(said.more).toBe(false);
  });

  it('returns an index that points back into the list it was given', () => {
    // `hear` indexes the same array, so a wrong index would hand over somebody else's word.
    const lines = [line('a'), line('b', ['x']), line('c')];
    const said = saysNow(lines, nothingSpent);
    expect(lines[said.index]).toBe(said.line);
  });
});

describe('quietNote', () => {
  it('does not tell the player they have failed a check', () => {
    // The panel used to print "has nothing to say to you yet", which is a locked door with a face
    // on it. Somebody with nothing new is somebody you have already talked to.
    const note = quietNote('Bekh');
    expect(note).toContain('Bekh');
    expect(note).not.toMatch(/yet|nothing to say|cannot|locked|need/i);
  });
});

describe('everybody in canon says something', () => {
  it('has a line for a traveller who has just arrived', () => {
    // The failure that matters is silence on first meeting: a person who greets you with nothing
    // is indistinguishable from a bug. Checked against canon rather than a fixture, so authoring
    // somebody without an opening line fails here.
    const fresh = emptyProgress();
    for (const map of fieldMaps) {
      for (const place of poisOn(map.id)) {
        for (const person of npcsAt(place.id)) {
          const available = linesFor(fresh, person.id);
          const said = saysNow(available, nothingSpent);
          expect(
            said.line,
            `${person.id} at ${place.id} has nothing to say to a new arrival`
          ).not.toBeNull();
        }
      }
    }
  });

  it('opens with something offered freely, needing nothing', () => {
    for (const person of new Set(fieldMaps.flatMap((m) =>
      poisOn(m.id).flatMap((p) => npcsAt(p.id).map((n) => n.id))
    ))) {
      const first = npc(person)?.lines[0];
      expect(first, person).toBeDefined();
      expect(first!.requires, `${person} opens behind a requirement`).toEqual([]);
    }
  });
});

describe('help somebody and they say so', () => {
  /** Complete a discovery outright, as a player who climbed every rung would have it. */
  function finish(progress: Progress, id: string): Progress {
    const d = discovery(id);
    return d ? { ...progress, rungs: { ...progress.rungs, [id]: d.rungs.length - 1 } } : progress;
  }

  /** Talk to somebody until they have nothing left to hand over, as the panel does. */
  function talkedOut(progress: Progress, npcId: string): Progress {
    let p = progress;
    for (let round = 0; round < 6; round += 1) {
      const said = saysNow(linesFor(p, npcId), (l) => lineIsSpent(p, l));
      if (!said.line || !said.gives) break;
      p = hear(p, npcId, said.index).progress;
    }
    return p;
  }

  it('is what the person says next, for every discovery that helps somebody', () => {
    // The failure this exists for shipped once: four discoveries named three people in `helps` and
    // not one of them had a line acknowledging it. The camp's spring was turned around and nobody
    // mentioned it, which is why none of it landed when the game was played.
    //
    // Walked the way a player walks it -- talk to them on arrival, go and do the work, come back --
    // because the reaction only surfaces once the opening offer has been taken. A first version of
    // this check started from an empty journey and reported every reaction missing, which was the
    // check being unrealistic rather than the content being absent.
    for (const d of discoveries) {
      for (const who of d.helps ?? []) {
        const before = talkedOut(emptyProgress(), who);
        const after = finish(before, d.id);
        const said = saysNow(linesFor(after, who), (l) => lineIsSpent(after, l));

        expect(said.line, `${who} says nothing after ${d.id}`).not.toBeNull();
        const heardBefore = saysNow(linesFor(before, who), (l) => lineIsSpent(before, l));
        expect(
          said.line!.text,
          `${who} says the same thing after ${d.id} as before it -- the help is a field in a file`
        ).not.toBe(heardBefore.line?.text);
      }
    }
  });
});
