// The four layer rules in CLAUDE.md, as a check rather than a paragraph.
//
// **Only one of them was enforced, and by accident.** Rule 1 says `world/` and `content/` import
// neither React nor Phaser. Running the tests under Node catches Phaser, because it reaches for a
// canvas on load and throws -- but React runs happily under Node, so a `useMemo` imported into
// `content/` would pass every test while making the rules layer depend on the view. Rule 2 (Phaser
// only in `game/`) was not checked at all. This reads the imports and says so by file.
//
// Deliberately a text scan rather than a lint dependency: the project's conventions say a
// dependency must justify itself, and six regular expressions over one tree do not need one.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = join(__dirname, '..', 'src');

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return filesUnder(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

/** Every module a file imports at runtime. `import type` is erased and does not count. */
function importsOf(file: string): string[] {
  const text = readFileSync(file, 'utf8');
  const out: string[] = [];
  for (const m of text.matchAll(/^\s*import\s+(?!type\s)[^'"]*?from\s+['"]([^'"]+)['"]/gm)) out.push(m[1]!);
  for (const m of text.matchAll(/^\s*import\s+['"]([^'"]+)['"]/gm)) out.push(m[1]!);
  return out;
}

const rel = (file: string) => relative(SRC, file).replace(/\\/g, '/');

describe('the layers', () => {
  it('keeps world/ and content/ free of React, Phaser, the scene and the chrome', () => {
    const bad: string[] = [];
    for (const file of [...filesUnder(join(SRC, 'world')), ...filesUnder(join(SRC, 'content'))]) {
      for (const spec of importsOf(file)) {
        if (/^(react|react-dom|phaser)(\/|$)/.test(spec) || /(^|\/)(game|ui)\//.test(spec)) {
          bad.push(`${rel(file)} imports ${spec}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('keeps Phaser inside game/', () => {
    const bad: string[] = [];
    for (const file of filesUnder(SRC)) {
      if (rel(file).startsWith('game/')) continue;
      for (const spec of importsOf(file)) if (/^phaser(\/|$)/.test(spec)) bad.push(`${rel(file)} imports ${spec}`);
    }
    expect(bad).toEqual([]);
  });

  it('actually reads imports, so an empty answer means something', () => {
    // Guards the guard: if the pattern stopped matching, both checks above would pass on nothing.
    const scene = importsOf(join(SRC, 'game', 'scenes', 'WorldScene.ts'));
    expect(scene).toContain('phaser');
    expect(importsOf(join(SRC, 'content', 'happenings.ts'))).toContain('./looks');
  });
});
