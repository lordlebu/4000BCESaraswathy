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
 * How tall a map's name is drawn, in canon's units. `.overworld-name` in `styles.css` says the same.
 */
export const LABEL_SIZE = 5;

/**
 * How wide a character of a name is, as a share of `LABEL_SIZE`.
 *
 * An estimate, on the generous side. Measured in the browser on 27 September with `getBBox`, the
 * four names ran 0.46 to 0.53 of the size a character in the page's serif, and 0.59 for the bold
 * one -- the map you are on is drawn bold, and any of them can be.
 */
const GLYPH = 0.6;

/** Where a node's name starts and ends, left to right, in canon's units. */
export function labelExtent(shape: OverworldShape, node: MapNode): { left: number; right: number } {
  const width = node.name.length * LABEL_SIZE * GLYPH;
  const anchor = labelAnchor(shape, node);
  if (anchor === 'end') return { left: node.x - width, right: node.x };
  if (anchor === 'start') return { left: node.x, right: node.x + width };
  return { left: node.x - width / 2, right: node.x + width / 2 };
}

/**
 * A viewBox that fits the placed maps and their names.
 *
 * Canon's units are 0-100, but four maps never fill that square -- drawing the whole box left a
 * band of empty page below the continent as tall as the continent itself. Fitting to the content
 * is also what stops the topmost label being clipped, since a name is drawn above its dot and the
 * dot can sit on the very edge of the used area.
 *
 * **Sideways, it fits the names too, not only the dots.** Once the Narmada moved into its own region
 * on 27 September the continent was 36 units wide and its two eastern names were 50 each, so a
 * box padded from the dots cut both of them off. `pad` still clears a label's height above the top
 * dot and a dot's width at the sides.
 */
export function viewBoxFor(shape: OverworldShape, pad = 12): string {
  if (shape.nodes.length === 0) return '0 0 100 100';
  const ys = shape.nodes.map((n) => n.y);
  const edge = 4;
  const lefts = shape.nodes.map((n) => Math.min(n.x - edge, labelExtent(shape, n).left));
  const rights = shape.nodes.map((n) => Math.max(n.x + edge, labelExtent(shape, n).right));
  const minX = Math.floor(Math.min(...lefts) - 2);
  const maxX = Math.ceil(Math.max(...rights) + 2);
  const minY = Math.min(...ys) - pad;
  const height = Math.max(...ys) - Math.min(...ys) + pad * 2;
  return `${minX} ${minY} ${maxX - minX} ${height}`;
}

/**
 * Which way a node's label should lean.
 *
 * A centred label on an eastern map runs off the right of the drawing, and on a western one off the
 * left. Anchoring the outer labels inward keeps a long name over the continent rather than past it.
 * Caught on a 360px phone, where the harbour's name ran off the edge.
 *
 * **The outer fifth of the spread, not only the outermost map.** With the Aravali and the Narmada one
 * unit apart on the east, only the easternmost leaned in and the other ran off the right.
 */
export function labelAnchor(shape: OverworldShape, node: MapNode): 'start' | 'middle' | 'end' {
  if (shape.nodes.length < 2) return 'middle';
  const xs = shape.nodes.map((n) => n.x);
  const min = Math.min(...xs);
  const max = Math.max(...xs);
  const band = (max - min) / 5;
  if (node.x >= max - band) return 'end';
  if (node.x <= min + band) return 'start';
  return 'middle';
}
