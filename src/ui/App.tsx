// Layout and shared state. The map is a sibling, not a child — React never renders a tile.

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { EventBus, type GameToUi } from '../game/EventBus';
import { PhaserGame } from '../game/PhaserGame';
import { Controls } from './Controls';
import { CanonPanel } from './CanonPanel';
import { Here } from './Here';
import { SHELTER_LABEL } from './JournalPanel';
import { ShelterMark } from './ShelterMark';
import type { TileAction } from './TileActions';
import type { Step } from '../content/making-chain';
import { CollectionPanel } from './CollectionPanel';
import { Progress } from './Progress';
import { diaryCount } from './Diary';
import { Ending } from './Ending';
import { FieldKit } from './FieldKit';
import { Overworld } from './Overworld';
import { initialSurface, surfaceReducer } from './surface';
import { fieldMap, poi } from '../content/places';
import { SatchelPanel } from './SatchelPanel';
import { SatchelStrip } from './SatchelStrip';
import { RecordTabs, type RecordTab } from './Records';
import { PeoplePanel } from './PeoplePanel';
import { met } from '../content/people';
import { seedFromUrl } from './seed';
import { WorkshopPanel } from './WorkshopPanel';
import { distinct, emptySatchel } from '../content/satchel';
import { offeredHere } from '../content/crafting';
import { gather, gatheredLine } from '../content/gathering';
import { canonStatus, type CanonStatus, type Place } from './canonClient';
import { isPresent, routineFor } from '../content/routine';
import { creatureFor, floraFor } from '../content/species';
import { type Collection, emptyCollection, metOnTile, size } from '../content/collection';
import { buildTravelLog, travelLogFilename, travelLogToText } from '../content/travelLog';
import { downloadImage, downloadText } from './exportJournal';
import { loadJourney, saveJourney } from '../save';
import { advance, answer, craft, hear, knowsRecipe, type WorldMoment } from '../journey';
import { DEFAULT_FIELD_MAP } from '../game/scenes/WorldScene';
import { characterFor } from '../game/player';
import type { World } from '../world/types';

/**
 * Which country to open on, for a link that wants to start somewhere other than Lothal.
 *
 * The same kind of hook as `?hour=` and `?at=`, and here for the same reason: looking at the
 * Narmada should not require travelling there first. An unknown id falls back to the default
 * rather than throwing — this is a convenience, and must never break the game for someone who
 * mistypes one.
 */
function fieldMapFromUrl(): string {
  const asked = new URLSearchParams(window.location.search).get('map')?.trim();
  return asked && fieldMap(asked) ? asked : DEFAULT_FIELD_MAP;
}

/**
 * Which surface a records tab opens.
 *
 * One mapping rather than the ternary each strip carried. Three tabs make a chain of conditionals
 * that has to be edited in three places, which is the shape a fourth tab would get wrong -- and
 * the strips had already drifted into two copies of the same expression.
 */
function recordSurface(tab: RecordTab): 'progress' | 'collection' | 'people' {
  return tab === 'collection' ? 'collection' : tab === 'people' ? 'people' : 'progress';
}

/**
 * Who to walk as, for a link that wants somebody other than Varuna.
 *
 * The same hook as `?seed=`, `?map=`, `?at=` and `?hour=`, and here for the same reason: seeing
 * Guyuk should not require playing to her. An unknown id falls back rather than throwing --
 * `characterFor` handles that -- because this is a convenience and must never break the game for
 * somebody who mistypes one.
 */
function characterFromUrl(): string | null {
  const asked = new URLSearchParams(window.location.search).get('as')?.trim();
  // Null when nothing was asked for, so the save can win. Returning a default here instead made
  // the `??` below dead code and quietly pinned every journey to Varuna.
  return asked ? characterFor(asked).key : null;
}

type Arrival = GameToUi['tile-entered'];

export function App() {
  // Read the save once. Calling loadJourney per state initialiser would parse the same JSON
  // three times and, worse, let the three copies drift.
  const initialJourney = useRef(loadJourney(seedFromUrl()));

  const [seed, setSeed] = useState(seedFromUrl);
  // Who is walking. Part of the journey rather than a setting: a save belongs to a traveller, so
  // the URL only decides it when the save has nothing to say.
  const [characterId] = useState(
    () => characterFromUrl() ?? characterFor(initialJourney.current.characterId).key
  );
  const [world, setWorld] = useState<World | null>(null);
  const [arrival, setArrival] = useState<Arrival | null>(null);
  const [collection, setCollection] = useState<Collection>(initialJourney.current.collection);
  const [memory, setMemory] = useState('');
  const [arrivalPage, setArrivalPage] = useState<GameToUi['landmark-reached'] | null>(null);
  // Separate from `arrivalPage`, which the player can dismiss. Reaching the landmark is a fact
  // about the journey and belongs in the travel log even after the page is closed.
  const [reached, setReached] = useState(initialJourney.current.reached);

  // What the player knows. Every rule about changing it lives in `journey.ts`; this only holds
  // it and hands it to the save.
  const [progress, setProgress] = useState(initialJourney.current.progress);

  // What the traveller is carrying. Every rule about changing it lives in `content/satchel.ts`
  // and `content/crafting.ts`; this only holds it and hands it to the save, exactly as
  // `progress` does.
  const [satchel, setSatchel] = useState(initialJourney.current.satchel ?? emptySatchel());

  /**
   * The current progress and satchel, readable synchronously.
   *
   * **Only for handlers that fire more than once in a tick.** A conversation now does: leaving a
   * place mid-exchange reports every line still to be said, one call each, and a handler reading
   * `progress` from its closure would hand all of them the same starting state — so only the last
   * would survive and the question somebody was giving you would vanish. React state is not
   * readable between two calls in the same tick; a ref is.
   *
   * Everything else should read the state directly. This is a workaround for a batching rule, not
   * a second copy of the truth, and it is kept in step immediately below.
   */
  const latest = useRef({
    progress: initialJourney.current.progress,
    satchel: initialJourney.current.satchel ?? emptySatchel()
  });

  // Kept in step after every commit, so anything that changes progress or the satchel by another
  // route -- looking at something, crafting, gathering -- is visible to the next conversation.
  useEffect(() => {
    latest.current.progress = progress;
    latest.current.satchel = satchel;
  }, [progress, satchel]);

  // The three scales. `fieldMapId` is the country under foot; `poiId` is the authored place
  // being stood in, if any; a sub-location opens inside the place panel rather than here,
  // because going deeper into a ruin is not leaving it.
  const [fieldMapId, setFieldMapId] = useState(fieldMapFromUrl);
  const visited = useRef(new Set<string>());

  /**
   * One value decides what is on screen; the rules are in `surface.ts` and tested under Node.
   *
   * This replaced five independent booleans. They did not merely allow two panels to overlap —
   * they made overlap the *default*, since nothing consulted anything else before opening, and
   * the camera then measured whatever rectangles resulted. Two surfaces cannot collide here
   * because there is one slot to be in.
   *
   * `standingOn` stays a separate fact from whether `here` is open, exactly as it was: knowing
   * where the traveller is and knowing whether they are reading about it are different
   * questions, and conflating them would mean walking off a tile and back to reopen a panel
   * you had dismissed.
   */
  const [ui, dispatch] = useReducer(surfaceReducer, initialSurface);
  const { surface, interrupts, standingOn, placeOpen, satchelRibbon } = ui;

  // The scene owns the clock and says when it turns. React used to run its own timer off the
  // same formulas, which is two clocks agreeing by luck -- and they would have drifted the
  // moment walking started spending time, which it does.
  const [moment, setMoment] = useState<WorldMoment | null>(null);

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

    // Arriving opens the place once; leaving closes it. Both rules now live in the reducer,
    // where they are tested — including the one this handler could not express before: leaving
    // must not close the album or the diary, which are not about the tile being left.
    const onStandingOn = ({ poiId: id }: GameToUi['standing-on']) =>
      dispatch({ type: 'standing-on', poiId: id });
    const onMoment = (next: GameToUi['moment-changed']) => setMoment(next);

    EventBus.onEvent('world-ready', onWorldReady);
    EventBus.onEvent('tile-entered', onTileEntered);
    EventBus.onEvent('journey-changed', onJourneyChanged);
    EventBus.onEvent('landmark-reached', onLandmarkReached);
    EventBus.onEvent('standing-on', onStandingOn);
    EventBus.onEvent('moment-changed', onMoment);
    return () => {
      EventBus.offEvent('world-ready', onWorldReady);
      EventBus.offEvent('tile-entered', onTileEntered);
      EventBus.offEvent('journey-changed', onJourneyChanged);
      EventBus.offEvent('landmark-reached', onLandmarkReached);
      EventBus.offEvent('standing-on', onStandingOn);
      EventBus.offEvent('moment-changed', onMoment);
    };
  }, []);

  // Persist on a timer rather than on every step: walking writes to localStorage 4-5 times a
  // second otherwise, and the journey is not worth a synchronous write that often.
  useEffect(() => {
    const flush = () =>
      saveJourney(seed, {
        characterId,
        discovered: discovered.current,
        collection,
        reached,
        progress,
        satchel
      });
    const timer = window.setInterval(flush, 3000);
    window.addEventListener('pagehide', flush);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [seed, collection, reached, progress, satchel]);

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
    // The collection is trip-scoped: a new world is a new walk, not a continuing album.
    setCollection(emptyCollection());
    setProgress(loadJourney(next).progress);
    // A new world is a new walk. What was in the satchel belonged to the old one.
    setSatchel(loadJourney(next).satchel);
    setMemory('');
    setArrivalPage(null);
    setReached(false);
    setSeed(next);
    const url = new URL(window.location.href);
    url.searchParams.set('seed', next);
    window.history.replaceState(null, '', url);
    EventBus.emitEvent('new-journey', { seed: next });
  }, []);

  /**
   * Whether the animal is actually here, rather than asleep or sheltering somewhere out of it.
   *
   * A sketch needs a subject. Refusing when the creature is not out is the point of the
   * routine system, and the journal says which hour to come back for.
   */
  const creatureIsOut = useMemo(
    () => Boolean(currentCreature) && isPresent(routineFor(currentCreature!, moment)),
    [currentCreature, moment]
  );

  /**
   * Meeting things is a consequence of being somewhere, not of pressing a button.
   *
   * The old "Observe creature" button appended a name to a list that nothing read -- the whole
   * mechanic was that the button then said something else. Standing on a tile with a creature
   * out is the encounter, so that is what gets recorded, and the starting tile seeds the album
   * so it is never empty on arrival.
   *
   * A creature only counts while it is actually out: `routineFor` decides that from the hour,
   * so a nocturnal animal met at noon was not met. The flora is always there to be seen.
   */
  useEffect(() => {
    if (!world || !arrival) return;
    const tile = world.tiles[arrival.at.y]?.[arrival.at.x];
    if (!tile) return;
    setCollection((previous) =>
      metOnTile(previous, {
        creature: creatureIsOut ? currentCreature : null,
        flora: floraFor(tile, world.seed)
      })
    );
  }, [world, arrival, currentCreature, creatureIsOut]);

  /** Look closer at something. The rule for whether that is possible is `journey.ts`'s. */
  const look = useCallback(
    (discoveryId: string) => setProgress((p) => advance(p, discoveryId, moment)),
    [moment]
  );

  /**
   * Listen to someone, and take what the line gives — a word, a question, a lead, a recipe.
   *
   * Both halves of `hear` are applied, and that is why it returns both: a line can cost an
   * item, and a gift the player keeps is worse than one they never gave, because it looks
   * like it worked. `satchel` is in the dependency list rather than read through a ref
   * because paying with a stale one would spend something already spent.
   */
  /**
   * Hear one line, and take what it gives.
   *
   * **Updated from the previous state rather than from the captured one.** A conversation can now
   * report several lines in a single tick — leaving a place mid-exchange records everything that
   * was still to be said — and a handler that read `progress` from its closure gave each of those
   * calls the *same* starting state, so only the last one survived. Thrali would hand over his
   * question and the panel would drop it on the way out.
   *
   * The satchel is updated the same way and for the same reason, though only a line with a price
   * touches it.
   */
  const listen = useCallback((npcId: string, lineIndex: number) => {
    // Both halves come from one `hear`, so the price and what it bought cannot come apart. The
    // refs are what make a run of calls in a single tick each see the one before it: a state
    // setter's argument is not readable until React re-renders, and by then the rest of the
    // exchange has already been reported.
    const heard = hear(latest.current.progress, npcId, lineIndex, latest.current.satchel);
    latest.current.progress = heard.progress;
    setProgress(heard.progress);
    if (heard.paid) {
      latest.current.satchel = heard.satchel;
      setSatchel(heard.satchel);
    }
  }, []);

  /**
   * Where the traveller stands, as far as making is concerned.
   *
   * A sited process -- firing, tanning, brewing -- wants a kind of place, and canon states the
   * kind on the point of interest. Off an authored place this is null, which `crafting.ts`
   * reads as open ground.
   */
  const bench = useMemo(
    () => ({ kind: standingOn ? poi(standingOn)?.kind ?? null : null }),
    [standingOn]
  );

  /** The tile under foot, for gathering. Null before the world has been built. */
  const underfoot = useMemo(() => {
    if (!world || !arrival) return null;
    const tile = world.tiles[arrival.at.y]?.[arrival.at.x];
    return tile ? { at: arrival.at, biome: tile.biome, seed: world.seed } : null;
  }, [world, arrival]);

  /**
   * Stoop and pick up whatever this tile offers.
   *
   * Done in React straight from the content layer rather than routed through the scene, on
   * the precedent `EventBus.ts` sets for observing a creature: the content layer is
   * framework-free and importable here, and going through the scene is what once made the
   * journal describe a crane while the sketch recorded an otter.
   */
  const pickUp = useCallback(() => {
    if (!underfoot) return;
    setSatchel((s) => gather(s, underfoot.seed, underfoot.at, underfoot.biome));
  }, [underfoot]);

  /**
   * Everything that can be done on the tile under foot, in one list.
   *
   * Assembled here because this is the only place that already holds all three answers -- what
   * the ground offers, how tired the traveller is, and what the hour is doing. The panel renders
   * the list and decides nothing.
   *
   * **A blocked action keeps its row and states its reason.** That is the genre convention and
   * it is load-bearing rather than polite: a row reading "nothing here to take" teaches that
   * ground can hold things, where a vanished row teaches nothing at all. It is also the shape
   * the workshop will need in phase two, where the reason is "needs a settlement".
   */
  const tileActions = useMemo<TileAction[]>(() => {
    const takeable = underfoot
      ? gatheredLine(underfoot.seed, underfoot.at, underfoot.biome)
      : null;
    const shelter = arrival?.shelter ?? 'bedroll';

    return [
      {
        id: 'take',
        label: 'Take what is here',
        detail: takeable ?? undefined,
        mark: '❀',
        blocked: takeable ? null : 'Nothing on this ground to take.',
        onDo: pickUp
      },
      {
        id: 'rest',
        label: SHELTER_LABEL[shelter] ?? 'Stop for the night',
        detail: arrival?.fatigue ?? undefined,
        mark: <ShelterMark shelter={shelter} />,
        // `canCamp` is the rules layer's answer, not this panel's guess -- resting is refused
        // in daylight because a night passed at noon is not a night.
        blocked: arrival?.canCamp ? null : 'Not yet -- there is daylight left.',
        onDo: () => EventBus.emitEvent('camp', {})
      }
    ];
  }, [underfoot, arrival, pickUp]);

  /**
   * Whether the player has been shown how to make something.
   *
   * Composed here rather than inside the panel or inside `crafting.ts`: knowing is a fact
   * about the journey, making is a fact about the satchel, and this is the one place that
   * holds both. Memoised on `progress.recipes` rather than on `progress`, because the panel
   * re-filters 72 recipes with it and every step of the walk changes `progress`.
   */
  const knowsRecipeHere = useCallback(
    (recipeId: string) => knowsRecipe(progress, recipeId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [progress.recipes]
  );

  /**
   * Make a thing, and remember having made it.
   *
   * `journey.craft` returns both halves for the same reason `hear` does: the satchel loses the
   * object the moment it is given away, and the keepsake at the end is built from what was
   * made rather than from what is still carried.
   */
  /**
   * The rungs of the last thing made, for the workshop to print.
   *
   * Held here rather than in the panel because the panel is not the thing that made it -- and a
   * log that lived in the panel would vanish the moment it closed, which is exactly when a player
   * wants to reread what just happened.
   */
  const [lastMade, setLastMade] = useState<Step[]>([]);

  const makeHere = useCallback(
    (recipeId: string) => {
      const done = craft(progress, satchel, recipeId, bench);
      if (!done.made) return;
      setProgress(done.progress);
      setSatchel(done.satchel);
      setLastMade(done.steps);
    },
    [progress, satchel, bench]
  );

  /** Settle a question. The player may be wrong, and nothing here tells them so. */
  const settle = useCallback(
    (questionId: string, index: number) => setProgress((p) => answer(p, questionId, index)),
    []
  );

  const travel = useCallback(
    (next: string) => {
      setFieldMapId(next);
      // Arriving in another country is leaving wherever you were standing, and the map that
      // sent you there has done its job.
      dispatch({ type: 'standing-on', poiId: null });
      dispatch({ type: 'close-interrupt', which: 'overworld' });
      discovered.current = [];
      EventBus.emitEvent('travel-to', { fieldMapId: next, seed });
    },
    [seed]
  );

  const travelLog = useMemo(() => {
    if (!world) return null;
    return buildTravelLog(
      world,
      { discovered: arrival?.discovered ?? 0, collection, reachedLandmark: reached, progress },
      `${window.location.origin}${window.location.pathname}`
    );
  }, [world, arrival?.discovered, collection, reached, progress]);

  // Tell the scene how much of the canvas the overlays are covering, so the camera can keep the
  // traveller somewhere they can be seen. React is the only side that knows this — it renders them.
  //
  // Measured rather than derived: the CSS already decides where the panels go, and re-implementing
  // those breakpoints here would be a second copy of the rules waiting to disagree with the first.
  // Only the field notes float over the map now. The travel log used to as well, in two
  // different shapes -- a side panel in landscape, a bottom sheet in portrait -- and telling
  // those apart by measuring its width, then deciding which edge it covered, was most of what
  // this effect did. Retiring the panel retires the arithmetic with it.
  const hasNotes = Boolean(arrival) && surface === 'here';
  useEffect(() => {
    const stage = document.querySelector('.stage');
    if (!stage) return;

    const report = () => {
      const bounds = stage.getBoundingClientRect();
      const notes = document.querySelector('.journal')?.getBoundingClientRect();

      EventBus.emitEvent('viewport-insets', {
        right: 0,
        bottom: notes ? Math.round(bounds.bottom - notes.top) : 0
      });
    };

    report();
    const observer = new ResizeObserver(report);
    observer.observe(stage);
    for (const panel of document.querySelectorAll('.journal')) observer.observe(panel);
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
    // Re-run when the notes appear or disappear, so the observer watches the current set.
  }, [hasNotes]);

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
      <PhaserGame
        seed={seed}
        discovered={initialJourney.current.discovered}
        fieldMapId={fieldMapFromUrl()}
        characterId={characterId}
      />

      {/* The bar and the satchel strip stack together in the top-left. The strip is always on
          screen because every other decision is read against it -- see the note at the top of
          `SatchelStrip` -- and it flows under the bar rather than sitting at a fixed offset,
          because the bar wraps to two rows on a narrow phone. */}
      <div className="controls-stack">
      <Controls
        seed={seed}
        onGenerate={generate}
        metCount={size(collection)}
        diaryCount={diaryCount(progress)}
        recordsOpen={surface === 'progress' || surface === 'collection'}
        // Opens on the journey, which is the one a player is more often coming back to -- the
        // album is browsed and the diary is worked. Toggling closes whichever is showing.
        onOpenRecords={() =>
          dispatch({
            type: 'toggle',
            surface: surface === 'collection' ? 'collection' : 'progress'
          })
        }
        carryCount={distinct(satchel)}
        offeredHere={offeredHere(bench, knowsRecipeHere).length}
        onOpenWorkshop={() => dispatch({ type: 'open-interrupt', which: 'workshop' })}
        onOpenOverworld={() =>
          dispatch({
            type: interrupts.overworld ? 'close-interrupt' : 'open-interrupt',
            which: 'overworld'
          })
        }
        notesOpen={surface === 'here'}
        onToggleNotes={() => dispatch({ type: 'toggle', surface: 'here' })}
        satchelRibbon={satchelRibbon}
        onToggleSatchelRibbon={() => dispatch({ type: 'toggle-satchel-ribbon' })}
        placeName={standingOn ? poi(standingOn)?.name ?? null : null}
        placeOpen={placeOpen}
        onTogglePlace={() => dispatch({ type: 'toggle-place' })}
      />
        {satchelRibbon && (
          <SatchelStrip
            satchel={satchel}
            onOpen={() => dispatch({ type: 'open-interrupt', which: 'satchel' })}
          />
        )}
      </div>

      {/* One door, three tabs. The panels are unchanged -- each keeps its own escape handling and
          focus behaviour, because they were right before this and consolidating surfaces is not a
          licence to rewrite them. The strip renders into each panel's own `tabs` slot rather than
          floating over it: both draw a full-screen veil, so anything positioned above the page
          sits underneath them. */}
      <Progress
        tabs={
          <RecordTabs
            tab="journey"
            onTab={(tab: RecordTab) => dispatch({ type: 'show', surface: recordSurface(tab) })}
            journeyCount={diaryCount(progress)}
            metCount={size(collection)}
            peopleCount={met(progress).length}
          />
        }
        progress={progress}
        moment={moment}
        open={surface === 'progress'}
        onClose={() => dispatch({ type: 'close' })}
        onAnswer={settle}
        onOpenEnding={() => dispatch({ type: 'open-interrupt', which: 'ending' })}
        onOpenKit={() => dispatch({ type: 'open-interrupt', which: 'kit' })}
        replayUrl={travelLog?.replayUrl ?? null}
        onExportImage={exportImage}
        onExportText={exportText}
      />

      <CollectionPanel
        tabs={
          <RecordTabs
            tab="collection"
            onTab={(tab: RecordTab) => dispatch({ type: 'show', surface: recordSurface(tab) })}
            journeyCount={diaryCount(progress)}
            metCount={size(collection)}
            peopleCount={met(progress).length}
          />
        }
        collection={collection}
        open={surface === 'collection'}
        onClose={() => dispatch({ type: 'close' })}
        canAsk={canon.lore}
      />

      <PeoplePanel
        tabs={
          <RecordTabs
            tab="people"
            onTab={(tab: RecordTab) => dispatch({ type: 'show', surface: recordSurface(tab) })}
            journeyCount={diaryCount(progress)}
            metCount={size(collection)}
            peopleCount={met(progress).length}
          />
        }
        progress={progress}
        open={surface === 'people'}
        onClose={() => dispatch({ type: 'close' })}
      />

      <FieldKit
        progress={progress}
        open={interrupts.kit}
        onClose={() => dispatch({ type: 'close-interrupt', which: 'kit' })}
        canResearch={canon.lore}
      />

      <SatchelPanel
        satchel={satchel}
        open={interrupts.satchel}
        onClose={() => dispatch({ type: 'close-interrupt', which: 'satchel' })}
      />

      <WorkshopPanel
        satchel={satchel}
        bench={bench}
        knows={knowsRecipeHere}
        onMake={makeHere}
        lastMade={lastMade}
        open={interrupts.workshop}
        onClose={() => dispatch({ type: 'close-interrupt', which: 'workshop' })}
      />

      <Ending
        progress={progress}
        open={interrupts.ending}
        onClose={() => dispatch({ type: 'close-interrupt', which: 'ending' })}
      />

      <Overworld
        current={fieldMapId}
        progress={progress}
        open={interrupts.overworld}
        onTravel={travel}
        onClose={() => dispatch({ type: 'close-interrupt', which: 'overworld' })}
      />

      {/* One surface, two layers: the notes are the floor, a place sits over them, and canon
          is a section inside the notes rather than a panel of its own. */}
      <Here
        open={surface === 'here'}
        notes={{
          entry: arrival?.entry ?? null,
          surroundings: arrival?.surroundings ?? '',
          hint: arrival?.hint ?? '',
          whereNext: arrival?.whereNext ?? '',
          fatigue: arrival?.fatigue ?? null,
          dusk: arrival?.dusk ?? null,
          discovered: arrival?.discovered ?? 0,
          atLandmark: arrival?.atLandmark ?? false,
          memory,
        }}
        place={{
          poiId: placeOpen ? standingOn : null,
          progress,
          moment,
          firstVisit: Boolean(standingOn) && !visited.current.has(standingOn!),
          onLook: look,
          satchel,
          onListen: listen,
          onClose: () => {
            if (standingOn) visited.current.add(standingOn);
            dispatch({ type: 'close-place' });
          }
        }}
        canon={<CanonPanel place={place} status={canon} />}
        actions={tileActions}
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
