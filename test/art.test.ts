// @vitest-environment jsdom
//
// The one registry every painted thing in the interface is loaded through.
//
// **What this guards is the fallback, which is the whole contract.** Canon holds a few hundred
// species and one painted plate is a good session's work, so the set will never be complete and no
// panel may wait for it. Every lookup here returns null for a missing file and every caller draws
// something else when it does -- a silhouette, a category mark, an emoji, or prose alone. A
// regression that made a missing file throw, or a missing folder throw, would take the game down
// on a fresh clone rather than degrade.
//
// It also guards the thing that replaced four near-identical loaders: they had begun to disagree
// about which extensions they would accept, so whoever added the first SVG plate would have found
// out by it silently not appearing.

import { describe, expect, it } from 'vitest';
import { art, artCount, artFolders, artNames, preferredArt } from '../src/ui/art';
import { plateFor } from '../src/ui/plates';
import { markFor } from '../src/ui/marks';
import { sceneFor } from '../src/ui/scenes';
import { portraitFor, portraitNames } from '../src/ui/portraits';
import { placeArt, placeArtCount } from '../src/ui/places';
import { thingArt, thingArtCount } from '../src/ui/things';

describe('the art registry', () => {
  it('prefers the painted edition through the portrait and place callers', () => {
    expect(portraitFor('npc_twin_mason')).toBe(art('portraits', 'twin-mason-painted'));
    expect(portraitFor('npc_twin_mason')).not.toBe(art('portraits', 'twin-mason'));
    expect(placeArt('poi_harappa_court')).toBe(art('places', 'poi_harappa_court-painted'));
    expect(preferredArt('events', 'happening_twin_courtyard')).toBe(art('events', 'happening_twin_courtyard-painted'));
  });

  it('keeps the original edition of a subject when there is no painted edition', () => {
    expect(preferredArt('portraits', 'thrali')).toBe(art('portraits', 'thrali'));
    expect(preferredArt('events', 'happening_twin_arrival')).toBe(art('events', 'happening_twin_arrival-painted'));
    expect(preferredArt('places', 'no-such-place')).toBeNull();
  });
  it('found the folders that have art in them', () => {
    const folders = artFolders();
    // Guards the guard: if the glob ever stops matching, every assertion below passes vacuously
    // and the failure would look like missing art rather than a broken loader.
    for (const folder of ['plates', 'portraits', 'scenes', 'marks']) {
      expect(folders, `${folder} has files and the registry did not see it`).toContain(folder);
    }
  });

  it('answers null for a file that is not there, rather than throwing', () => {
    expect(art('plates', 'no-such-species')).toBeNull();
    expect(artNames('no-such-folder')).toEqual([]);
    expect(artCount('no-such-folder')).toBe(0);
  });


});

describe('the doors on top of it', () => {
  it('each reads its own folder and nothing else', () => {
    // A plate named after a gesture must not resolve, and vice versa. The folders are separate
    // namespaces and a lookup that fell through between them would draw the wrong picture rather
    // than none, which is far harder to notice.
    expect(plateFor('stoop')).toBeNull();
    expect(sceneFor('desert-fox')).toBeNull();
  });

  it('assigns one scene per variant', () => {
    expect(sceneFor('rest', 'camp')).toBe(art('scenes', 'rest-camp'));
    expect(sceneFor('rest', 'no-such-shelter')).toBeNull();
  });

  it('keeps the marks namespaced, because `physic` is a word in two of them', () => {
    // The stuff and the thing made of it must never share a glyph. A flat map keyed on the bare
    // word would silently have given one of them the other's picture.
    expect(markFor('process', 'grinding')).not.toBeNull();
    expect(markFor('class', 'grinding')).toBeNull();
  });

  it('strips the npc prefix a portrait file never carries', () => {
    expect(portraitFor('npc_thrali')).toBe(art('portraits', 'thrali'));
    expect(portraitNames()).toContain('thrali');
  });
});

describe('the two folders opened for the art still to come', () => {
  /**
   * **Empty must stay legal, and so must full.** These were opened ahead of the art so the first
   * painting is a file rather than a sprint. If either ever throws on an empty folder, a fresh
   * clone breaks before anybody has drawn anything.
   *
   * The first version of this asserted `toBeNull()` for a settlement, which was true on the day it
   * was written and **broke the moment `kind-settlement.png` landed** — reading as a loader
   * regression rather than as art arriving. That is the third test in this repository to pin the
   * current art inventory instead of the behaviour over it. The question a test here may ask is
   * *what happens when a lookup misses*, never *what has been painted so far*.
   */
  it('report nothing and draw nothing, without complaint', () => {
    expect(placeArtCount()).toBeGreaterThanOrEqual(0);
    expect(thingArtCount()).toBeGreaterThanOrEqual(0);
    expect(placeArt('poi_nobody_will_ever_paint')).toBeNull();
    expect(thingArt('item_nobody_will_ever_paint')).toBeNull();
  });

  it('draws a category painting only when explicitly assigned its key', () => {
    expect(placeArt('kind-settlement')).toBe(art('places', 'kind-settlement'));
    expect(placeArt('poi_nobody_will_ever_paint')).toBeNull();
  });
});
