// People who come to you: the rule, and its joins to canon and to the art.
//
// The walk itself is the scene's and is checked in a browser (`e2e/happenings.spec.ts`). What can
// be wrong here is a join -- a person canon does not place where they are said to come over, or a
// sheet nothing loads -- and each of those fails silently in play: nobody walks up, and no test of
// the scene could say why.

import { describe, expect, it } from 'vitest';
import { APPROACHES, approachAt, approachId } from '../src/content/visitors';
import { npc } from '../src/content/places';
import { NAMED_ART, frameOf } from '../src/game/characters';

describe('somebody who comes over', () => {
  it('is somebody canon places exactly where they come over', () => {
    for (const a of APPROACHES) {
      const person = npc(a.npcId);
      expect(person, `${a.npcId} is not in canon`).not.toBeNull();
      expect(person!.foundAt, `${a.npcId} is not found at ${a.at}`).toContain(a.at);
    }
  });

  it('walks up in a sheet the scene actually loads', () => {
    for (const a of APPROACHES) expect(Object.keys(NAMED_ART), a.sheet).toContain(a.sheet);
  });

  it('comes over once, the first time, and not anywhere else', () => {
    const [a] = APPROACHES;
    expect(approachAt(a!.at, [])?.npcId).toBe(a!.npcId);
    expect(approachAt(a!.at, [approachId(a!)])).toBeNull();
    expect(approachAt('poi_tide_market', [])).toBeNull();
  });

  it('draws the princess taller than everybody, at the cell she was built at', () => {
    expect(frameOf('asura-princess')).toEqual({ width: 28, height: 44 });
  });
});
