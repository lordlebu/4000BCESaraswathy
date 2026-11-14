import { describe, expect, it } from 'vitest';
import { buildFieldMap } from '../src/world/fieldMap';
import { fieldMap } from '../src/content/places';
import { happeningNow, surroundingsAt } from '../src/content/happenings';

describe('conversations along the twin-city causeway', () => {
  const map = 'field_map_twins';
  const built = buildFieldMap(fieldMap(map)!, { seed: 'twin-review' });
  const now = { occasion: 'road' as const, fieldMapId: map, day: 0, shelter: null, holds: [], seen: [], met: [] };
  const bridge = built.world.tiles.flat().find(t => t.road && t.bridge)!;
  const around = surroundingsAt(built.world, bridge, map, { timeOfDay: 'evening', weather: 'clear' }, () => 0, { strangerId: 'company_carrier' })!;

  it('introduces a visible stranger when explicitly asked at dusk, but keeps automatic encounters daytime-only', () => {
    expect(around.onWater).toBe(false);
    expect(happeningNow(now, () => 0, around, [], { kind: 'company' })).toBeNull();
    expect(happeningNow(now, () => 0, around, [], { kind: 'company', asked: true })?.stranger?.id).toBe(`${map}:company_carrier`);
  });

  it('keeps unbridged water out of land conversations even when asked', () => {
    expect(happeningNow(now, () => 0, { ...around, onWater: true }, [], { kind: 'company', asked: true })).toBeNull();
  });
});
