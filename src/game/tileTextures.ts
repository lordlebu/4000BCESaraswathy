// Tile artwork, generated at runtime from `data/biomes.json`.
//
// The demo ships coloured tiles with a glyph rather than hand-drawn art, and this is where that
// decision is isolated. Each biome gets one small canvas texture keyed `tile:<biome>`; the scene
// then just places sprites. When real art arrives, `WorldScene` does not change at all — this file
// is replaced by an atlas load using the same frame keys.
//
// Textures rather than per-tile `Graphics` or `Text` matters for more than tidiness: 864 sprites
// sharing 11 textures batch into a handful of draw calls, while 864 Text objects would each carry
// their own canvas.

import Phaser from 'phaser';
import { biomes } from '../content/species';
import type { BiomeId } from '../world/types';

export const TILE_SIZE = 32;

export function tileTextureKey(biome: BiomeId): string {
  return `tile:${biome}`;
}

/** The 1x1 white pixel the fog layer stretches over each tile. */
export const FOG_TEXTURE = 'fog:pixel';

function shade(hex: string, amount: number): string {
  const colour = Phaser.Display.Color.HexStringToColor(hex);
  const mix = amount > 0 ? 255 : 0;
  const t = Math.abs(amount);
  const channel = (c: number) => Math.round(c + (mix - c) * t);
  return Phaser.Display.Color.RGBToString(
    channel(colour.red),
    channel(colour.green),
    channel(colour.blue)
  );
}

function drawTile(context: CanvasRenderingContext2D, colour: string, symbol: string, seedOffset: number): void {
  const size = TILE_SIZE;

  context.fillStyle = colour;
  context.fillRect(0, 0, size, size);

  // A soft vertical gradient stops a field of flat squares from reading as a spreadsheet.
  const gradient = context.createLinearGradient(0, 0, 0, size);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.10)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0.12)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  // A faint speckle so neighbouring tiles of one biome do not merge into a single slab.
  context.fillStyle = shade(colour, -0.18);
  for (let i = 0; i < 5; i += 1) {
    const x = ((i * 7 + seedOffset * 3) % size) + 0.5;
    const y = ((i * 11 + seedOffset * 5) % size) + 0.5;
    context.fillRect(x, y, 1, 1);
  }

  context.fillStyle = 'rgba(255, 253, 245, 0.62)';
  context.font = `${Math.round(size * 0.55)}px Georgia, "Times New Roman", serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(symbol, size / 2, size / 2 + 1);
}

/**
 * Build every tile texture. Safe to call more than once — Phaser keeps textures across scene
 * restarts, so a second call would otherwise warn about duplicate keys.
 */
export function createTileTextures(scene: Phaser.Scene): void {
  biomes.forEach((biome, index) => {
    const key = tileTextureKey(biome.id);
    if (scene.textures.exists(key)) return;
    const texture = scene.textures.createCanvas(key, TILE_SIZE, TILE_SIZE);
    const context = texture?.getContext();
    if (!texture || !context) return;
    drawTile(context, biome.color, biome.symbol, index);
    texture.refresh();
  });

  if (!scene.textures.exists(FOG_TEXTURE)) {
    const fog = scene.textures.createCanvas(FOG_TEXTURE, 1, 1);
    const context = fog?.getContext();
    if (fog && context) {
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, 1, 1);
      fog.refresh();
    }
  }
}
