// The one seam between React and Phaser.
//
// React owns the DOM chrome — journal, seed field, buttons. Phaser owns the canvas. Neither
// reaches into the other: React never holds a scene reference and pokes at sprites, and no scene
// ever calls `setState`. They pass messages here instead.
//
// This matters more than it looks. Phaser runs its own 60 fps loop; React re-renders on its own
// schedule. Letting either drive the other directly is how canvas apps end up re-mounting the game
// on every keystroke in a text input.

import Phaser from 'phaser';
import type { JournalEntry } from '../content/journal';
import type { Point, World } from '../world/types';

/** Scene → React. */
export interface GameToUi {
  /** A world was generated and the scene is drawing it. */
  'world-ready': { world: World };
  /** The player finished a step onto this tile. */
  'tile-entered': {
    at: Point;
    entry: JournalEntry;
    surroundings: string;
    hint: string;
    discovered: number;
    atLandmark: boolean;
  };
  /** Fog state changed and should be persisted. */
  'journey-changed': { discovered: string[] };
  /** The player reached the landmark. Fires once per journey — this is the end of the session. */
  'landmark-reached': { title: string; body: string; closing: string };

  /** The traveller is standing on an authored place. Carries ids; the UI resolves them. */
  'poi-entered': { poiId: string; fieldMapId: string };
}

/**
 * React → Scene.
 *
 * Note what is *not* here: observing a creature. The journal and the observe button both call
 * `creatureFor` in the content layer, which is framework-free and importable from React directly.
 * Routing it through the scene would recreate the bug where the journal described a crane and the
 * sketch recorded an otter.
 */
export interface UiToGame {
  'new-journey': { seed: string };
  /** Lay down a different field map. The overworld sends this. */
  'travel-to': { fieldMapId: string; seed: string };
  'resume-journey': { seed: string; discovered: string[] };
  /**
   * How much of the canvas the overlays are covering, in CSS pixels.
   *
   * React owns the layout, so React is the only side that knows this — the scene would otherwise
   * have to query the DOM for panel class names and re-derive the CSS breakpoints, which is two
   * copies of the same rule waiting to disagree. The camera uses it to keep the traveller in the
   * part of the map you can actually see.
   */
  'viewport-insets': { right: number; bottom: number };
  /** Step the zoom in or out, or hand it back to the automatic fit. */
  zoom: { step: number | 'reset' };
}

type Events = GameToUi & UiToGame;

class TypedBus extends Phaser.Events.EventEmitter {
  emitEvent<K extends keyof Events>(event: K, payload: Events[K]): boolean {
    return this.emit(event as string, payload);
  }

  onEvent<K extends keyof Events>(event: K, handler: (payload: Events[K]) => void): this {
    return this.on(event as string, handler) as this;
  }

  offEvent<K extends keyof Events>(event: K, handler: (payload: Events[K]) => void): this {
    return this.off(event as string, handler) as this;
  }
}

export const EventBus = new TypedBus();
