// The overworld's geometry, which is the half of a drawn map that can be quietly wrong.
//
// The load-bearing test is `neighbours are closer than strangers`. It caught a real mistake while
// the coordinates were being chosen: the first arrangement put the Dry Harbour where the Narmada
// crossing was the longest line on the map while two places that are *not* joined sat closer
// together, so the picture would have contradicted the connections it exists to show.

import { describe, expect, it } from 'vitest';
import {
  distanceBetween,
  labelAnchor,
  nodeFor,
  overworldShape,
  viewBoxFor
} from '../src/content/overworldMap';
import { fieldMaps } from '../src/content/places';
import type { FieldMap } from '../src/content/places';

const shape = overworldShape();

describe('every map is on the map', () => {
  it('places all four, because canon gave all four coordinates', () => {
    expect(shape.nodes).toHaveLength(fieldMaps.length);
  });

  it('keeps every node inside canon\u2019s 0\u2013100 box', () => {
    for (const n of shape.nodes) {
      expect(n.x, `${n.id} x`).toBeGreaterThanOrEqual(0);
      expect(n.x, `${n.id} x`).toBeLessThanOrEqual(100);
      expect(n.y, `${n.id} y`).toBeGreaterThanOrEqual(0);
      expect(n.y, `${n.id} y`).toBeLessThanOrEqual(100);
    }
  });

  it('gives every map its own spot', () => {
    const spots = shape.nodes.map((n) => `${n.x},${n.y}`);
    expect(new Set(spots).size).toBe(spots.length);
  });

  it('leaves out a map canon has not placed rather than dropping it at the origin', () => {
    // Quiet canon means "not authored yet". Four unplaced maps stacked at (0,0) would read as a
    // bug in the drawing rather than a gap in the writing.
    const unplaced = [{ ...fieldMaps[0]!, id: 'field_map_nowhere', coordinates: null } as FieldMap];
    expect(overworldShape(unplaced).nodes).toHaveLength(0);
    expect(overworldShape(unplaced).edges).toHaveLength(0);
  });
});

describe('roads', () => {
  it('draws one line per road, not two', () => {
    // Canon states each edge from both ends, so a naive walk yields every road twice -- which
    // would double each stroke's opacity and make the roads look heavier than they are.
    const keys = shape.edges.map((e) => [e.from, e.to].sort().join('|'));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('joins only maps that canon says are joined', () => {
    for (const e of shape.edges) {
      const from = fieldMaps.find((m) => m.id === e.from)!;
      const to = fieldMaps.find((m) => m.id === e.to)!;
      expect(
        from.neighbours.includes(to.id) || to.neighbours.includes(from.id),
        `${e.from} and ${e.to} are drawn joined but canon does not join them`
      ).toBe(true);
    }
  });

  it('has both ends of every road on the map', () => {
    for (const e of shape.edges) {
      expect(nodeFor(shape, e.from), `${e.from} missing`).not.toBeNull();
      expect(nodeFor(shape, e.to), `${e.to} missing`).not.toBeNull();
    }
  });

  it('leaves nothing stranded', () => {
    // Every map should be reachable on the drawing, or the picture shows a place with no way in.
    for (const n of shape.nodes) {
      const touching = shape.edges.filter((e) => e.from === n.id || e.to === n.id);
      expect(touching.length, `${n.name} has no road`).toBeGreaterThan(0);
    }
  });
});

/** The furthest road and the nearest gap-with-no-road, in canon's units. */
function spread(of: ReturnType<typeof overworldShape>) {
  const joined: number[] = [];
  const strangers: number[] = [];
  for (let i = 0; i < of.nodes.length; i += 1) {
    for (let j = i + 1; j < of.nodes.length; j += 1) {
      const a = of.nodes[i]!;
      const b = of.nodes[j]!;
      const d = distanceBetween(a, b);
      const isJoined = of.edges.some(
        (e) => (e.from === a.id && e.to === b.id) || (e.from === b.id && e.to === a.id)
      );
      (isJoined ? joined : strangers).push(d);
    }
  }
  return { furthestRoad: Math.max(...joined), nearestStranger: Math.min(...strangers) };
}

describe('neighbours are closer than strangers', () => {
  it('so the picture agrees with the connections it draws', () => {
    // If the furthest joined pair is further apart than the nearest unjoined pair, the drawing
    // misleads: two places look adjacent while no road exists, and two joined places look distant.
    const { furthestRoad, nearestStranger } = spread(shape);
    expect(
      furthestRoad,
      `furthest road ${furthestRoad.toFixed(1)} vs nearest stranger ${nearestStranger.toFixed(1)}`
    ).toBeLessThan(nearestStranger);
  });

  it('would catch a layout that misleads', () => {
    // Not hypothetical. During authoring the Dry Harbour was first placed at (86, 74), which made
    // its road to Narmada the longest line on the map at 68 units while Dwarka and Narmada, which
    // have no road between them, sat 60 apart. That map has since been retired, so the fixture is
    // rebuilt from the three that remain.
    //
    // The maps form a chain -- Dwarka to Lothal to Narmada -- so the way to mislead with three is
    // to put the middle of the chain far from both its ends. Then the two roads are long while the
    // pair with no road between them sits close, and the drawing says the opposite of the truth.
    const at = (id: string, x: number, y: number) =>
      ({ ...fieldMaps.find((m) => m.id === id)!, coordinates: { x, y } });
    const bad = spread(
      overworldShape([
        at('field_map_dwarka', 50, 50),
        at('field_map_narmada', 55, 55),
        at('field_map_lothal', 5, 95)
      ])
    );
    expect(bad.furthestRoad).toBeGreaterThan(bad.nearestStranger);
  });
});

describe('distanceBetween', () => {
  it('measures a straight line', () => {
    expect(
      distanceBetween({ id: 'a', name: 'a', x: 0, y: 0 }, { id: 'b', name: 'b', x: 3, y: 4 })
    ).toBe(5);
  });
});

describe('the drawing fits what is drawn', () => {
  it('boxes the continent rather than canon’s whole square', () => {
    // Four maps never fill 0-100, and drawing the full square left a band of empty page below the
    // continent as tall as the continent itself. Measured on screen: 460px tall became 313px.
    const [x, y, w, h] = viewBoxFor(shape).split(' ').map(Number) as [number, number, number, number];
    // Never wider than canon's square, and the height is where the saving actually is: the four
    // maps span 44 units of y, so the box is 68 rather than 100. Width comes out at exactly 100
    // here because Dwarka and the Dry Harbour sit near the edges -- fitting is not the same as
    // shrinking, and asserting a strict inequality on both axes fails on honest data.
    // Fitted on both axes, without assuming which way round the continent happens to be. It was
    // landscape while the Dry Harbour sat far east; with three maps it is 66 x 68 and slightly
    // portrait, and an assertion that quietly required landscape failed on a change that was
    // nothing to do with drawing.
    expect(w).toBeLessThan(100);
    expect(h).toBeLessThan(100);

    // And every node has to be inside it, padding included, or a dot is drawn off the canvas.
    for (const n of shape.nodes) {
      expect(n.x, `${n.name} is left of the box`).toBeGreaterThanOrEqual(x);
      expect(n.x, `${n.name} is right of the box`).toBeLessThanOrEqual(x + w);
      expect(n.y, `${n.name} is above the box`).toBeGreaterThanOrEqual(y);
      expect(n.y, `${n.name} is below the box`).toBeLessThanOrEqual(y + h);
    }
  });

  it('leans the outermost labels inward', () => {
    // On a 360px phone the easternmost name ran off the right edge. Padding is in canon's units
    // and a name's width is in glyphs, so there is no padding correct for both "The Dry Harbour"
    // and "Lothal" -- anchoring sizes the problem away instead.
    const xs = shape.nodes.map((n) => n.x);
    const east = shape.nodes.find((n) => n.x === Math.max(...xs))!;
    const west = shape.nodes.find((n) => n.x === Math.min(...xs))!;
    expect(labelAnchor(shape, east)).toBe('end');
    expect(labelAnchor(shape, west)).toBe('start');

    // Anything between them centres, which is the common case.
    const middle = shape.nodes.filter((n) => n !== east && n !== west);
    for (const n of middle) expect(labelAnchor(shape, n)).toBe('middle');
  });

  it('falls back to canon’s square when nothing is placed', () => {
    expect(viewBoxFor({ nodes: [], edges: [] })).toBe('0 0 100 100');
  });
});
