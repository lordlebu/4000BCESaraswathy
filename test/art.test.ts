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
import { art, artCount, artFolders, artNames, firstArt } from '../src/ui/art';
import { plateFor } from '../src/ui/plates';
import { markFor } from '../src/ui/marks';
import { sceneFor } from '../src/ui/scenes';
import { portraitFor, portraitNames } from '../src/ui/portraits';
import { placeArt, placeArtCount } from '../src/ui/places';
import { thingArt, thingArtCount } from '../src/ui/things';

describe('the art registry', () => {
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

  it('tries names in order and stops at the first that exists', () => {
    expect(firstArt('scenes', ['no-such-scene', 'stoop'])).toBe(art('scenes', 'stoop'));
    expect(firstArt('scenes', ['no-such-scene', 'also-not-there'])).toBeNull();
    // A null or undefined in the chain is skipped rather than treated as a name.
    expect(firstArt('scenes', [null, undefined, 'stoop'])).toBe(art('scenes', 'stoop'));
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

  it('narrows a scene by variant and falls back to the plain gesture', () => {
    expect(sceneFor('rest', 'camp')).toBe(art('scenes', 'rest-camp'));
    // A variant nobody has painted -- which is every making variant today -- must not lose the
    // picture. This is what lets `make-firing.png` land later as a file and no code.
    expect(sceneFor('rest', 'no-such-shelter')).toBe(art('scenes', 'rest'));
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
    expect(placeArt('poi_nobody_will_ever_paint', 'not-a-kind')).toBeNull();
    expect(thingArt('item_nobody_will_ever_paint', 'not-a-kind')).toBeNull();
  });

  /** A caller with only a kind passes it as both, which is legal and skips the first lookup. */
  it('accept a kind with no id', () => {
    expect(placeArt('kind-not-a-kind')).toBeNull();
    expect(thingArt('kind-not-a-kind')).toBeNull();
  });

  /**
   * **A place falls back to its kind**, which is what makes six paintings cover every place in the
   * game. Canon's `poi.kind` carries underscores on three of its six values and the file keeps
   * them: `idFor` hyphenates a species id and must not hyphenate this one, or the lookup misses
   * and nothing is drawn, silently.
   */
  it('finds a kind painting for a place that has none of its own', () => {
    for (const kind of ['settlement', 'travel_node', 'archaeological_site', 'eco_site', 'anomaly', 'wilderness']) {
      expect(placeArt('poi_nobody_will_ever_paint', kind), `${kind} has no view`).toBe(
        art('places', `kind-${kind}`)
      );
    }
  });
});
