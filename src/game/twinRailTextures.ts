import Phaser from 'phaser';
import { TWIN_RAIL_REVIEW_FRAMES, railCurve } from './twinRail';

export const TWIN_RAIL_REVIEW = 'twins-rail-review';
const PIXELS = 32;

export function bakeTwinRailReview(scene: Phaser.Scene) {
  if (scene.textures.exists(TWIN_RAIL_REVIEW)) return;
  const atlas = scene.textures.createCanvas(TWIN_RAIL_REVIEW, PIXELS * TWIN_RAIL_REVIEW_FRAMES.length, PIXELS);
  if (!atlas) throw new Error('Could not create the Twin Cities rail review atlas');
  const ctx = atlas.getContext();
  for (const [frame, mask] of TWIN_RAIL_REVIEW_FRAMES.entries()) {
    const left = frame * PIXELS;
    ctx.save();
    ctx.translate(left, 0);
    ctx.beginPath();
    ctx.rect(0, 0, PIXELS, PIXELS);
    ctx.clip();
    const paint = (t: number, low: number, high: number, colour: string) => {
      const { at, tangent } = railCurve(mask, t);
      const length = Math.hypot(tangent.x, tangent.y);
      ctx.fillStyle = colour;
      for (let offset = low; offset <= high; offset++) {
        const x = Math.round(16 + at.x * PIXELS - tangent.y * offset / length);
        const y = Math.round(16 + at.y * PIXELS + tangent.x * offset / length);
        ctx.fillRect(x, y, 1, 1);
      }
    };
    for (let i = 0; i <= 64; i++) paint(i / 64, -5, 5, '#c6a263');
    const terminal = (mask & (mask - 1)) === 0;
    for (let i = 2; i < 64; i += terminal ? 18 : 11) {
      paint(i / 64, -5, 5, '#9d704d');
      paint((i + 2) / 64, -5, 5, '#9d704d');
    }
    for (let i = 0; i <= 64; i++) {
      paint(i / 64, -3, -3, '#403c39');
      paint(i / 64, 3, 3, '#403c39');
    }
    if (terminal) {
      paint(1, -5, 5, '#544333');
      paint(.96, -5, 5, '#73563b');
    }
    ctx.restore();
    atlas.add(mask, 0, left, 0, PIXELS, PIXELS);
  }
  atlas.refresh();
  atlas.setFilter(Phaser.Textures.FilterMode.NEAREST);
}
