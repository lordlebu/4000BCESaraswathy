import type { Point } from '../world/types';

const DIRECTIONS = [
  { x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }
] as const;

function direction(from: Point, to: Point): number {
  return DIRECTIONS.findIndex(d => from.x + d.x === to.x && from.y + d.y === to.y);
}

export function railMask(route: readonly Point[], index: number): number {
  const here = route[index]!;
  let mask = 0;
  for (const neighbour of [route[index - 1], route[index + 1]]) {
    if (!neighbour) continue;
    const side = direction(here, neighbour);
    if (side >= 0) mask |= 1 << side;
  }
  return mask;
}

const CORNERS = [3, 6, 12, 9];
const TERMINALS = [1, 2, 4, 8];
export const TWIN_RAIL_REVIEW_FRAMES = [...TERMINALS, ...CORNERS];

export function usesRailReviewFrame(mask: number): boolean {
  return TWIN_RAIL_REVIEW_FRAMES.includes(mask);
}

/** Edge-to-edge rail geometry in tile-local coordinates relative to the tile centre. */
export function railCurve(mask: number, t: number): { at: Point; tangent: Point } {
  const sides = DIRECTIONS.filter((_, i) => mask & (1 << i));
  const from = sides[0] ?? { x: 0, y: 0 };
  const to = sides[1] ?? { x: 0, y: 0 };
  if (sides.length === 1 || !CORNERS.includes(mask)) {
    return {
      at: { x: (from.x * (1 - t) + to.x * t) / 2, y: (from.y * (1 - t) + to.y * t) / 2 },
      tangent: { x: to.x - from.x, y: to.y - from.y }
    };
  }
  return {
    at: { x: (from.x * (1 - t) ** 2 + to.x * t ** 2) / 2, y: (from.y * (1 - t) ** 2 + to.y * t ** 2) / 2 },
    tangent: { x: -from.x * (1 - t) + to.x * t, y: -from.y * (1 - t) + to.y * t }
  };
}

/** Art and movement use the same centreline. The elapsed journey time still follows the old route. */
export function tramOnRail(route: readonly Point[], progress: number): { at: Point; heading: number } {
  const distance = progress * (route.length - 1);
  const index = Math.min(route.length - 1, Math.floor(distance + .5));
  const here = route[index]!;
  const before = route[index - 1];
  const after = route[index + 1];
  const mask = railMask(route, index);
  const firstSide = Math.log2(mask & -mask);
  const forwards = before ? direction(here, before) === firstSide : false;
  let t = distance - index + .5;
  if (!before) t = distance * 2;
  if (!after) t = (distance - index + .5) * 2;
  const { at, tangent } = railCurve(mask, forwards ? t : 1 - t);
  const dx = tangent.x * (forwards ? 1 : -1);
  const dy = tangent.y * (forwards ? 1 : -1);
  return { at: { x: here.x + at.x, y: here.y + at.y },
    heading: Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? 0 : 1) : (dy < 0 ? 2 : 3) };
}
