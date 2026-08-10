// Layout and shared state. The map is a sibling, not a child — React never renders a tile.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EventBus, type GameToUi } from '../game/EventBus';
import { PhaserGame } from '../game/PhaserGame';
import { JournalPanel } from './JournalPanel';
import { SeedBar } from './SeedBar';
import { CanonPanel } from './CanonPanel';
import { canonAvailable, type Place } from './canonClient';
import { creatureAction } from '../content/journal';
import { biomes, creatureFor, floraFor } from '../content/species';
import { buildTravelLog, travelLogFilename, travelLogToText } from '../content/travelLog';
import { downloadImage, downloadText } from './exportJournal';
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
  // Read the save once. Calling loadJourney per state initialiser would parse the same JSON
  // three times and, worse, let the three copies drift.
  const initialJourney = useRef(loadJourney(seedFromUrl()));

  const [seed, setSeed] = useState(seedFromUrl);
  const [world, setWorld] = useState<World | null>(null);
  const [arrival, setArrival] = useState<Arrival | null>(null);
  const [observed, setObserved] = useState<string[]>(initialJourney.current.observed);
  const [memory, setMemory] = useState('');
  const [arrivalPage, setArrivalPage] = useState<GameToUi['landmark-reached'] | null>(null);
  // Separate from `arrivalPage`, which the player can dismiss. Reaching the landmark is a fact
  // about the journey and belongs in the travel log even after the page is closed.
  const [reached, setReached] = useState(initialJourney.current.reached);

  // The fog set changes on every step, which is far too often to keep in React state — it would
  // re-render the whole panel each tile. The scene owns it; this ref only carries it to the save.
  const discovered = useRef<string[]>(initialJourney.current.discovered);

  useEffect(() => {
    const onWorldReady = ({ world: next }: GameToUi['world-ready']) => setWorld(next);
    const onTileEntered = (payload: Arrival) => {
      setArrival(payload);
      setMemory('');
    };
    const onJourneyChanged = ({ discovered: tiles }: GameToUi['journey-changed']) => {
      discovered.current = tiles;
    };

    const onLandmarkReached = (payload: GameToUi['landmark-reached']) => {
      setArrivalPage(payload);
      setReached(true);
    };

    EventBus.onEvent('world-ready', onWorldReady);
    EventBus.onEvent('tile-entered', onTileEntered);
    EventBus.onEvent('journey-changed', onJourneyChanged);
    EventBus.onEvent('landmark-reached', onLandmarkReached);
    return () => {
      EventBus.offEvent('world-ready', onWorldReady);
      EventBus.offEvent('tile-entered', onTileEntered);
      EventBus.offEvent('journey-changed', onJourneyChanged);
      EventBus.offEvent('landmark-reached', onLandmarkReached);
    };
  }, []);

  // Persist on a timer rather than on every step: walking writes to localStorage 4-5 times a
  // second otherwise, and the journey is not worth a synchronous write that often.
  useEffect(() => {
    const flush = () => saveJourney(seed, { discovered: discovered.current, observed, reached });
    const timer = window.setInterval(flush, 3000);
    window.addEventListener('pagehide', flush);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [seed, observed, reached]);

  const currentCreature = useMemo(() => {
    if (!world || !arrival) return null;
    const tile = world.tiles[arrival.at.y]?.[arrival.at.x];
    return tile ? creatureFor(tile, world.seed) : null;
  }, [world, arrival]);

  // Asked once. A canon service is optional and usually absent, so the panel stays hidden
  // rather than offering something that will fail.
  const [canonUp, setCanonUp] = useState(false);
  useEffect(() => {
    let live = true;
    canonAvailable().then((up) => {
      if (live) setCanonUp(up);
    });
    return () => {
      live = false;
    };
  }, []);

  const place = useMemo<Place | null>(() => {
    if (!world || !arrival) return null;
    const tile = world.tiles[arrival.at.y]?.[arrival.at.x];
    if (!tile) return null;
    return {
      seed: world.seed,
      x: arrival.at.x,
      y: arrival.at.y,
      biome: tile.biome,
      creature: creatureFor(tile, world.seed)?.name ?? null,
      flora: floraFor(tile, world.seed)?.name ?? null,
      landmark: arrival.atLandmark ? world.landmark.name : null
    };
  }, [world, arrival]);

  const generate = useCallback((next: string) => {
    // A new map is a deliberate fresh start, so it must not inherit fog the player already lifted.
    discovered.current = [];
    setObserved([]);
    setMemory('');
    setArrivalPage(null);
    setReached(false);
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

  const travelLog = useMemo(() => {
    if (!world) return null;
    return buildTravelLog(
      world,
      { discovered: arrival?.discovered ?? 0, observed, reachedLandmark: reached },
      `${window.location.origin}${window.location.pathname}`
    );
  }, [world, arrival?.discovered, observed, reached]);

  const exportText = useCallback(() => {
    if (!travelLog || !world) return;
    downloadText(travelLogToText(travelLog), travelLogFilename(world, 'md'));
  }, [travelLog, world]);

  const exportImage = useCallback(() => {
    if (!travelLog || !world) return;
    void downloadImage(travelLog, travelLogFilename(world, 'png'));
  }, [travelLog, world]);

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
        <div className="map-column">
          <PhaserGame seed={seed} discovered={initialJourney.current.discovered} />

          {arrivalPage && (
            <section className="arrival" aria-live="polite">
              <h2>{arrivalPage.title}</h2>
              <p>{arrivalPage.body}</p>
              <p className="arrival-closing">{arrivalPage.closing}</p>
              <div className="arrival-actions">
                <button type="button" onClick={exportImage}>
                  Keep this page
                </button>
                <button type="button" className="ghost" onClick={() => setArrivalPage(null)}>
                  Close the journal
                </button>
              </div>
            </section>
          )}
        </div>

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

          <CanonPanel place={place} available={canonUp} />

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

          {/* The takeaway. A game with no win condition still needs something to keep. */}
          <section className="export">
            <h2>Take the journal with you</h2>
            <p className="muted">
              A written record of where you went and what you saw. The seed goes with it, so anyone
              can walk the same country.
            </p>
            <div className="export-actions">
              <button type="button" onClick={exportImage} disabled={!travelLog}>
                Save as image
              </button>
              <button type="button" className="ghost" onClick={exportText} disabled={!travelLog}>
                Save as text
              </button>
            </div>
          </section>
        </aside>
      </main>
    </div>
  );
}
