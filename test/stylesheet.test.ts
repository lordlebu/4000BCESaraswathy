// The two things a 2,400-line stylesheet with one namespace can get wrong quietly.
//
// **Both of these are guards written after the fact.** Nothing in the suite could see either, and
// neither produced an error, a warning or a failing test — one was found by taking a screenshot and
// the other by reading a comment that worked out a stacking conflict by reasoning about the
// numbers.
//
// This reads the CSS as text rather than through a parser. A parser would be more correct and is
// not worth a dependency for two rules; what matters is that both questions are asked at all.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const CSS = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'ui', 'styles.css'),
  'utf8'
);

/** The sheet with its comments removed, so a class named in prose is not read as a rule. */
const bare = CSS.replace(/\/\*[\s\S]*?\*\//g, '');

/**
 * Every selector declared at the top level, with the line it starts on.
 *
 * Top level only: a rule inside `@media` is a variant of the rule outside it and repeating the
 * selector there is the whole point. Brace counting rather than a regex, because a selector list
 * can span lines and a declaration can contain a brace inside a `url()`.
 */
function topLevelSelectors(): { line: number; selector: string }[] {
  const out: { line: number; selector: string }[] = [];
  let depth = 0;
  let line = 1;
  let buffer = '';

  for (const ch of bare) {
    if (ch === '\n') line += 1;
    if (ch === '{') {
      if (depth === 0) out.push({ line, selector: buffer.trim().replace(/\s+/g, ' ') });
      depth += 1;
      buffer = '';
    } else if (ch === '}') {
      depth -= 1;
      buffer = '';
    } else if (depth === 0) {
      buffer += ch;
    }
  }
  return out;
}

describe('a class name belongs to one component', () => {
  /**
   * **The fault:** the opened plate card was written as `.specimen`, five hundred lines above a
   * `.specimen` the field kit already used for its comparison chips. Both declarations were valid,
   * the later one won, and the card rendered as a transparent 999-pixel-radius lozenge with the
   * album showing straight through its text — while in the other direction it was giving each of
   * those chips `width: min(24rem, 100%)` and `overflow: hidden`.
   *
   * Nothing failed. It was found by taking a screenshot.
   *
   * The rule is narrow on purpose: **a bare single class, declared twice at the top level.** That
   * is the shape of the collision. `.dock` and `.dock[data-height='peek']` are one component
   * describing its own states; `.specimen` twice is two components that do not know about each
   * other. A rule that genuinely has to be split is also a rule somebody will not find when they
   * grep for the class, so having to merge it is not a cost.
   */
  it('is declared once at the top level, or not at all', () => {
    const byName = new Map<string, number[]>();
    for (const { line, selector } of topLevelSelectors()) {
      if (!/^\.[A-Za-z0-9_-]+$/.test(selector)) continue;
      byName.set(selector, [...(byName.get(selector) ?? []), line]);
    }

    const twice = [...byName.entries()]
      .filter(([, lines]) => lines.length > 1)
      .map(([name, lines]) => `${name} at lines ${lines.join(' and ')}`);

    expect(
      twice,
      `a class is declared twice at the top level, which is how \`.specimen\` was claimed by two ` +
        `components at once: ${twice.join('; ')}. Merge the rules, or rename one — whichever is ` +
        `true of what they are.`
    ).toEqual([]);
  });

  it('found enough rules to be asking the question', () => {
    // Guards the guard. A parse that silently returns nothing would make the assertion above pass
    // against an empty list for ever.
    expect(topLevelSelectors().length).toBeGreaterThan(200);
  });
});

describe('what is in front of what', () => {
  /**
   * **The numbers were 2, 3, 4, 5, 35, 40, 60 and 100**, and one comment in the sheet worked out a
   * stacking conflict by reasoning about them. Nothing had broken by the time this was written — the
   * dock's grip disappearing behind the satchel strip was a height rather than a layer — but a new
   * panel picking a number out of the air is exactly how that class of fault arrives.
   */
  it('is a named scale, with no raw numbers left', () => {
    const raw = [...bare.matchAll(/z-index:\s*([^;]+);/g)]
      .map((m) => m[1]!.trim())
      .filter((value) => !value.startsWith('var(--z-'));

    expect(
      raw,
      `a z-index that is not on the scale: ${raw.join(', ')}. Add a token to :root rather than ` +
        `picking a number — the order of the tokens is the order things are in front of each other.`
    ).toEqual([]);
  });

  it('declares every token it uses', () => {
    const used = new Set(
      [...bare.matchAll(/var\((--z-[a-z-]+)\)/g)].map((m) => m[1]!)
    );
    const declared = new Set([...bare.matchAll(/(--z-[a-z-]+):\s*\d+;/g)].map((m) => m[1]!));

    const missing = [...used].filter((token) => !declared.has(token));
    expect(missing, `used but never declared: ${missing.join(', ')}`).toEqual([]);
    expect(used.size, 'no z tokens are used at all — has the scale been bypassed?').toBeGreaterThan(4);
  });
});
