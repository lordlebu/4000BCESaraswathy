// What the Vedda say on the road: canon's sayings, as the cutscenes will draw them.

import { describe, expect, it } from 'vitest';
import { sayingFor, sayings, type Occasion } from '../src/content/sayings';

const OCCASIONS: Occasion[] = ['opening', 'dawn', 'departure', 'road', 'crossing', 'arrival', 'night', 'fireside', 'settling'];
const roll = (n: number) => () => n;

describe('the sayings', () => {
  it('reach the game from canon, every one credited in the world', () => {
    expect(sayings.length).toBeGreaterThanOrEqual(33);
    for (const s of sayings) {
      expect(s.attribution, s.id).toMatch(/Vedda|Walking Song/);
      // The owner's ruling: an original line is never printed as a quotation of a real text.
      expect(s.attribution, s.id).not.toMatch(/Rigveda|RV \d/);
      expect(s.text, s.id).not.toMatch(/horse/i);
    }
  });

  it('has something to say at every moment the cutscenes have', () => {
    for (const o of OCCASIONS) expect(sayingFor(o, 'field_map_lothal', roll(0)), o).not.toBeNull();
  });

  it('prefers the line that belongs to the map', () => {
    expect(sayingFor('road', 'field_map_narmada', roll(0))?.fieldMaps).toContain('field_map_narmada');
    expect(sayingFor('crossing', 'field_map_aravali', roll(0))?.id).toBe('saying_the_land_remembers');
  });

  it('never offers a line tied to another map', () => {
    for (let n = 0; n < 40; n++) {
      const s = sayingFor('road', 'field_map_lothal', roll(n));
      expect(s!.fieldMaps.length === 0 || s!.fieldMaps.includes('field_map_lothal'), s!.id).toBe(true);
    }
  });

  it('is the same for the same roll, and avoids the line just said', () => {
    const a = sayingFor('fireside', null, roll(3));
    expect(sayingFor('fireside', null, roll(3))).toEqual(a);
    expect(sayingFor('fireside', null, roll(3), [a!.id])?.id).not.toBe(a!.id);
  });
});
