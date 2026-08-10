// The React component that owns the Phaser game's lifecycle — and nothing else.
//
// It renders one empty div and never re-renders it. All communication goes through the EventBus,
// so a keystroke in the seed field cannot cause the game to tear down and rebuild.

import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { WorldScene } from './scenes/WorldScene';

export interface PhaserGameProps {
  seed: string;
  discovered: string[];
}

export function PhaserGame({ seed, discovered }: PhaserGameProps) {
  const container = useRef<HTMLDivElement>(null);
  // Held in a ref, not state: changing it must never trigger a render.
  const game = useRef<Phaser.Game | null>(null);
  // The first journey's data has to reach `create()`, but must not restart the scene afterwards.
  const initial = useRef({ seed, discovered });

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
      // Nothing here moves under physics — the player steps between tiles on a tween.
      scene: [WorldScene]
    });
    game.current = instance;
    instance.scene.start('WorldScene', initial.current);

    return () => {
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
