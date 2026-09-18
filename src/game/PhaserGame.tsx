// The React component that owns the Phaser game's lifecycle — and nothing else.
//
// It renders one empty div and never re-renders it. All communication goes through the EventBus,
// so a keystroke in the seed field cannot cause the game to tear down and rebuild.

import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { WorldScene } from './scenes/WorldScene';
import { EventBus } from './EventBus';
import { CHECK_MS, KEEP, describeStall, isStall, lateness, remember, type Stall } from './stall';

export interface PhaserGameProps {
  seed: string;
  discovered: string[];
  fieldMapId: string;
  /** Who is walking. Read once, like the seed: changing it must not rebuild the game. */
  characterId: string;
}

export function PhaserGame({ seed, discovered, fieldMapId, characterId }: PhaserGameProps) {
  const container = useRef<HTMLDivElement>(null);
  // Held in a ref, not state: changing it must never trigger a render.
  const game = useRef<Phaser.Game | null>(null);
  // The first journey's data has to reach `create()`, but must not restart the scene afterwards.
  const initial = useRef({ seed, discovered, fieldMapId, characterId });

  useEffect(() => {
    const node = container.current;
    if (game.current || !node) return;

    // React StrictMode mounts, tears down and mounts again. Phaser appends its canvas during an
    // asynchronous boot step and defers its own teardown to a game-loop tick that never arrives
    // once the game is destroyed, so the two can interleave either way round:
    //
    //   * teardown after the canvas is appended — handled by removing that canvas below;
    //   * teardown *before* it is appended — the abandoned game still adds its canvas afterwards,
    //     which is why the container is also swept clean here, on the way in.
    //
    // Miss either and two maps end up stacked in the same box, both running, and every
    // `.map-surface canvas` query is ambiguous.
    node.replaceChildren();

    const instance = new Phaser.Game({
      type: Phaser.AUTO,
      parent: node,
      backgroundColor: '#1b1420',
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: '100%',
        height: '100%'
      },
      render: {
        // Linear filtering, stated rather than inherited.
        //
        // This is the default, so setting it changes nothing today — which is the point of writing
        // it down. The ground is painted now (`docs/art-brief.md`), and smooth is what painted art
        // wants when it is scaled. Under the previous pixel-art direction the correct value was the
        // opposite, and the fact that neither was ever declared is how the game shipped a 32-pixel
        // tile drawn at ~80 pixels through a filter nobody had chosen.
        //
        // If tiles ever look soft again, the bug is the source resolution (TILE_SIZE, and what
        // `tools/build-terrain.js` emitted), not this line.
        pixelArt: false,
        antialias: true,
        // Sprites land on whole pixels. Painted art is forgiving about this, but the figure is
        // still 26x40 pixel art walking over it, and a half-pixel offset is what makes a drawn
        // figure shimmer as it moves.
        roundPixels: true
      },
      // Nothing here moves under physics — the player steps between tiles on a tween.
      scene: [WorldScene]
    });
    game.current = instance;
    instance.scene.start('WorldScene', initial.current);

    // Mirror the camera's zoom onto the container. One attribute, written only when it moves:
    // it makes the zoom observable to a test without that test having to read pixels, and it
    // is the first thing worth looking at when the camera misbehaves.
    const onZoom = ({ zoom }: { zoom: number }) => node.setAttribute('data-zoom', String(zoom));
    EventBus.onEvent('zoom-changed', onZoom);

    /**
     * Notice when the page stopped answering, because the report from play is a freeze nobody here
     * can reproduce -- see `stall.ts` for what was tried.
     *
     * Mounted beside the game rather than inside the scene: a stall is a whole-page event, and if
     * Phaser is the thing that wedged then a check living in its update loop is the one thing that
     * cannot report it.
     *
     * Three channels because the report comes from a phone, where only some of them are reachable:
     * a console line for remote devtools, `window.__stalls` for a spec or a paste, and
     * `localStorage` so it survives the reload that usually follows a freeze.
     */
    const stalls: { list: Stall[] } = { list: [] };
    const win = window as unknown as { __stalls?: Stall[] };
    win.__stalls = stalls.list;
    let due = performance.now() + CHECK_MS;
    const watchdog = window.setInterval(() => {
      const now = performance.now();
      const lateBy = lateness(due, now);
      due = now + CHECK_MS;
      if (!isStall(lateBy, document.visibilityState === 'hidden')) return;
      const walker = (window as unknown as { __walker?: () => unknown }).__walker?.() ?? null;
      const stall: Stall = { lateBy, at: now, walker };
      stalls.list = remember(stalls.list, stall, KEEP);
      win.__stalls = stalls.list;
      console.warn(`[stall] ${describeStall(stall)}`);
      // Wrapped: a private window raises on access rather than returning null, which is the same
      // hazard `preferences.ts` documents -- and a watchdog that throws is worse than none.
      try {
        window.localStorage.setItem('sot.stalls', JSON.stringify(stalls.list));
      } catch {
        /* no store, nothing to do */
      }
    }, CHECK_MS);

    return () => {
      window.clearInterval(watchdog);
      EventBus.offEvent('zoom-changed', onZoom);
      game.current = null;
      // Held before destroying: `destroy` clears the reference, and this is the one canvas we know
      // belongs to this game, so removing it cannot take a newer mount's canvas with it.
      const canvas = instance.canvas;
      instance.destroy(true);
      canvas?.remove();
    };
  }, []);

  return <div className="map-surface" ref={container} aria-label="Generated Jambhudweepa world map" />;
}
