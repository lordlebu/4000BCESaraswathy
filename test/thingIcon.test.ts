// Does every made thing get a mark?
//
// The point of `Record<MaterialClass, string>` is that a nineteenth material class fails the
// *build*. That guard is real but invisible, and it only covers the vocabularies the game has
// mirrored into types — it cannot notice canon shipping a value the type has not been taught.
// These check the data rather than the types, which is the half the compiler cannot reach.

import { describe, expect, it } from 'vitest';
import {
  CLASS_MARK,
  KIND_MARK,
  PROCESS_MARK,
  PROCESSES_WANTING_ART,
  VEHICLE_MARK,
  materialMark
} from '../src/ui/ThingIcon';
import { items, materials, processes, vehicles } from '../src/content/making';

describe('every made thing has a mark', () => {
  it('covers every class canon actually uses', () => {
    const used = new Set(materials.flatMap((m) => m.classes));
    for (const c of used) {
      expect(CLASS_MARK[c], `no mark for material class '${c}'`).toBeTruthy();
    }
    expect(used.size).toBeGreaterThan(10);
  });

  it('covers every item kind canon actually uses', () => {
    const used = new Set(items.map((i) => i.kind));
    for (const k of used) expect(KIND_MARK[k], `no mark for item kind '${k}'`).toBeTruthy();
    expect(used.size).toBeGreaterThan(5);
  });

  it('covers every process canon actually uses', () => {
    // Keyed by string like `VEHICLE_MARK`, because canon's process ids are not mirrored into a
    // union here -- so this test is the only guard, which is why it is written rather than
    // trusted. Processes were the last uncovered vocabulary in the making layer: a recipe wore
    // the mark of its output and the verb that produced it had none at all.
    const used = processes.map((p) => p.id.replace('process_', ''));
    for (const p of used) expect(PROCESS_MARK[p], `no mark for process '${p}'`).toBeTruthy();
    expect(used.length).toBe(17);
  });

  it('is honest about which process marks are stand-ins', () => {
    // Four crafts have no emoji that fits -- casting bronze, grinding at a quern, pressing oil,
    // retting flax -- because Unicode never had reason to encode them. They carry the nearest
    // honest thing until a drawing lands in `src/ui/marks/`. This asserts the list stays true:
    // every name on it is a real process, so it cannot rot into naming something that is gone.
    const known = new Set(processes.map((p) => p.id.replace('process_', '')));
    for (const p of PROCESSES_WANTING_ART) {
      expect(known.has(p), `'${p}' is not a process canon has`).toBe(true);
      expect(PROCESS_MARK[p], `'${p}' must still have a stand-in`).toBeTruthy();
    }
  });

  it('covers every vehicle kind canon actually uses', () => {
    // `VEHICLE_MARK` is keyed by string rather than a union, because canon's vehicle `kind` is
    // not mirrored into a type here — so this test is the only guard it has, and is why it
    // exists rather than being folded into the one above.
    for (const v of vehicles) {
      expect(VEHICLE_MARK[v.kind], `no mark for vehicle kind '${v.kind}'`).toBeTruthy();
    }
  });

  it('gives every material in canon a mark, without guessing', () => {
    for (const m of materials) {
      expect(materialMark(m.classes), `${m.id} drew nothing`).toBeTruthy();
    }
  });

  it('draws stuff and made things differently', () => {
    // The one thing that would make the panel worse than no marks at all: reed fibre and reed
    // rope wearing the same glyph, at the moment a player is learning they are not the same.
    const fibre = materialMark(['fibre']);
    const rope = KIND_MARK[items.find((i) => i.id === 'item_reed_rope')!.kind];
    expect(fibre).not.toBe(rope);
  });

  it('says nothing about damage', () => {
    // The cozy ruling, in the one place a glyph could quietly undo it: a blade or a gun would
    // read as a stat line where a trident reads as an object somebody carries.
    for (const banned of ['🗡️', '🔪', '⚔️', '🏹', '🔫', '💥']) {
      expect(Object.values(KIND_MARK)).not.toContain(banned);
    }
    expect(KIND_MARK.weapon).toBe('🔱');
  });
});
