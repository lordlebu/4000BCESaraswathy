// Beats, meetings, and the two things measuring the real writing changed.
//
// `test/conversationFlow.test.ts` covers `saysNow` and is untouched. This pins what was added:
// splitting a line into the pieces it arrives in, and playing a whole introduction on a first
// meeting instead of one line of it.
//
// Every fixture here that quotes a person quotes canon exactly, because both rules were written
// against the shipped text and a paraphrase would stop testing the thing that broke.

import { describe, expect, it } from 'vitest';
import { beats, meeting, moreAfter, offerIn, saysNow } from '../src/content/conversation';
import type { Line } from '../src/content/places';
import { allNpcs } from '../src/content/places';

const line = (text: string, gives: string[] = [], requires: string[] = []): Line => ({
  text,
  requires,
  gives,
  costs: null
});

const nothingSpent = () => false;
const spentIf =
  (...texts: string[]) =>
  (l: Line) =>
    texts.includes(l.text);

describe('beats', () => {
  it('breaks a line at its sentences', () => {
    expect(beats('One thing. Then another thing entirely, at some length.')).toEqual([
      'One thing.',
      'Then another thing entirely, at some length.'
    ]);
  });

  it('leaves a single sentence alone', () => {
    expect(beats('Only the one thing to say here.')).toEqual(['Only the one thing to say here.']);
  });

  it('lets a short opening answer stand on its own', () => {
    // Bekh, verbatim. "Mask Family, yes." is seventeen characters and is the whole point of the
    // line -- a four-word answer, then the explanation. Gluing it forward would lose the beat.
    const said = beats(
      'Mask Family, yes. There is no family and there are no masks, so it is mostly a way of saying which brick I sleep under.'
    );
    expect(said).toHaveLength(2);
    expect(said[0]).toBe('Mask Family, yes.');
  });

  it('joins a short trailing fragment onto the sentence before it', () => {
    const said = beats('Something stood in it when my grandmother was small. She would not say.');
    expect(said).toHaveLength(1);
    expect(said[0]).toContain('She would not say.');
  });

  // The bug this file exists for. Canon uses `--` two ways and they are not the same mark.
  describe('the dash', () => {
    it('splits where a dash follows a full stop, because that is time passing', () => {
      // Uma, verbatim. She says "Sit.", the player tries, and she corrects him. That silence is
      // the best beat in the writing and it was being glued to the sentence before it.
      const said = beats(
        'You are sleeping on the ground, I can see it from here. Sit. -- No, like that, butt the reeds against the frame, do not weave the ends in.'
      );
      expect(said[0]).toBe('You are sleeping on the ground, I can see it from here. Sit.');
      expect(said[1]).toBe('No, like that, butt the reeds against the frame, do not weave the ends in.');
    });

    it('keeps a mid-clause dash inside its own sentence', () => {
      // Marn, verbatim. "Not step -- khet." is one breath of teaching; splitting it would make
      // him stutter over the word he is correcting.
      //
      // It arrives as "Khet. Not step -- khet." because "Khet." is five characters and rides
      // along with what it introduces -- the short-fragment rule, working as intended. What
      // matters is that the dash never became a break.
      const said = beats('Khet. Not step -- khet. It means the water is held.');
      expect(said.some((b) => b.includes('Not step -- khet.'))).toBe(true);
      expect(said.some((b) => b.trim() === 'khet.')).toBe(false);
    });

    it('starts a new beat after a scene break even when it is short', () => {
      // The short-fragment rule must not swallow the line that opens a new scene -- the pause is
      // exactly what makes it worth showing.
      const said = beats('Is that one of mine? -- It is one of yours. Good.');
      expect(said[0]).toBe('Is that one of mine?');
      expect(said[1]).toMatch(/^It is one of yours/);
    });

    it('drops the dash itself, which is stage direction', () => {
      const said = beats('After the flood? Nobody cuts reed after the flood. -- No, I am listening.');
      expect(said.some((b) => b.startsWith('--'))).toBe(false);
    });
  });

  it('never returns nothing, whatever it is given', () => {
    expect(beats('')).toEqual(['']);
    expect(beats('...')).toHaveLength(1);
  });
});

describe('meeting', () => {
  it('plays every freely offered line the first time', () => {
    const lines = [line('First.'), line('Second.'), line('Third.')];
    expect(meeting(lines, nothingSpent, true)).toHaveLength(3);
  });

  it('says one thing on a later visit', () => {
    const lines = [line('First.'), line('Second.'), line('Third.')];
    expect(meeting(lines, nothingSpent, false)).toHaveLength(1);
  });

  it('keeps the author order of an introduction', () => {
    const lines = [line('First.'), line('Second.'), line('Third.')];
    const said = meeting(lines, nothingSpent, true).map((t) => t.line.text);
    expect(said).toEqual(['First.', 'Second.', 'Third.']);
  });

  it('carries the index each line sits at, so the right one is recorded', () => {
    const lines = [line('First.', ['word_a']), line('Second.', ['word_b'])];
    const turns = meeting(lines, nothingSpent, true);
    expect(turns.map((t) => t.index)).toEqual([0, 1]);
  });

  it('leaves out what has already been given', () => {
    const lines = [line('First.', ['word_a']), line('Second.', ['word_b'])];
    const turns = meeting(lines, spentIf('First.'), true);
    expect(turns.map((t) => t.line.text)).toEqual(['Second.']);
  });

  it('falls back to saying something when a first meeting has nothing unspent', () => {
    // Everything given already, but the person is still standing there. They must say something.
    const lines = [line('First.', ['word_a'])];
    const turns = meeting(lines, spentIf('First.'), true);
    expect(turns).toHaveLength(1);
  });

  it('has nothing to play for somebody with no available lines', () => {
    expect(meeting([], nothingSpent, true)).toEqual([]);
  });
});

describe('moreAfter', () => {
  it('is true when an unplayed line still has something to give', () => {
    const lines = [line('Said.'), line('Held back.', ['word_a'], ['discovery_x'])];
    const played = meeting([lines[0]!], nothingSpent, false);
    expect(moreAfter(lines, nothingSpent, played)).toBe(true);
  });

  it('is false once everything giving has been played', () => {
    const lines = [line('One.', ['word_a'])];
    const played = meeting(lines, nothingSpent, true);
    expect(moreAfter(lines, nothingSpent, played)).toBe(false);
  });
});

describe('against the writing as shipped', () => {
  it('finds more than one opening line for everybody', () => {
    // The measurement that changed the plan. The old comment claimed almost everybody had exactly
    // one line on arrival; nobody does. If canon is ever rewritten so that somebody opens with a
    // single line, this fails and the introduction behaviour should be reconsidered, not patched.
    for (const person of allNpcs()) {
      const free = person.lines.filter((l) => l.requires.length === 0);
      expect(free.length, `${person.name} opens with ${free.length}`).toBeGreaterThan(1);
    }
  });

  it('never produces an unreadably long beat', () => {
    for (const person of allNpcs()) {
      for (const l of person.lines) {
        for (const b of beats(l.text)) {
          expect(b.length, `${person.name}: ${b.slice(0, 40)}`).toBeLessThan(220);
        }
      }
    }
  });

  it('loses no words to the splitter', () => {
    // Every beat concatenated must contain every word of the original. The dash is dropped on
    // purpose and is the only thing allowed to go missing.
    for (const person of allNpcs()) {
      for (const l of person.lines) {
        const rejoined = beats(l.text).join(' ');
        const words = (s: string) => s.replace(/--/g, ' ').split(/\s+/).filter(Boolean);
        expect(words(rejoined), `${person.name}`).toEqual(words(l.text));
      }
    }
  });

  it('still says one thing per visit after the introduction', () => {
    for (const person of allNpcs()) {
      const said = saysNow(person.lines, nothingSpent);
      expect(said.line).not.toBeNull();
    }
  });
});

// A gift is Varuna's act, not the panel's.
//
// Canon prices two lines -- Uma wants a reed mat back before she shows you a bedroll, Pell wants a
// hawser before he shows you the span -- and both teach a recipe canon marks `taught_by` them and
// nobody else. Neither was reachable: the panel asked `linesFor` what somebody says to a traveller
// carrying nothing, so a priced line was filtered out every time and two recipes could not be got.
describe('a line with a price', () => {
  const priced = (text: string, costs: string, gives: string[] = []): Line => ({
    text,
    requires: [],
    gives,
    costs
  });

  it('never plays itself as part of a meeting', () => {
    const lines = [line('Free.'), priced('Is that one of mine?', 'item_reed_mat', ['recipe_x'])];
    const turns = meeting(lines, nothingSpent, true);
    expect(turns.map((t) => t.line.text)).toEqual(['Free.']);
  });

  it('is not what somebody says on a later visit either', () => {
    const lines = [line('Free.'), priced('Is that one of mine?', 'item_reed_mat', ['recipe_x'])];
    expect(meeting(lines, nothingSpent, false)).toEqual([]);
  });

  it('is offered separately, so the player can accept it', () => {
    const lines = [line('Free.'), priced('Is that one of mine?', 'item_reed_mat', ['recipe_x'])];
    const offer = offerIn(lines, nothingSpent);
    expect(offer?.line.costs).toBe('item_reed_mat');
    expect(offer?.index).toBe(1);
  });

  it('stops being offered once it has been given', () => {
    const lines = [priced('Is that one of mine?', 'item_reed_mat', ['recipe_x'])];
    expect(offerIn(lines, spentIf('Is that one of mine?'))).toBeNull();
  });

  it('is not offered when there is nothing to pay for', () => {
    expect(offerIn([line('Free.')], nothingSpent)).toBeNull();
  });
});

describe('the two gifts canon actually authors', () => {
  it('are reachable only by carrying the thing', () => {
    for (const person of allNpcs()) {
      for (const l of person.lines) {
        if (!l.costs) continue;
        // The line exists, it wants an item, and it teaches something.
        expect(l.costs).toMatch(/^item_/);
        expect(l.gives.length, `${person.name}'s priced line gives nothing`).toBeGreaterThan(0);
      }
    }
  });

  it('are exactly two, so one offer slot per person is enough', () => {
    const n = allNpcs().reduce((c, p) => c + p.lines.filter((l) => l.costs).length, 0);
    expect(n).toBe(2);
  });
});
