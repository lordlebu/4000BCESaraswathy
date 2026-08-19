// The shape of the overworld: where each field map sits, and which lines join them.
//
// Pure, and separate from the drawing, because the geometry is the part that can be wrong in a
// way nobody sees. An edge drawn twice, a map placed off the canvas, a neighbour that is closer
// to a stranger than to its own neighbour -- all of those are arithmetic, and arithmetic belongs
// in a test rather than in a screenshot.
//
// Canon owns the coordinates. This decides nothing about geography; it only works out what to
// draw from what canon says.

import { fieldMaps, type FieldMap } from './places';

/** A map, with the coordinates canon gave it. Maps canon has not placed are left out entirely. */
export interface MapNode {
  id: string;
  name: string;
  x: number;
  y: number;
}

/** A road between two maps, stated once. */
export interface MapEdge {
  from: string;
  to: string;
}

/** Everything the drawing needs, and nothing about how it looks. */
export interface OverworldShape {
  nodes: MapNode[];
  edges: MapEdge[];
}

/**
 * The drawable overworld.
 *
 * A map without coordinates is skipped rather than defaulted to a corner: canon staying quiet
 * means "not placed yet", and dropping four unplaced maps on top of each other at the origin
 * would look like a bug in the drawing rather than a gap in the authoring.
 */
export function overworldShape(maps: readonly FieldMap[] = fieldMaps): OverworldShape {
  const placed = maps.filter(
    (m): m is FieldMap & { coordinates: { x: number; y: number } } => m.coordinates !== null
  );
  const known = new Set(placed.map((m) => m.id));

  const nodes: MapNode[] = placed.map((m) => ({
    id: m.id,
    name: m.name,
    x: m.coordinates.x,
    y: m.coordinates.y
  }));

  // Canon states each edge from both ends, so walking every neighbour list yields every road
  // twice. Keeping the pair sorted and de-duplicating gives one line per road -- drawing both
  // would double every stroke's opacity and make roads look heavier than they are.
  const seen = new Set<string>();
  const edges: MapEdge[] = [];
  for (const m of placed) {
    for (const other of m.neighbours) {
      if (!known.has(other)) continue;
      const [from, to] = m.id < other ? [m.id, other] : [other, m.id];
      const key = `${from}|${to}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ from, to });
    }
  }

  return { nodes, edges };
}

/** Straight-line distance between two placed maps, in canon's abstract units. */
export function distanceBetween(a: MapNode, b: MapNode): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** A node by id, for the drawing to look up an edge's ends. */
export function nodeFor(shape: OverworldShape, id: string): MapNode | null {
  return shape.nodes.find((n) => n.id === id) ?? null;
}

/**
 * A viewBox that fits the placed maps, with room for their labels.
 *
 * Canon's units are 0-100, but four maps never fill that square -- drawing the whole box left a
 * band of empty page below the continent as tall as the continent itself. Fitting to the content
 * is also what stops the topmost label being clipped, since a name is drawn above its dot and the
 * dot can sit on the very edge of the used area.
 *
 * `pad` is in the same units. It has to clear a label's height rather than a dot's radius.
 */
export function viewBoxFor(shape: OverworldShape, pad = 12): string {
  if (shape.nodes.length === 0) return '0 0 100 100';
  const xs = shape.nodes.map((n) => n.x);
  const ys = shape.nodes.map((n) => n.y);
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  const width = Math.max(...xs) - Math.min(...xs) + pad * 2;
  const height = Math.max(...ys) - Math.min(...ys) + pad * 2;
  return `${minX} ${minY} ${width} ${height}`;
}

/**
 * Which way a node's label should lean.
 *
 * A centred label on the easternmost map runs off the right of the viewBox, because padding is
 * measured in canon's units and a name's width is measured in glyphs -- there is no padding that
 * is correct for both "The Dry Harbour" and "Lothal". Anchoring the outermost labels inward sizes
 * the problem away instead of guessing at it. Caught on a 360px phone, where the harbour's name
 * ran off the edge.
 */
export function labelAnchor(shape: OverworldShape, node: MapNode): 'start' | 'middle' | 'end' {
  if (shape.nodes.length < 2) return 'middle';
  const xs = shape.nodes.map((n) => n.x);
  if (node.x === Math.max(...xs)) return 'end';
  if (node.x === Math.min(...xs)) return 'start';
  return 'middle';
}
