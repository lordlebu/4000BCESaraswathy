import type { World } from '../world/types';
import type { Placement } from './scenePlan';
import { depthFor, ROW_SLOT, SPAN_PIECE, riverBridgeFrame } from './frames';

export function planRiverBridges(world: World): Placement[] {
  const out: Placement[] = [];
  const at = (x: number, y: number) => world.tiles[y]?.[x];
  const carries = (x: number, y: number) => {
    const t = at(x, y);
    return t?.road === true || t?.ford === true || t?.bridge === true;
  };
  const bridged = (x: number, y: number) => at(x, y)?.bridge === true;

  for (let y = 0; y < world.height; y += 1) {
    for (let x = 0; x < world.width; x += 1) {
      if (!world.tiles[y]![x]!.bridge) continue;
      // Along its span if it has one; a one-tile bridge runs the way the road passes straight over
      // it -- road on *both* sides -- which is what `bridgeTheCrossings` required before building it.
      // A side road touching one end does not turn the deck. Failing both, the river under it says:
      // it runs north-south under a bridge that runs east-west.
      const spanX = bridged(x - 1, y) || bridged(x + 1, y);
      const spanY = bridged(x, y - 1) || bridged(x, y + 1);
      const throughX = carries(x - 1, y) && carries(x + 1, y);
      const throughY = carries(x, y - 1) && carries(x, y + 1);
      const riverNS = at(x, y - 1)?.biome === 'river' && at(x, y + 1)?.biome === 'river';
      const eastWest = spanX
        ? true
        : spanY
          ? false
          : throughX && !throughY
            ? true
            : throughY && !throughX
              ? false
              : riverNS;
      const before = eastWest ? bridged(x - 1, y) : bridged(x, y - 1);
      const after = eastWest ? bridged(x + 1, y) : bridged(x, y + 1);
      const piece = before && after
        ? SPAN_PIECE.middle
        : after
          ? SPAN_PIECE.start
          : before
            ? SPAN_PIECE.end
            : SPAN_PIECE.single;
      out.push({
        sheet: 'riverBridge',
        frame: riverBridgeFrame(eastWest, piece),
        x,
        y,
        // Underfoot, like the road it carries: a walker crosses *on* it, not behind it.
        depth: depthFor(y, ROW_SLOT.underfoot)
      });
    }
  }
  return out;
}

