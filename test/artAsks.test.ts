// Does every card on the art plan name a file the game will actually draw?
//
// **A painting saved under a wrong name matches nothing, throws nothing, and keeps drawing the
// fallback.** That has happened in every art folder, and the plan is where the name is first
// written down, so it is the cheapest place to check it: before anybody has painted anything.
//
// Also holds the brief to the renderer. `docs/art-asks.md` and the published page come from one
// script so they cannot differ; this fails if somebody edits the markdown by hand, or edits the
// JSON and forgets to re-render.

import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import asks from '../docs/art-asks.json';
import species from '../data/canon/species.json';
import biomes from '../data/biomes.json';
import { GROUND_GROUP } from '../src/ui/scenes';
import { PROCESS_GESTURE } from '../src/content/making-gestures';

const ROOT = join(__dirname, '..');
const { idFor, KINDS } = createRequire(import.meta.url)('../tools/build-plates.js') as {
  idFor: (file: string, word?: string, keepUnderscores?: boolean) => string;
  KINDS: Record<string, { word: string; keepUnderscores?: boolean }>;
};
const { plateSave, sceneSave } = createRequire(import.meta.url)('../tools/render-art-asks.js') as {
  plateSave: (c: { file: string }) => string;
  sceneSave: (c: { file: string }) => string;
};

/** Engine ids of every animal the game can place: `fauna_desert_fox` -> `desert-fox`. */
const ENGINE = new Set(
  (species as { fauna: { id: string }[] }).fauna.map((f) => f.id.slice('fauna_'.length).replace(/_/g, '-'))
);
const BIOMES = new Set((biomes as { id: string }[]).map((b) => b.id));
const GROUPS = new Set(Object.values(GROUND_GROUP));
const SHELTERS = new Set(['palace', 'settlement', 'roof', 'camp', 'tent', 'bedroll', 'none']);
/** `process_firing` -> `stalk-firing`: the name a bench asks `sceneFor` for. */
const BENCH = new Set(
  Object.entries(PROCESS_GESTURE).map(([p, g]) => `${g}-${p.slice('process_'.length)}`)
);

describe('the art plan asks for files the game will draw', () => {
  it.each(asks.plates.map((p) => p.file))('plate %s is an animal the game places', (file) => {
    expect(ENGINE.has(file), `${file} is not an engine species id, so no plate lookup will find it`).toBe(true);
    expect(existsSync(join(ROOT, 'src', 'ui', 'plates', `${file}.png`)), `${file} is already painted`).toBe(false);
  });

  it.each(asks.plates.map((p) => p.file))('plate %s builds under its own name', (file) => {
    expect(idFor(plateSave({ file }), KINDS.plate!.word, KINDS.plate!.keepUnderscores)).toBe(file);
  });

  it.each(asks.scenes.map((s) => s.file))('scene %s is a name sceneFor asks for', (file) => {
    const [gesture, ...rest] = file.split('-');
    const variant = rest.join('-');
    const legal =
      BENCH.has(file) ||
      (gesture === 'rest' && SHELTERS.has(variant)) ||
      (gesture !== 'rest' && (BIOMES.has(variant) || GROUPS.has(variant)));
    expect(legal, `${file} is not a bench process, a night or a ground, so nothing will ever draw it`).toBe(true);
  });

  it.each(asks.scenes.map((s) => s.file))('scene %s builds under its own name', (file) => {
    expect(idFor(sceneSave({ file }), KINDS.scene!.word, KINDS.scene!.keepUnderscores)).toBe(file);
  });

  it('asks for each file once', () => {
    const all = [...asks.plates.map((p) => p.file), ...asks.scenes.map((s) => s.file)];
    expect(new Set(all).size).toBe(all.length);
  });

  it('keeps the brief in step with the renderer', () => {
    // Line endings normalised: a Windows checkout turns the file CRLF and the renderer writes LF.
    const read = () => readFileSync(join(ROOT, 'docs', 'art-asks.md'), 'utf8').replace(/\r\n/g, '\n');
    const before = read();
    execFileSync(process.execPath, [join(ROOT, 'tools', 'render-art-asks.js')], { cwd: ROOT });
    const after = read();
    expect(after, 'docs/art-asks.md was edited by hand or not re-rendered: run node tools/render-art-asks.js').toBe(before);
  });
});
