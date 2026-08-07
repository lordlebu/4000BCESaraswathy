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
    if (game.current || !container.current) return;

    game.current = new Phaser.Game({
      type: Phaser.AUTO,
      parent: container.current,
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

    game.current.scene.start('WorldScene', initial.current);

    return () => {
      game.current?.destroy(true);
      game.current = null;
    };
  }, []);

  return <div className="map-surface" ref={container} aria-label="Generated Jambhudweepa world map" />;
}
