// Layout and shared state. The map is a sibling, not a child — React never renders a tile.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EventBus, type GameToUi } from '../game/EventBus';
import { PhaserGame } from '../game/PhaserGame';
import { JournalPanel } from './JournalPanel';
import { JourneyLog } from './JourneyLog';
import { Controls } from './Controls';
import { CanonPanel } from './CanonPanel';
import { canonStatus, type CanonStatus, type Place } from './canonClient';
import { creatureAction } from '../content/journal';
import { creatureFor, floraFor } from '../content/species';
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

  // The log starts open where there is room beside the map and closed where it would cover it.
  // Only the initial state — once the player has opened or closed it, that is their decision and
  // rotating the device does not overrule it.
  const [logOpen, setLogOpen] = useState(
    () => window.matchMedia('(orientation: landscape) and (min-width: 700px)').matches
  );

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
  const [canon, setCanon] = useState<CanonStatus>({ lore: false, ask: false });
  useEffect(() => {
    let live = true;
    canonStatus().then((status) => {
      if (live) setCanon(status);
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

  // Tell the scene how much of the canvas the overlays are covering, so the camera can keep the
  // traveller somewhere they can be seen. React is the only side that knows this — it renders them.
  //
  // Measured rather than derived: the CSS already decides where the panels go, and re-implementing
  // those breakpoints here would be a second copy of the rules waiting to disagree with the first.
  const hasLog = Boolean(travelLog) && logOpen;
  const hasNotes = Boolean(arrival);
  useEffect(() => {
    const stage = document.querySelector('.stage');
    if (!stage) return;

    const report = () => {
      const bounds = stage.getBoundingClientRect();
      const log = document.querySelector('.log')?.getBoundingClientRect();
      const notes = document.querySelector('.journal')?.getBoundingClientRect();
      const covered = (panel?: DOMRect) => (panel ? Math.round(bounds.bottom - panel.top) : 0);

      // The log is a side panel in landscape and a bottom sheet in portrait, and it obscures a
      // different edge in each. Which one it currently is comes from its own width rather than from
      // re-reading the breakpoints — a sheet spans the stage, a side panel does not.
      const isSidePanel = Boolean(log && log.width < bounds.width * 0.8);

      EventBus.emitEvent('viewport-insets', {
        right: isSidePanel ? Math.round(bounds.right - log!.left) : 0,
        bottom: Math.max(covered(notes), isSidePanel ? 0 : covered(log))
      });
    };

    report();
    const observer = new ResizeObserver(report);
    observer.observe(stage);
    for (const panel of document.querySelectorAll('.log, .journal')) observer.observe(panel);
    window.addEventListener('orientationchange', report);

    // And again once the scene exists. Phaser boots asynchronously, so the first report can go out
    // before `WorldScene.create` has subscribed — the message is sent, nobody is listening, and the
    // camera spends the session behaving as though nothing were covering it.
    EventBus.onEvent('world-ready', report);

    return () => {
      observer.disconnect();
      window.removeEventListener('orientationchange', report);
      EventBus.offEvent('world-ready', report);
    };
    // Re-run when a panel appears or disappears, so the observer watches the current set.
  }, [hasLog, hasNotes]);

  const exportText = useCallback(() => {
    if (!travelLog || !world) return;
    downloadText(travelLogToText(travelLog), travelLogFilename(world, 'md'));
  }, [travelLog, world]);

  const exportImage = useCallback(() => {
    if (!travelLog || !world) return;
    void downloadImage(travelLog, travelLogFilename(world, 'png'));
  }, [travelLog, world]);

  return (
    // The stage is the viewport. The canvas fills it and everything else floats on top, which is
    // why nothing here scrolls and there is no page chrome left to scroll past.
    <div className="stage">
      <PhaserGame seed={seed} discovered={initialJourney.current.discovered} />

      <Controls
        seed={seed}
        onGenerate={generate}
        observed={observed}
        logOpen={logOpen}
        onToggleLog={() => setLogOpen((open) => !open)}
      />

      <JourneyLog
        log={travelLog}
        open={logOpen}
        onClose={() => setLogOpen(false)}
        onExportImage={exportImage}
        onExportText={exportText}
      >
        <CanonPanel place={place} status={canon} />
      </JourneyLog>

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

      {/* The arrival still stops the world for a moment, but it can no longer sit below the map —
          there is no below. It comes to the middle, which is where you want to read it anyway. */}
      {arrivalPage && (
        <div className="arrival-veil">
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
        </div>
      )}
    </div>
  );
}
