// Leaving a map from where the cart leaves.
//
// The owner, 27 September: maps are left only from designated places, the way a horse-cart leaves a
// yard. Canon names them per map in `departs_from`; the travel screen reads the map anywhere and
// offers the cart only there, and arriving sets the traveller down at the new map's first.

import { describe, expect, it } from 'vitest';
import { arrivalPoint, fieldMap, fieldMaps, mayLeaveFrom } from '../src/content/places';

describe('where the cart leaves from', () => {
  it('is named for every map with a neighbour, and is on that map', () => {
    for (const map of fieldMaps) {
      if (map.neighbours.length === 0) continue;
      expect(map.departsFrom.length, `${map.id} has nowhere to leave from`).toBeGreaterThan(0);
      for (const p of map.departsFrom) expect(map.pointsOfInterest, `${map.id} leaves from ${p}`).toContain(p);
    }
  });

  it('is Lothal’s camp, the Narmada’s high camp, Dwarka’s caravan ground, and the Aravali’s two landings', () => {
    expect(fieldMap('field_map_lothal')!.departsFrom).toEqual(['poi_lothal_camp']);
    expect(fieldMap('field_map_narmada')!.departsFrom).toEqual(['poi_high_camp']);
    expect(fieldMap('field_map_dwarka')!.departsFrom).toEqual(['poi_caravan_camp']);
    expect(fieldMap('field_map_aravali')!.departsFrom).toEqual(['poi_first_pier', 'poi_far_landing']);
  });

  it('lets you leave only from there, and says where it is otherwise', () => {
    expect(mayLeaveFrom('field_map_lothal', 'poi_lothal_camp')).toEqual({ ok: true });
    expect(mayLeaveFrom('field_map_lothal', 'poi_eastern_field')).toEqual({
      ok: false,
      why: 'The cart leaves from the Camp in the Kilns.'
    });
    expect(mayLeaveFrom('field_map_lothal', null).ok).toBe(false);
    expect(mayLeaveFrom('field_map_aravali', 'poi_rail_head')).toEqual({
      ok: false,
      why: 'The cart leaves from the First Pier or the Far Landing.'
    });
    expect(mayLeaveFrom('field_map_aravali', 'poi_far_landing').ok).toBe(true);
  });

  it('sets a traveller arriving down where canon says arrivals come in, else the first cart point', () => {
    for (const map of fieldMaps) expect(arrivalPoint(map.id)).toBe(map.arrivesAt ?? map.departsFrom[0] ?? null);
  });

  it('brings the Aravali in at the Rail-Head, not on a floating island', () => {
    // Left from the First Pier and the Far Landing; arrived at by the Rail-Head, which is what the
    // map's arrival prose describes. Reading the first cart point put arrivals mid-strait.
    expect(arrivalPoint('field_map_aravali')).toBe('poi_rail_head');
    expect(mayLeaveFrom('field_map_aravali', 'poi_rail_head').ok).toBe(false);
  });
});
