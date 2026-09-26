// Who can be walked, and what happens when the answer is nonsense.
//
// The scene names one character in four places until it is told otherwise, and the id it is told
// arrives from a URL or a save -- so both can be stale, mistyped, or name somebody who has since
// been retired. None of those may throw: a bad `?as=` should hand you Varuna and a working game,
// not a blank page.
//
// Runs under Node, which is only possible because characters.ts imports no Phaser. What it
// cannot see is whether the sheet actually loads, which is `e2e/travellers.spec.ts`.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CHARACTERS,
  TRAVELLER_ART,
  characterFor,
  everyCharacter,
  everySheet,
  frameOf,
  NAMED_ART
} from '../src/game/characters';
import { PLAYER_FRAME, TRAVELLER_SHRINK, figureScale, travellerScale } from '../src/game/player';

describe('the cast', () => {
  it('holds every traveller the build makes a sheet for', () => {
    // Kept in step with `tools/characters.json` by hand, which is the join this test guards: the
    // manifest builds the art and this map loads it, and neither knows about the other.
    expect(everyCharacter().map((c) => c.key)).toEqual([
      'varuna',
      'guyuk',
      'mithra',
      'malacite',
      'mehtar'
    ]);
  });

  it('gives each one a name worth printing', () => {
    for (const art of everyCharacter()) {
      expect(art.name, art.key).toMatch(/^[A-Z]/);
      expect(art.name).not.toBe(art.key);
    }
  });

  it('gives each one a distinct texture key', () => {
    const keys = everyCharacter().map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('points each one at its own sheet', () => {
    // Two characters sharing a URL would draw the same person under two names, which is the sort
    // of copy-paste slip that looks right in a diff.
    const urls = everyCharacter().map((c) => c.url);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it('names the map key the same as the texture key', () => {
    // `characterFor` looks up by the map key and the scene draws with `art.key`; if they differed
    // a lookup would succeed and then draw somebody else.
    for (const [id, art] of Object.entries(CHARACTERS)) expect(art.key).toBe(id);
  });
});

describe('characterFor', () => {
  it('finds somebody real', () => {
    expect(characterFor('guyuk').name).toBe('Guyuk');
  });

  it('falls back to Varuna rather than throwing', () => {
    // The whole point. This arrives from `?as=` and from a save, and neither is trustworthy.
    expect(characterFor('nobody').key).toBe('varuna');
    expect(characterFor('').key).toBe('varuna');
    expect(characterFor(null).key).toBe('varuna');
    expect(characterFor(undefined).key).toBe('varuna');
  });

  it('is not fooled by an inherited property', () => {
    // A plain object lookup answers `toString` and `constructor` too, and a save is parsed JSON:
    // `?as=constructor` must not return a function where a character is expected.
    expect(characterFor('toString').key).toBe('varuna');
    expect(characterFor('constructor').key).toBe('varuna');
    expect(characterFor('__proto__').key).toBe('varuna');
  });
});

describe('how big a figure is drawn', () => {
  // **Pure arithmetic, and it is in `player.ts` rather than in the scene precisely so it can be
  // asserted here.** The numbers were inline in `WorldScene` as `TILE_SIZE / 32` at two call sites,
  // which is how the travellers came to be exactly the player's size: nothing said they should
  // differ, so nobody noticed they did not.

  it('scales the player by a whole number, never a fraction', () => {
    // A fractional scale is what makes pixel art shimmer as it moves. The floor is the rule, and
    // the guard is that no tile size can produce a fraction -- including the ones between the two
    // grids this game has actually used.
    for (const tile of [32, 48, 64, 96, 128, 130]) {
      const scale = figureScale(tile);
      expect(Number.isInteger(scale), `tile ${tile} scales by a fraction`).toBe(true);
      expect(scale, `tile ${tile} scales a figure away`).toBeGreaterThanOrEqual(1);
    }
    // The grid the game is on, and the one it grew from.
    expect(figureScale(128)).toBe(4);
    expect(figureScale(32)).toBe(1);
  });

  it('draws everybody else at half that, and never smaller', () => {
    // **The requirement, stated as the ratio rather than the pixels**: a traveller is half the
    // player so there is room to draw the mount they are riding. At the 128 grid that is 52x80
    // against 104x160.
    expect(travellerScale(128)).toBe(figureScale(128) / TRAVELLER_SHRINK);
    expect(PLAYER_FRAME.width * travellerScale(128)).toBe(52);
    expect(PLAYER_FRAME.height * travellerScale(128)).toBe(80);

    // A quarter was the other end of what was asked for and is not reachable by halving twice:
    // 1x is the art at native size, 26 pixels across a 128 tile, and the floor stops it going
    // below that on any grid.
    for (const tile of [32, 48, 64, 96, 128]) {
      const scale = travellerScale(tile);
      expect(Number.isInteger(scale), `tile ${tile} scales a traveller by a fraction`).toBe(true);
      expect(scale, `tile ${tile} scales a traveller away`).toBeGreaterThanOrEqual(1);
      expect(scale, `tile ${tile} draws a traveller larger than the player`)
        .toBeLessThanOrEqual(figureScale(tile));
    }
  });
});

describe('the sheets that draw a traveller', () => {
  // **The join this guards is a name dealt with no art behind it.** `TRAVELLER_SHEETS` in
  // `content/travellers.ts` is a list of strings -- it has to be, because `content/` does not import
  // `game/` -- so nothing in the type system connects a dealt name to a loaded texture. Get it wrong
  // and Phaser draws a green `__MISSING` square, which is the kind of thing that ships.

  it('is never offered as the player, whatever the URL says', () => {
    // A `?as=traveller-carrier` would put the player in a figure with no sitting art and a name that
    // reads as a job rather than a person. `characterFor` only knows `CHARACTERS`, and this asserts
    // that stays true as the traveller list grows.
    for (const key of Object.keys(TRAVELLER_ART)) {
      expect(characterFor(key).key, `${key} is reachable as a playable character`).toBe('varuna');
      expect(everyCharacter().map((c) => c.key)).not.toContain(key);
    }
  });

  it('is loaded and animated by the scene, which reads a different list', () => {
    // The scene iterated `everyCharacter()` for loading and for animations, so a traveller sheet
    // would have been built, committed and drawn by nothing -- eight recorded instances of that in
    // this repository. `everySheet` is what it reads now, and it must cover both lists exactly.
    const sheets = everySheet().map((c) => c.key);
    for (const key of Object.keys(CHARACTERS)) expect(sheets).toContain(key);
    for (const key of Object.keys(TRAVELLER_ART)) expect(sheets).toContain(key);
    for (const key of Object.keys(NAMED_ART)) expect(sheets).toContain(key);
    expect(sheets.length).toBe(
      Object.keys(CHARACTERS).length + Object.keys(TRAVELLER_ART).length + Object.keys(NAMED_ART).length
    );
    expect(new Set(sheets).size, 'two sheets share a key').toBe(sheets.length);
  });

  it('gives every sheet a url and a name worth printing', () => {
    for (const art of everySheet()) {
      expect(art.url, `${art.key} has no sheet`).toBeTruthy();
      expect(art.name.length, `${art.key} has no name`).toBeGreaterThan(0);
    }
  });
});

describe('the cells a sheet was built at', () => {
  // `tools/characters.json` builds a sheet at its own cell when it says so, and `characters.ts`
  // loads it at `frame`. Neither knows about the other, so a sheet rebuilt at a new width would be
  // cut on the wrong grid -- every frame half one figure and half the next -- with nothing failing.
  const manifest = JSON.parse(
    readFileSync(join(__dirname, '..', 'tools', 'characters.json'), 'utf8')
  ) as { cell: { width: number; height: number }; characters: { id: string; cell?: { width: number; height: number } }[] };

  it('loads every sheet at the cell it was built at', () => {
    for (const art of everySheet()) {
      const row = manifest.characters.find((c) => c.id === art.key);
      expect(row, `${art.key} is loaded but the manifest does not build it`).toBeDefined();
      expect(frameOf(art.key), art.key).toEqual(row!.cell ?? manifest.cell);
    }
  });

  it('builds each sheet to exactly twenty frames of that cell', () => {
    for (const row of manifest.characters) {
      const png = join(__dirname, '..', 'assets', `${row.id}-overworld.png`);
      const buf = readFileSync(png);
      const cell = row.cell ?? manifest.cell;
      expect(buf.readUInt32BE(16), `${row.id} width`).toBe(cell.width * 20);
      expect(buf.readUInt32BE(20), `${row.id} height`).toBe(cell.height);
    }
  });

  it('draws the asuras taller than everybody, and nobody shorter than the shared cell', () => {
    const tall = manifest.characters.filter((c) => (c.cell?.height ?? manifest.cell.height) > manifest.cell.height);
    expect(tall.map((c) => c.id).sort()).toEqual(['asura-princess', 'traveller-asura']);
    for (const row of manifest.characters) {
      expect((row.cell ?? manifest.cell).height, row.id).toBeGreaterThanOrEqual(manifest.cell.height);
    }
  });
});
