// The rules for what is on screen.
//
// These run under Node with no DOM: the reducer is pure, which is why it was worth pulling out
// of the component at all.

import { describe, expect, it } from 'vitest';

import {
  dockIsOpen,
  initialSurface,
  mapIsCovered,
  surfaceReducer,
  type SurfaceAction,
  type SurfaceState
} from '../src/ui/surface';

/** Apply a run of actions, because most of what is worth asserting is about sequences. */
function run(...actions: SurfaceAction[]): SurfaceState {
  return actions.reduce(surfaceReducer, initialSurface);
}

describe('what has the screen', () => {
  /**
   * Regression. The first cut of this reducer started at `null`, which reads as the tidy
   * default and is wrong: the field notes are what a player looks at on every step, and
   * `notesOpen` was `true` from the start for that reason. Landing on a bare map is a walking
   * simulator. Four browser tests caught it; this catches it in milliseconds.
   */
  it('starts on the field notes, which are the resting state', () => {
    expect(initialSurface.surface).toBe('here');
  });

  it('can be put away to look at the map alone', () => {
    const state = run({ type: 'toggle', surface: 'here' });
    expect(state.surface).toBeNull();
    expect(mapIsCovered(state)).toBe(false);
  });

  /**
   * Regression. `close` used to mean "show nothing", which is only correct if the notes are
   * just another panel. They are the resting state: under the old booleans, closing the diary
   * revealed the notes that had been underneath it all along, and there was no way to close
   * your way to a bare map by accident. Only asking for `here` directly puts them away.
   */
  it('closing what was on top returns to the notes, not to a bare map', () => {
    for (const surface of ['progress', 'collection'] as const) {
      const state = run({ type: 'toggle', surface }, { type: 'close' });
      expect(state.surface).toBe('here');
    }
  });

  it('opens a surface when asked', () => {
    expect(run({ type: 'toggle', surface: 'progress' }).surface).toBe('progress');
  });

  it('closes the open surface when asked for it again', () => {
    const state = run(
      { type: 'toggle', surface: 'collection' },
      { type: 'toggle', surface: 'collection' }
    );
    expect(state.surface).toBeNull();
  });

  /**
   * The reason this phase exists.
   *
   * Under the old arrangement each panel had its own boolean, so opening the diary while the
   * notes were up left both showing and the camera insets were whatever the two rectangles
   * happened to measure. Here there is one slot, so the previous occupant is gone by
   * construction rather than by arithmetic noticing the collision.
   */
  it('never holds two surfaces at once', () => {
    const state = run(
      { type: 'toggle', surface: 'here' },
      { type: 'toggle', surface: 'progress' },
      { type: 'toggle', surface: 'collection' }
    );
    expect(state.surface).toBe('collection');
  });
});

describe('standing somewhere', () => {
  it('opens the place on arrival', () => {
    const state = run({ type: 'standing-on', poiId: 'poi_lothal_tower' });
    expect(state.standingOn).toBe('poi_lothal_tower');
    expect(state.surface).toBe('here');
    expect(state.placeOpen).toBe(true);
  });

  it('closes it again on leaving, because it would be a lie about where you are', () => {
    const state = run(
      { type: 'standing-on', poiId: 'poi_lothal_tower' },
      { type: 'standing-on', poiId: null }
    );
    expect(state.standingOn).toBeNull();
    expect(state.placeOpen).toBe(false);
  });

  /**
   * Regression, and the reason `placeOpen` still exists.
   *
   * The place and the field notes are two layers of one surface, not two rival surfaces: the
   * notes are the floor and the place sits over them. Folding both into a single `here` flag
   * made "Leave" close the notes as well, which is precisely the dead end the place panel was
   * given a close button to fix.
   */
  it('leaving a place reveals the notes underneath rather than clearing the screen', () => {
    const state = run(
      { type: 'standing-on', poiId: 'poi_lothal_tower' },
      { type: 'close-place' }
    );
    expect(state.placeOpen).toBe(false);
    expect(state.surface).toBe('here');
    expect(state.standingOn).toBe('poi_lothal_tower');
  });

  it('reopens the place without moving off the tile', () => {
    const state = run(
      { type: 'standing-on', poiId: 'poi_lothal_tower' },
      { type: 'close-place' },
      { type: 'toggle-place' }
    );
    expect(state.placeOpen).toBe(true);
  });

  /**
   * Walking off a tile closes the panel about that tile. It must not close the album or the
   * diary, which are not about this tile -- a footstep is not a reason to discard what someone
   * was reading.
   */
  it('leaving a place does not close a surface that was not about it', () => {
    for (const surface of ['collection', 'progress'] as const) {
      const state = run(
        { type: 'standing-on', poiId: 'poi_lothal_tower' },
        { type: 'toggle', surface },
        { type: 'standing-on', poiId: null }
      );
      expect(state.surface).toBe(surface);
    }
  });

  /** Reading a place is being on `here`, so it cannot sit on top of the diary. */
  it('opening a place leaves whatever else was being read', () => {
    const state = run(
      { type: 'toggle', surface: 'progress' },
      { type: 'standing-on', poiId: 'poi_lothal_tower' }
    );
    expect(state.surface).toBe('here');
  });
});

describe('showing a surface outright', () => {
  it('does not close the one already showing', () => {
    // What a tab needs and `toggle` cannot give it. Pressing the tab you are already on must
    // leave it open; toggling would close the sheet, which reads as the panel breaking.
    const state = run({ type: 'show', surface: 'progress' }, { type: 'show', surface: 'progress' });
    expect(state.surface).toBe('progress');
  });

  it('swaps between the two records without closing', () => {
    const state = run(
      { type: 'show', surface: 'progress' },
      { type: 'show', surface: 'collection' }
    );
    expect(state.surface).toBe('collection');
  });

  it('leaves the toggle alone, which still closes what it opens', () => {
    const state = run({ type: 'toggle', surface: 'progress' }, { type: 'toggle', surface: 'progress' });
    expect(state.surface).toBeNull();
  });
});

describe('the satchel ribbon', () => {
  it('starts showing, because a readout nobody finds does not exist', () => {
    expect(initialSurface.satchelRibbon).toBe(true);
  });

  it('closes and opens again', () => {
    // Reported from play: a permanent band that cannot be dismissed is an obstruction rather
    // than a convenience. The map is the thing somebody came to look at.
    expect(run({ type: 'toggle-satchel-ribbon' }).satchelRibbon).toBe(false);
    expect(
      run({ type: 'toggle-satchel-ribbon' }, { type: 'toggle-satchel-ribbon' }).satchelRibbon
    ).toBe(true);
  });

  it('disturbs nothing else when it closes', () => {
    // Hiding what you carry says nothing about the notes, the place under foot, or anything
    // open. Its own flag rather than a surface, precisely so it cannot be read as more.
    const before = run(
      { type: 'standing-on', poiId: 'poi_lothal_camp' },
      { type: 'open-interrupt', which: 'workshop' }
    );
    const after = { ...before };
    const closed = run(
      { type: 'standing-on', poiId: 'poi_lothal_camp' },
      { type: 'open-interrupt', which: 'workshop' },
      { type: 'toggle-satchel-ribbon' }
    );
    expect(closed.surface).toBe(after.surface);
    expect(closed.standingOn).toBe(after.standingOn);
    expect(closed.placeOpen).toBe(after.placeOpen);
    expect(closed.interrupts.workshop).toBe(true);
    expect(closed.satchelRibbon).toBe(false);
  });

  it('survives walking, and reading a place', () => {
    // The three are unrelated facts. A ribbon a player put away must stay away until they ask
    // for it back -- a footstep is not asking.
    const state = run(
      { type: 'toggle-satchel-ribbon' },
      { type: 'standing-on', poiId: 'poi_lothal_camp' },
      { type: 'standing-on', poiId: null },
      { type: 'toggle', surface: 'progress' }
    );
    expect(state.satchelRibbon).toBe(false);
  });
});

describe('interrupts', () => {
  it('do not evict the surface underneath', () => {
    const state = run(
      { type: 'toggle', surface: 'progress' },
      { type: 'open-interrupt', which: 'kit' }
    );
    expect(state.interrupts.kit).toBe(true);
    expect(state.surface).toBe('progress');
  });

  it('leave the surface behind when they close', () => {
    const state = run(
      { type: 'toggle', surface: 'progress' },
      { type: 'open-interrupt', which: 'kit' },
      { type: 'close-interrupt', which: 'kit' }
    );
    expect(state.surface).toBe('progress');
  });

  it('count as covering the map even with every surface put away', () => {
    const state = run(
      { type: 'toggle', surface: 'here' }, // away, leaving the bare map
      { type: 'open-interrupt', which: 'overworld' }
    );
    expect(state.surface).toBeNull();
    expect(mapIsCovered(state)).toBe(true);
  });
});

/**
 * How much room the dock has, which is stage 3 of `docs/ui-streamline-plan.md`.
 *
 * The measurement that started it: chrome covered **48% of the screen standing on ordinary ground
 * and 73% standing in a place** on a desktop, and 83% on a landscape phone. The notes had two
 * states, all of it or gone, so a player who wanted the map had to take the writing away.
 *
 * These are about arbitration rather than pixels — the same reason this reducer was pulled out of
 * the component at all. What the three names measure on a real screen is
 * `e2e/chrome-budget.spec.ts`.
 */
describe('how much room the dock has', () => {
  it('rests at peek, so the walk is mostly map', () => {
    expect(initialSurface.dockHeight).toBe('peek');
    // And the notes are still the resting *surface*. Peek is a size, not a way of closing them:
    // a player who lands on a bare map has been given a walking simulator, which is the ruling
    // the first assertion in this file exists to keep.
    expect(initialSurface.surface).toBe('here');
  });

  it('opens to reading height on arriving somewhere', () => {
    const state = run({ type: 'standing-on', poiId: 'poi_eastern_field' });
    expect(state.placeOpen).toBe(true);
    expect(state.dockHeight).toBe('read');
  });

  it('gives the map back on walking out', () => {
    const state = run(
      { type: 'standing-on', poiId: 'poi_eastern_field' },
      { type: 'standing-on', poiId: null }
    );
    expect(state.placeOpen).toBe(false);
    expect(state.dockHeight).toBe('peek');
  });

  it('gives the map back on leaving a place without moving', () => {
    // "Leave" is a move back towards the map, not a swap to a different page of prose.
    const state = run({ type: 'standing-on', poiId: 'poi_eastern_field' }, { type: 'close-place' });
    expect(state.dockHeight).toBe('peek');
    expect(state.surface).toBe('here');
  });

  it('reopens a place at reading height, having been put away', () => {
    const state = run(
      { type: 'standing-on', poiId: 'poi_eastern_field' },
      { type: 'close-place' },
      { type: 'toggle-place' }
    );
    expect(state.placeOpen).toBe(true);
    expect(state.dockHeight).toBe('read');
  });

  it('opens, opens further, and then gets out of the way', () => {
    // Three steps rather than two. `full` was originally reserved for a conversation and reachable
    // only by starting one -- and a height nothing can reach is a height that does not exist, which
    // is this codebase's signature bug. At reading height the dock shows about two thirds of a
    // place; somebody who wants the whole page has to be able to ask for it.
    expect(run({ type: 'dock-toggle' }).dockHeight).toBe('read');
    expect(run({ type: 'dock-toggle' }, { type: 'dock-toggle' }).dockHeight).toBe('full');
    expect(
      run({ type: 'dock-toggle' }, { type: 'dock-toggle' }, { type: 'dock-toggle' }).dockHeight
    ).toBe('peek');
  });

  it('says when it is showing more than the peek row', () => {
    expect(dockIsOpen(initialSurface)).toBe(false);
    expect(dockIsOpen(run({ type: 'dock', height: 'read' }))).toBe(true);
    // Not the dock at all when the notes are put away, whatever height it was left at.
    expect(dockIsOpen(run({ type: 'dock', height: 'read' }, { type: 'toggle', surface: 'here' }))).toBe(
      false
    );
  });

  it('leaves the height alone when something else takes the screen', () => {
    // The diary and the album are their own surfaces over the map. They say nothing about how tall
    // the dock should be when the player comes back to it.
    const state = run({ type: 'dock', height: 'read' }, { type: 'toggle', surface: 'progress' });
    expect(state.dockHeight).toBe('read');
  });
});
