// Layout and shared state. The map is a sibling, not a child — React never renders a tile.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EventBus, type GameToUi } from '../game/EventBus';
import { PhaserGame } from '../game/PhaserGame';
import { JournalPanel } from './JournalPanel';
import { SeedBar } from './SeedBar';
import { creatureAction } from '../content/journal';
import { biomes, creatureFor } from '../content/species';
import { loadJourney, saveJourney } from '../save';
import type { World } from '../world/types';

const DEFAULT_SEED = 'jambhudweepa-evening';

/** A seed in the URL makes a journey shareable — the whole world travels in the link. */
function seedFromUrl(): string {
  const fromQuery = new URLSearchParams(window.location.search).get('seed');
  return fromQuery?.trim() || DEFAULT_SEED;
}

type Arrival = GameToUi['tile-entered'];

export function App() {
  const [seed, setSeed] = useState(seedFromUrl);
  const [world, setWorld] = useState<World | null>(null);
  const [arrival, setArrival] = useState<Arrival | null>(null);
  const [observed, setObserved] = useState<string[]>(() => loadJourney(seedFromUrl()).observed);
  const [memory, setMemory] = useState('');

  // The fog set changes on every step, which is far too often to keep in React state — it would
  // re-render the whole panel each tile. The scene owns it; this ref only carries it to the save.
  const discovered = useRef<string[]>(loadJourney(seedFromUrl()).discovered);
  const initialJourney = useRef(loadJourney(seedFromUrl()));

  useEffect(() => {
    const onWorldReady = ({ world: next }: GameToUi['world-ready']) => setWorld(next);
    const onTileEntered = (payload: Arrival) => {
      setArrival(payload);
      setMemory('');
    };
    const onJourneyChanged = ({ discovered: tiles }: GameToUi['journey-changed']) => {
      discovered.current = tiles;
    };

    EventBus.onEvent('world-ready', onWorldReady);
    EventBus.onEvent('tile-entered', onTileEntered);
    EventBus.onEvent('journey-changed', onJourneyChanged);
    return () => {
      EventBus.offEvent('world-ready', onWorldReady);
      EventBus.offEvent('tile-entered', onTileEntered);
      EventBus.offEvent('journey-changed', onJourneyChanged);
    };
  }, []);

  // Persist on a timer rather than on every step: walking writes to localStorage 4-5 times a
  // second otherwise, and the journey is not worth a synchronous write that often.
  useEffect(() => {
    const timer = window.setInterval(() => {
      saveJourney(seed, { discovered: discovered.current, observed });
    }, 3000);
    const flush = () => saveJourney(seed, { discovered: discovered.current, observed });
    window.addEventListener('pagehide', flush);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [seed, observed]);

  const currentCreature = useMemo(() => {
    if (!world || !arrival) return null;
    const tile = world.tiles[arrival.at.y]?.[arrival.at.x];
    return tile ? creatureFor(tile, world.seed) : null;
  }, [world, arrival]);

  const generate = useCallback((next: string) => {
    // A new map is a deliberate fresh start, so it must not inherit fog the player already lifted.
    discovered.current = [];
    setObserved([]);
    setMemory('');
    setSeed(next);
    const url = new URL(window.location.href);
    url.searchParams.set('seed', next);
    window.history.replaceState(null, '', url);
    EventBus.emitEvent('new-journey', { seed: next });
  }, []);

  const observe = useCallback(() => {
    if (!currentCreature || observed.includes(currentCreature.name)) return;
    setObserved((previous) => [...previous, currentCreature.name]);
    setMemory(`Sketch recorded: ${creatureAction(currentCreature)}`);
  }, [currentCreature, observed]);

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>South of Tethys</h1>
          <p className="tagline">
            A cozy Jambhudweepa travel prototype. Walk with <kbd>WASD</kbd> or the arrow keys, or tap
            where you want to go.
          </p>
        </div>
        <SeedBar seed={seed} onGenerate={generate} />
      </header>

      <main className="layout">
        <PhaserGame seed={seed} discovered={initialJourney.current.discovered} />

        <aside className="sidebar">
          <JournalPanel
            entry={arrival?.entry ?? null}
            surroundings={arrival?.surroundings ?? ''}
            hint={arrival?.hint ?? ''}
            discovered={arrival?.discovered ?? 0}
            atLandmark={arrival?.atLandmark ?? false}
            memory={memory}
            canObserve={Boolean(currentCreature)}
            alreadySketched={Boolean(currentCreature && observed.includes(currentCreature.name))}
            onObserve={observe}
          />

          <section className="legend">
            <h2>Map Legend</h2>
            <ul className="legend-list">
              {biomes.map((biome) => (
                <li key={biome.id}>
                  <i className="swatch" style={{ background: biome.color }} aria-hidden="true" />
                  {biome.name}
                </li>
              ))}
            </ul>
          </section>

          {observed.length > 0 && (
            <section className="sketches">
              <h2>Field sketches ({observed.length})</h2>
              <ul>
                {observed.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </main>
    </div>
  );
}
