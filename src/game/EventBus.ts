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
  /**
   * Who the scene is actually drawing.
   *
   * Reported by the scene rather than assumed by the UI, so the two cannot disagree. It exists
   * because a browser test could not otherwise tell "the picker changed the sprite" from "the
   * picker highlighted a button": comparing canvas pixels passed with the swap deliberately
   * removed, because the map animates on its own and any two screenshots differ.
   */
  'character-changed': { characterId: string };
  /** The player finished a step onto this tile. */
  'tile-entered': {
    at: Point;
    entry: JournalEntry;
    surroundings: string;
    hint: string;
    /**
     * Where there is still something to see, and where the nearest shelter is.
     *
     * Kept apart from `hint` rather than folded into it. `hint` is the arc of the whole journey
     * -- the landmark, named the same way from the first step to the last -- and this is a
     * quieter aside about the next hour. Empty string when there is nothing worth saying.
     */
    whereNext: string;
    /**
     * A mood line about how tired the traveller is, or null.
     *
     * Null both when the flag is off and when there is nothing worth saying, which is most of a
     * session. Never a warning: nothing bad happens, so a line implying otherwise would lie.
     */
    fatigue: string | null;
    /** A word about the fading light, or null while there is plenty. */
    dusk: string | null;
    /** The best shelter where the traveller stands: a roof, a camp, or his own bedroll. */
    shelter: 'roof' | 'camp' | 'bedroll' | 'none';
    /** Whether stopping for the night would do anything. Only after dark. */
    canCamp: boolean;
    discovered: number;
    atLandmark: boolean;
    /**
     * Which day of the journey this is, counting from nought.
     *
     * Sent for the same reason `moment-changed` exists: **the scene spends time when the
     * traveller walks, so it is the authority on how much has passed**, and React running its
     * own clock off the same formulas would be two clocks agreeing by luck.
     *
     * Resource nodes need it and nothing else did, which is why it was never carried before.
     * Regrowth is worked out from the day a node was drawn from rather than ticked, so this is
     * the whole of what the content layer needs to know about time.
     */
    day: number;
    /**
     * The same clock unrounded, in milliseconds, which is what the save has to keep.
     *
     * `day` is what the content layer reasons in and `travelled` is what survives a reload;
     * rounding the second to the first would lose most of a day on every boot, and a traveller
     * who reloaded often would find nodes regrowing far faster than they should.
     */
    travelled: number;
  };
  /** Fog state changed and should be persisted. */
  'journey-changed': { discovered: string[] };
  /** The player reached the landmark. Fires once per journey — this is the end of the session. */
  'landmark-reached': { title: string; body: string; closing: string };

  /**
   * The hour and the sky, from the only thing that owns them.
   *
   * React used to run its own timer off the same formulas, which is two clocks agreeing by
   * luck. The scene spends time when the traveller walks, so it is the authority.
   */
  'moment-changed': { timeOfDay: string; weather: string };

  /**
   * The camera's zoom, whenever it changes.
   *
   * Reflected onto the map container as `data-zoom`. The e2e suite used to infer zoom from the
   * size of a PNG of the canvas, which turns out to be a hopeless instrument: a whole zoom step
   * moves that number by about 6%, and rendering variance between two screenshots on a
   * software rasteriser is the same size. Reporting the number directly makes the question
   * exact instead of statistical, and is worth knowing when debugging besides.
   */
  'zoom-changed': { zoom: number };

  /**
   * The traveller reached an authored place for the first time this journey.
   *
   * Separate from `standing-on` on purpose. That one is a *state* the UI depends on — it fires
   * on leaving as well as arriving, and re-fires when you walk back — so overloading it with
   * "and this is the first time" would make one message mean two things.
   */
  'poi-reached': { poiId: string; fieldMapId: string };

  /**
   * A night passed. The clock has moved to first light.
   *
   * `at` is where he already was: he wakes where he stopped, and this event reports the position
   * rather than setting it. `rested` is false for a night on the bedroll -- it buys the hours, not
   * the sleep, which is what keeps a roof worth walking to.
   */
  'night-passed': {
    at: Point;
    shelter: 'roof' | 'camp' | 'bedroll' | 'none';
    rested: boolean;
    entry: string;
  };

  /**
   * The authored place under the traveller's feet, or null when there is none.
   *
   * A state rather than an arrival event. The UI needs to know not just that you arrived
   * somewhere but that you are *still there*, so a panel you closed can be opened again
   * without walking off the tile and back on to re-trigger it.
   */
  'standing-on': { poiId: string | null; fieldMapId: string };
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
  /**
   * Walk as somebody else, without restarting the journey.
   *
   * Every sheet is loaded and every character's animations are created at boot, so this is a
   * texture swap and a replayed animation rather than a scene restart -- which means the walk, the
   * fog and the satchel all survive changing your mind about who is carrying them.
   */
  'set-character': { characterId: string };
  /** Bed down for the night. Ignored unless standing at a camp after dark. */
  'camp': Record<string, never>;
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
