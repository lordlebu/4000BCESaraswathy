// The React component that owns the Phaser game's lifecycle — and nothing else.
//
// It renders one empty div and never re-renders it. All communication goes through the EventBus,
// so a keystroke in the seed field cannot cause the game to tear down and rebuild.

import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { WorldScene } from './scenes/WorldScene';
import { EventBus } from './EventBus';

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

    return () => {
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
