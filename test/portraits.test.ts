// What is allowed to sit in src/ui/portraits/.
//
// The same net as `test/platesFolder.test.ts`, cast for the same two failures — both of which have
// already happened with plates and neither of which is visible in the game, in a type, or in a
// lint:
//
//   * A portrait filed under the **canon** id (`npc_thrali`) rather than the person
//     (`thrali`) matches nothing, throws nothing, and quietly keeps drawing the silhouette.
//   * A **raw** straight from an image model, dropped here instead of `assets/source/portraits/`,
//     is 2–8 MB rather than ~60 KB and is named `Grok portrait-thrali.png`, which nobody will ever
//     ask for. It ships the megabytes and draws nothing.
//
// The folder is legitimately empty until somebody paints one, so every case here has to hold for
// an empty folder too — a test that only works once there is art in it is a test that goes green
// for the wrong reason for as long as it matters most.

import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import placesBundle from '../data/canon/places.json';
import { portraitName } from '../src/ui/portraits';

const PORTRAITS = join(__dirname, '..', 'src', 'ui', 'portraits');

/**
 * The ceiling for a built portrait, in kilobytes.
 *
 * A plate is capped at 250 at 384px; a portrait is 256px, which is about 45% of the pixels, so 150
 * is the same kind of bound with the same generous margin. It is a "something is wrong" line — a
 * raw is megabytes — rather than a budget to optimise against.
 */
const MAX_KB = 150;

const people = new Set(placesBundle.npcs.map((n: { id: string }) => portraitName(n.id)));

const files = existsSync(PORTRAITS)
  ? readdirSync(PORTRAITS).filter((f) => /\.(png|webp|jpe?g)$/i.test(f))
  : [];

describe('src/ui/portraits holds built portraits and nothing else', () => {
  it('names somebody who exists', () => {
    for (const file of files) {
      const name = file.replace(/\.[^.]+$/, '');
      expect(
        people.has(name),
        `${file} names nobody in canon. Portraits are filed under the person without canon's ` +
          `prefix — thrali.png, not npc_thrali.png. Known: ${[...people].sort().join(', ')}`
      ).toBe(true);
    }
  });

  it('holds nothing a tool named', () => {
    for (const file of files) {
      expect(
        /^(chatgpt|gemini|grok|dalle|midjourney|firefly)/i.test(file),
        `${file} is a raw. Put it in assets/source/portraits/ and run ` +
          `\`node tools/build-plates.js --portraits\`.`
      ).toBe(false);
    }
  });

  it('is built rather than dropped in', () => {
    for (const file of files) {
      const kb = statSync(join(PORTRAITS, file)).size / 1024;
      expect(kb, `${file} is ${kb.toFixed(0)} KB, which is a raw rather than a built portrait`).
        toBeLessThan(MAX_KB);
    }
  });

  it('is a PNG, because that is what the build writes', () => {
    for (const file of files) expect(file.endsWith('.png'), `${file}`).toBe(true);
  });
});

describe('portraitName', () => {
  it('drops the canon prefix', () => {
    expect(portraitName('npc_thrali')).toBe('thrali');
  });

  it('leaves a bare name alone, so the rule is safe to apply twice', () => {
    expect(portraitName('thrali')).toBe('thrali');
  });

  it('gives every person in canon a distinct name', () => {
    // Two people collapsing to one file name would mean one of them silently wearing the other's
    // face. Cheap to check and impossible to notice by eye.
    const names = placesBundle.npcs.map((n: { id: string }) => portraitName(n.id));
    expect(new Set(names).size).toBe(names.length);
  });

  it('produces a name a file system and a glob are both happy with', () => {
    for (const n of placesBundle.npcs as { id: string }[]) {
      expect(portraitName(n.id)).toMatch(/^[a-z0-9-]+$/);
    }
  });
});
