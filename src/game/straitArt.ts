// The strait's frames, and the door they come in through.
//
// `tools/build-strait.js` cuts the owner's paintings into one PNG a frame in `assets/strait/` and
// writes where each is held to `assets/strait.json` -- a boat's hull, a kite's nose, the whale's
// blowhole -- so the scene reads the builder's numbers rather than a copy of them. A folder rather
// than a list, as with the wandering animals, so a repainted frame lands without a code change.

import manifest from '../../assets/strait.json';
import { CARAVAN_MAP, STRAIT_MAP } from '../content/strait';

const files = import.meta.glob<string>('../../assets/strait/*.png', { eager: true, query: '?url', import: 'default' });

const byName = new Map<string, string>();
for (const [path, url] of Object.entries(files)) byName.set((path.split('/').pop() ?? '').replace(/\.png$/, ''), url);

export interface StraitFrame {
  width: number;
  height: number;
  /** The anchor in the frame's pixels: a hull's middle at the bottom, a kite's middle. */
  x: number;
  y: number;
  /** A kite's tip, where the rope ties on. */
  nose?: { x: number; y: number };
  /** The whale's blowhole, where the spout stands. */
  blowhole?: { x: number; y: number };
}

const FRAMES = manifest as Record<string, StraitFrame>;

/** A frame's measurements, or null for a name the builder never wrote. */
export function straitFrame(name: string): StraitFrame | null {
  return FRAMES[name] ?? null;
}

/** The texture key a frame is loaded under. */
export const straitKey = (name: string): string => `strait:${name}`;

/**
 * Load this map's frames: everything on the Aravali, the kites alone at Dwarka, nothing elsewhere.
 * A change of map restarts the scene, so the next map's are loaded when it is.
 */
export function loadStraitArt(scene: Phaser.Scene, fieldMapId: string): void {
  const wanted = (name: string) => fieldMapId === STRAIT_MAP || (fieldMapId === CARAVAN_MAP && name.startsWith('kite-'));
  for (const [name, url] of byName) {
    if (!wanted(name) || scene.textures.exists(straitKey(name))) continue;
    scene.load.image(straitKey(name), url);
  }
}
