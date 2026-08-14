// The collection: what the traveller has met.
//
// The mechanic this replaces was written, tested and had no consumer -- the fourth time that
// pattern has appeared in this project. So these tests check the thing a player can observe
// about it, not that the functions return what they were told to return.

import { describe, expect, it } from 'vitest';

import {
  type Collection,
  countOf,
  emptyCollection,
  everythingMet,
  hasMet,
  met,
  metOnTile,
  readCollection,
  size
} from '../src/content/collection';

const otter = { id: 'river-otter' };
const crane = { id: 'monsoon-crane' };
const reed = { id: 'saltreed' };

describe('meeting things', () => {
  it('starts empty', () => {
    expect(size(emptyCollection())).toBe(0);
  });

  it('records what was met', () => {
    const c = met(emptyCollection(), otter, 'creature');
    expect(hasMet(c, 'river-otter')).toBe(true);
    expect(c['river-otter'].times).toBe(1);
  });

  it('counts a second meeting without making a second entry', () => {
    let c = met(emptyCollection(), otter, 'creature');
    c = met(c, otter, 'creature');
    expect(size(c)).toBe(1);
    expect(c['river-otter'].times).toBe(2);
  });

  it('ignores an empty tile rather than recording a blank', () => {
    expect(size(met(emptyCollection(), null, 'creature'))).toBe(0);
  });

  /**
   * Keyed by id, not by name.
   *
   * The old record stored creature *names*, which are prose from canon and change when someone
   * improves them. A re-export that renamed a species silently orphaned every entry filed under
   * the old string, and nothing would have reported it.
   */
  it('is keyed by the species id canon guarantees, not by its prose name', () => {
    const c = met(emptyCollection(), { id: 'river-otter' }, 'creature');
    expect(Object.keys(c)).toEqual(['river-otter']);
  });

  it('keeps flora and fauna apart, because the album shows them apart', () => {
    let c = met(emptyCollection(), otter, 'creature');
    c = met(c, reed, 'flora');
    expect(countOf(c, 'creature')).toBe(1);
    expect(countOf(c, 'flora')).toBe(1);
  });

  it('fills in the order things were met, which is the shape of the walk', () => {
    let c = met(emptyCollection(), otter, 'creature');
    c = met(c, crane, 'creature');
    expect(everythingMet(c).map((m) => m.id)).toEqual(['river-otter', 'monsoon-crane']);
  });

  it('does not mutate what it was given', () => {
    const before = met(emptyCollection(), otter, 'creature');
    const after = met(before, crane, 'creature');
    expect(size(before)).toBe(1);
    expect(size(after)).toBe(2);
  });
});

describe('standing on a tile', () => {
  it('records the creature and the flora together', () => {
    const c = metOnTile(emptyCollection(), { creature: otter, flora: reed });
    expect(hasMet(c, 'river-otter')).toBe(true);
    expect(hasMet(c, 'saltreed')).toBe(true);
  });

  it('records what is there when the other is absent', () => {
    const c = metOnTile(emptyCollection(), { creature: null, flora: reed });
    expect(size(c)).toBe(1);
    expect(hasMet(c, 'saltreed')).toBe(true);
  });

  /**
   * The album is filled by meeting rather than by pressing a button. Walking onto a tile is
   * the whole interaction -- there is nothing to press and nothing to miss.
   */
  it('needs no action beyond being there', () => {
    let c = emptyCollection();
    for (const tile of [
      { creature: otter, flora: reed },
      { creature: crane, flora: reed }
    ]) {
      c = metOnTile(c, tile);
    }
    expect(size(c)).toBe(3);
    expect(c.saltreed.times).toBe(2);
  });
});

describe('reading a stored collection', () => {
  it('survives a round trip through JSON', () => {
    const c = metOnTile(emptyCollection(), { creature: otter, flora: reed });
    expect(readCollection(JSON.parse(JSON.stringify(c)))).toEqual(c);
  });

  it('discards entries with no honest kind', () => {
    const c = readCollection({ 'river-otter': { kind: 'nonsense', times: 3 } });
    expect(size(c)).toBe(0);
  });

  it('discards anything that is not a collection at all', () => {
    for (const junk of [null, undefined, 'text', 42, []]) {
      expect(size(readCollection(junk))).toBe(0);
    }
  });

  /** `localStorage` is editable by anyone with a console, so a nonsense count is repaired. */
  it('repairs a count that could not be true', () => {
    const c = readCollection({ 'river-otter': { kind: 'creature', times: -5 } });
    expect(c['river-otter'].times).toBe(1);
  });

  it('fills in an id that was only a key', () => {
    const c: Collection = readCollection({ saltreed: { kind: 'flora', times: 2 } });
    expect(c.saltreed.id).toBe('saltreed');
  });
});
