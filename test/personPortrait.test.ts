// Does every person canon names actually get a picture?
//
// The portraits are derived, like the species icons: the shape comes from the trade in `role` and
// the colour from `language`. Deriving is what makes ten of them affordable and it has the same
// failure mode -- canon adds a person with a trade nobody has drawn, they fall back to a plain
// figure, and nobody notices because a plain figure looks deliberate.
//
// So the coverage is asserted against the real bundle rather than a fixture.

import { describe, expect, it } from 'vitest';
import { npcs } from '../src/content/places';
import { LANGUAGE_INK, toolFor } from '../src/ui/PersonPortrait';

describe('every person canon names gets a portrait', () => {
  it('draws a tool for every trade in the bundle', () => {
    const bare = npcs.filter((n) => toolFor(n.role) === null);
    expect(
      bare.map((n) => `${n.name} (${n.role})`),
      'people whose trade has no drawing'
    ).toEqual([]);
  });

  it('matches a trade by what the role says, not by who holds it', () => {
    // Matched on the role string so a person who changes jobs in canon changes picture without
    // anything in the component being edited.
    expect(toolFor('fisher')).toBe(toolFor('delta fisher'));
    expect(toolFor('wall-keeper and sweeper')).not.toBeNull();
    expect(toolFor('senior copyist')).toBe(toolFor('junior archivist'));
  });

  it('gives a trade nobody has drawn a plain figure rather than nothing', () => {
    // The honest fallback. A person still appears; they just carry nothing.
    expect(toolFor('astronomer')).toBeNull();
  });

  it('colours by language, and leaves the languageless neutral', () => {
    // Language is the axis the game turns on -- words are learned from people, and which language
    // a word belongs to decides who else can hear it.
    const spoken = new Set(npcs.map((n) => n.language).filter(Boolean));
    for (const language of spoken) {
      expect(LANGUAGE_INK[language], `${language} has no ink`).toBeTruthy();
    }
    // Uma teaches no words and canon gives her no language; she must not be assigned one.
    const uma = npcs.find((n) => n.name === 'Uma');
    expect(uma).toBeDefined();
    expect(LANGUAGE_INK[uma!.language]).toBeUndefined();
  });

  it('gives each language its own ink', () => {
    // Two languages sharing a colour would make the one thing this encodes unreadable.
    const inks = Object.values(LANGUAGE_INK);
    expect(new Set(inks).size).toBe(inks.length);
  });
});
