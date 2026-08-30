// Settling a question, which until now could not be done at all.
//
// The rules for which readings are reachable have been tested since the knowledge layer
// landed. What was never tested — because nothing called it — is the work around them:
// gathering the evidence you hold, laying two records side by side, and committing.

import { describe, expect, it } from 'vitest';
import {
  classify,
  compare,
  crossReference,
  evidenceFor,
  readingsFor,
  speciesFor
} from '../src/content/investigate';
import {
  advance,
  answer,
  canAdvance,
  emptyProgress,
  hear,
  linesFor,
  type Progress
} from '../src/journey';
import { discoveries } from '../src/content/knowledge';

const MOMENTS = ['dawn', 'morning', 'afternoon', 'evening', 'night'].flatMap((timeOfDay) =>
  ['clear', 'rain', 'mist', 'storm'].map((weather) => ({ timeOfDay, weather }))
);

function climb(progress: Progress, id: string): Progress {
  let p = progress;
  for (;;) {
    const m = MOMENTS.find((x) => canAdvance(p, id, x));
    if (!m) return p;
    p = advance(p, id, m);
  }
}

describe('the evidence you hold', () => {
  it('lists what a question rests on, in the order canon argues it', () => {
    const held = evidenceFor(emptyProgress(), 'question_silver_water');
    expect(held.length).toBeGreaterThan(1);
    expect(held.map((e) => e.id)).toEqual([
      'discovery_silver_water',
      'discovery_dockyard_reef',
      'discovery_ghost_mangrove_channel'
    ]);
  });

  it('says plainly that you have none of it yet', () => {
    for (const e of evidenceFor(emptyProgress(), 'question_silver_water')) {
      expect(e.held).toBe(false);
      expect(e.written).toBeNull();
    }
  });

  it('carries what the player actually wrote, not the canon text', () => {
    const p = climb(emptyProgress(), 'discovery_dockyard_reef');
    const reef = evidenceFor(p, 'question_silver_water').find((e) => e.id === 'discovery_dockyard_reef')!;
    expect(reef.held).toBe(true);
    expect(reef.understood).toBe(true);
    expect(reef.written).toBeTruthy();
  });

  it('is empty for a question that does not exist', () => {
    expect(evidenceFor(emptyProgress(), 'question_nothing')).toEqual([]);
  });
});

describe('the readings', () => {
  it('shows every account from the start — the disagreement is the content', () => {
    const all = readingsFor(emptyProgress(), 'question_silver_water');
    expect(all.length).toBeGreaterThan(1);
    // Unlike the diary, nothing is hidden: you can see there are readings you cannot support.
    expect(all.every((r) => !r.available)).toBe(true);
  });

  it('names what is missing in words, not ids', () => {
    const [first] = readingsFor(emptyProgress(), 'question_silver_water');
    expect(first!.missing.length).toBeGreaterThan(0);
    for (const m of first!.missing) expect(m).not.toMatch(/^discovery_|^word_/);
  });

  it('opens the wrong reading before the right one', () => {
    let p = climb(emptyProgress(), 'discovery_silver_water');
    const open = readingsFor(p, 'question_silver_water').filter((r) => r.available);
    expect(open.length).toBeGreaterThan(0);
    expect(open.every((r) => !r.sound)).toBe(true);

    p = climb(p, 'discovery_dockyard_reef');
    expect(readingsFor(p, 'question_silver_water').some((r) => r.available && r.sound)).toBe(true);
  });

  it('does not tell you that you were wrong', () => {
    // Being mistaken has to survive being committed, or there is no reason to keep looking.
    let p = climb(emptyProgress(), 'discovery_silver_water');
    p = answer(p, 'question_silver_water', 0);
    const chosen = readingsFor(p, 'question_silver_water').find((r) => r.chosen)!;
    expect(chosen.sound).toBe(false);
    expect(chosen.troubled).toBe(false);
  });

  it('lets later evidence trouble a reading the player already gave', () => {
    let p = climb(emptyProgress(), 'discovery_silver_water');
    p = answer(p, 'question_silver_water', 0);
    // The reef is what canon names as the thing that eventually contradicts the moon reading.
    p = climb(p, 'discovery_dockyard_reef');
    expect(readingsFor(p, 'question_silver_water').find((r) => r.chosen)!.troubled).toBe(true);
  });

  it('records what the player settled on, wrong or not', () => {
    let p = climb(emptyProgress(), 'discovery_silver_water');
    p = answer(p, 'question_silver_water', 0);
    const chosen = readingsFor(p, 'question_silver_water').filter((r) => r.chosen);
    expect(chosen).toHaveLength(1);
    expect(chosen[0]!.sound).toBe(false);
  });
});

describe('two records side by side', () => {
  it('follows a canon cross-reference back to a species', () => {
    expect(speciesFor('fauna_lothal_marsh_lurker')?.name).toBe('Lothal Marsh-Lurker');
    expect(speciesFor('flora_saltreed')?.name).toBe('Saltreed');
    expect(speciesFor('fauna_nothing_at_all')).toBeNull();
  });

  it('lays out where two specimens agree and where they do not', () => {
    const rows = compare('fauna_lava_vent_tubeworm', 'fauna_lava_vent_tubeworm_asurica');
    expect(rows.length).toBeGreaterThan(3);

    // Two Riftia from the same vents: same region, same ground, same rarity, different animal.
    // Showing agreement *and* disagreement in one view is the whole job of this component.
    expect(rows.find((r) => r.field === 'Binomial')?.same).toBe(false);
    expect(rows.find((r) => r.field === 'Region')?.same).toBe(true);
    expect(rows.find((r) => r.field === 'How often')?.same).toBe(true);

    // These two used to share the name "Lava-Vent Tubeworm", and this test asserted it as
    // "precisely the archive's problem". It was a real problem rather than a feature: two
    // entities answering to one name meant the tool that assigned canon's clades classified only
    // one of them. Canon renamed the second and `lint_story.py` now forbids the pattern outright,
    // so the fixture had to change with it.
    expect(rows.find((r) => r.field === 'Name')?.same).toBe(false);
  });

  it('says nothing rather than guessing when a record is missing', () => {
    expect(compare('fauna_lothal_marsh_lurker', 'fauna_nothing')).toEqual([]);
  });
});

describe('what a thing is, and what has looked at it', () => {
  it('reports canon facts and the discoveries that concern it', () => {
    const c = classify(emptyProgress(), 'fauna_lothal_marsh_lurker')!;
    expect(c.name).toBe('Lothal Marsh-Lurker');
    expect(c.facts.map((f) => f.label)).toContain('Binomial');
    expect(c.studiedBy.map((s) => s.id)).toContain('discovery_marsh_lurker_habits');
    expect(c.studiedBy.every((s) => !s.found)).toBe(true);
  });

  it('every `subject` in canon resolves to something', () => {
    // The field had no consumer until now, so its ids had never been checked against anything.
    for (const d of discoveries) {
      if (!d.subject) continue;
      const known = speciesFor(d.subject) !== null || d.subject.startsWith('settlement_') || d.subject.startsWith('faction_');
      expect(known, `${d.id} has subject ${d.subject}, which resolves to nothing`).toBe(true);
    }
  });

  it('returns nothing for an entity canon does not have', () => {
    expect(classify(emptyProgress(), 'fauna_invented')).toBeNull();
  });
});

describe('cross-reference', () => {
  it('shows nothing before the player has found anything', () => {
    const links = crossReference(emptyProgress(), 'flora_saltreed');
    expect(links.discoveries).toEqual([]);
    expect(links.questions).toEqual([]);
  });

  it('is not a spoiler engine — only what has been noticed', () => {
    const p = advance(emptyProgress(), 'discovery_saltreed_thatch');
    const links = crossReference(p, 'flora_saltreed');
    expect(links.discoveries).toContain('discovery_saltreed_thatch');
  });

  it('surfaces a question only once somebody has raised it', () => {
    let p = advance(emptyProgress(), 'discovery_saltreed_thatch');
    expect(crossReference(p, 'flora_saltreed').questions).toEqual([]);

    // Bekh raises the eastern field question; the link appears once it has been heard.
    for (let i = 0; i < linesFor(p, 'npc_bekh').length; i += 1) p = hear(p, 'npc_bekh', i).progress;
    expect(p.questions.length).toBeGreaterThan(0);
  });
});
