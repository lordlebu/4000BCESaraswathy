// What the player chose about their own screen, kept between visits.
//
// **The fault this answers was not in the report and was found by answering it.** The satchel strip
// has had an off switch for months; the flag lives in `surface.ts`, which is pure, and `Journey` in
// `save.ts` has no field for it -- so the strip was back every time the game booted. An option to
// stop looking at something that forgets itself on every visit is not really an option.
//
// The cases that matter here are the refusals. A preference module that reads any stored value at
// face value is how a corrupted key takes the application down, and every `localStorage` access can
// throw outright rather than return null.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readShowing, writeShowing } from '../src/ui/preferences';

const KEY = 'varuna:showing';

/** A `localStorage` that behaves, since Node has none. */
function store(): Storage {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
    key: (i: number) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    }
  } as Storage;
}

beforeEach(() => {
  vi.stubGlobal('localStorage', store());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('remembering what is on screen', () => {
  it('reads back what was written', () => {
    writeShowing({ satchelRibbon: false });
    expect(readShowing()).toEqual({ satchelRibbon: false });
  });

  it('says nothing when nothing was ever chosen', () => {
    // The caller spreads this over the defaults, so an empty object has to mean "no opinion"
    // rather than "everything off".
    expect(readShowing()).toEqual({});
  });

  it('ignores a stored value that is not a boolean', () => {
    // A `"false"` string from some future version must not read as a choice. An unreadable
    // preference is no preference, and the default is a good one.
    localStorage.setItem(KEY, JSON.stringify({ satchelRibbon: 'false' }));
    expect(readShowing()).toEqual({});
  });

  it('survives a key that is not JSON at all', () => {
    localStorage.setItem(KEY, 'not json');
    expect(readShowing()).toEqual({});
  });

  it('survives a key holding null', () => {
    localStorage.setItem(KEY, 'null');
    expect(readShowing()).toEqual({});
  });

  it('survives a browser that refuses storage outright', () => {
    // **The case that would take the whole application down.** In a private window the accessor
    // itself raises, before any value is read -- so an unguarded read here fails on first render,
    // which is a far worse outcome than forgetting a toggle.
    vi.stubGlobal('localStorage', {
      get getItem(): never {
        throw new DOMException('The operation is insecure.');
      },
      setItem(): never {
        throw new DOMException('The operation is insecure.');
      }
    });
    expect(() => readShowing()).not.toThrow();
    expect(readShowing()).toEqual({});
    expect(() => writeShowing({ satchelRibbon: false })).not.toThrow();
  });
});
