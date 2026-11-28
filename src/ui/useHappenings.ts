import { rememberNpcAppearance, type NpcAppearanceJournal } from '../content/npcAppearance';
// Things that happen to the traveller, from React's side: asking whether anything happens on a
// night, an arrival, a day's road or at a camp, a story beat first, and the card that opens -- and
// what choosing on it does.
//
// **The third hook out of `App.tsx`** (`docs/satchel-and-hearth.md`, phase 5), moved as it was with
// no change in behaviour. Every rule is still in `content/` -- `happeningNow` in `events.ts`, the
// woven events in `happenings.ts`, the beats in `storylines.ts` -- and the card is `EventCard`. The
// bus listeners that ask moved with the question they ask; the rest of the bus stays in `App`.
// `Happens`, the shape everything else calls it by, is `useRoadTalk`'s.

import type { AmbientTopic } from '../content/npcDialogue';
import { useCallback, useEffect, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { EventBus, type GameToUi } from '../game/EventBus';
import { isComplete, receiveAll, type Progress, type WorldMoment } from '../journey';
import { events, type Choice, type GameEvent, type Occasion } from '../content/events';
import { happeningNow, surroundingsAt, type CampTalk, type Talk, type Wanted } from '../content/happenings';
import { atCamp, campIsOpen, encampmentOn, hospitalityFlag, type Encampment } from '../content/encampments';
import { rumourAt } from '../content/rumours';
import { APPROACHES, approachAt, approachId } from '../content/visitors';
import { beatNow, type BeatWhen } from '../content/storylines';
import { add as addToSatchel, remove as takeFromSatchel, type Satchel } from '../content/satchel';
import { hasLeftArrival, type EncounterState, type PendingSighting } from '../content/encounterState';
import { caravanWitnessEvent } from '../content/campHospitality';
import { tileHash } from '../world/rng';
import type { World } from '../world/types';
import type { SurfaceAction } from './surface';
import type { EventCardProps } from './EventCard';
import type { ArtSelection } from './art';
import type { Happens } from './useRoadTalk';
import { occurrenceId, type DiaryEventEntry } from '../content/diaryEvents';

/** What the bus handlers read, kept current by `App` after every commit. See `latest` there. */
export interface Latest {
  activityOpen?: boolean;
  progress: Progress;
  satchel: Satchel;
  world: World | null;
  fieldMapId: string;
  day: number;
  at: { x: number; y: number } | null;
  moment: WorldMoment | null;
  poiId: string | null;
  /** What the traveller is working towards, for the events that turn something up. See `wantedNow`. */
  wanted: Wanted | null;
}

export function useHappenings({
  latest,
  seenEvents,
  eventDays,
  journeyFlags,
  metStrangers,
  npcAppearances,
  encounters,
  fieldPlaced,
  cardOpenRef,
  pageOpenRef,
  setCardOpen,
  crossing,
  dispatch,
  progress,
  setProgress,
  setSatchel,
  setDiaryEvents,
  setMemory,
  examining = false,
  blocked
}: {
  latest: MutableRefObject<Latest>;
  seenEvents: MutableRefObject<string[]>;
  eventDays: MutableRefObject<Record<string, number>>;
  journeyFlags: MutableRefObject<string[]>;
  metStrangers: MutableRefObject<string[]>;
  npcAppearances: MutableRefObject<NpcAppearanceJournal>;
  encounters: MutableRefObject<EncounterState | undefined>;
  /** Where this map's places landed, from the scene's `world-ready`. */
  fieldPlaced: MutableRefObject<{ poiId: string; at: { x: number; y: number } }[]>;
  /** Set the instant a card opens, so an effect in the same commit sees it. */
  cardOpenRef: MutableRefObject<boolean>;
  /**
   * True while the landmark's page is up. Nothing opens over it: a camp beside the landmark put its
   * welcome on top of the page, and the player was left facing a dacoit band instead of the
   * journey's end (`e2e/playthrough.spec.ts`, on the days the walk passed a camp).
   */
  pageOpenRef: MutableRefObject<boolean>;
  setCardOpen: (open: boolean) => void;
  /** Hold the shared encounter queue while the crossing is being told. */
  crossing: MutableRefObject<boolean>;
  dispatch: Dispatch<SurfaceAction>;
  progress: Progress;
  setProgress: Dispatch<SetStateAction<Progress>>;
  setSatchel: Dispatch<SetStateAction<Satchel>>;
  setDiaryEvents: Dispatch<SetStateAction<DiaryEventEntry[]>>;
  setMemory: (line: string) => void;
  blocked: MutableRefObject<boolean>;
  examining?: boolean;
}) {
  const [happening, setHappening] = useState<{
    event: GameEvent;
  } | null>(null);
  const completedHospitality = useRef<{ visit: string; day?: number; residents?: string[] } | null>(null);
  const beeduSafe = useRef(true);
  const [beeduNearby, setBeeduNearby] = useState(false);
  useEffect(() => {
    cardOpenRef.current = happening !== null || examining;
    setCardOpen(cardOpenRef.current);
  }, [happening, examining, cardOpenRef, setCardOpen]);

  /** `maybeHappens`, once the bus effect has made it. Null for the first render only. */
  const happens = useRef<Happens | null>(null);
  // The story check, handed out of the effect like `happens`; see `storyNow`.
  const storyRef = useRef<((when: BeatWhen, poiId: string | null, requestedArc?: string) => boolean) | null>(null);
  const road = useRef<{ at: { x: number; y: number }; day: number; map: string } | null>(null);

  useEffect(() => {
    const canOpen = () => !blocked.current && !latest.current.activityOpen &&
      !cardOpenRef.current && !pageOpenRef.current && !crossing.current;
    const openCard = (event: GameEvent, remember = true) => {
      if (remember) {
        if (!seenEvents.current.includes(event.id)) seenEvents.current = [...seenEvents.current, event.id];
        eventDays.current = { ...eventDays.current, [event.id]: latest.current.day };
      }
      cardOpenRef.current = true;
      setCardOpen(true);
      setHappening({ event });
    };

    const enqueue = (item: PendingSighting) => {
      const visit = encounters.current;
      if (!visit) return;
      if (visit.pending.some((p) => p.kind === item.kind && p.id === item.id &&
        (p.kind !== 'caravan' || item.kind !== 'caravan' || p.moment === item.moment))) return;
      visit.pending.push(item);
    };

    /**
     * Ask whether anything happens, and open it if so.
     *
     * **One function for all three occasions**, because the only thing that differs between a
     * night, an arrival and a mile of road is the word and the shelter — everything else is the
     * same question asked of the same registry with the same seeded roll. Three copies of this
     * would be three places for the `holds` list to drift out of step.
     */
    const maybeHappens = (
      occasion: Occasion,
      at: { x: number; y: number },
      shelter: string | null,
      salt: string,
      extra: {
        poiId?: string | null;
        taken?: readonly string[];
        strangerId?: string | null;
        talk?: Talk | null;
        camp?: Encampment | null;
        campStanding?: string | null;
        campPerson?: CampTalk | null;
        cameFrom?: string | null;
        /** A craft on its patrol, just come alongside: the Sinauli wagon. */
        passing?: { id: string; vehicle: string } | null;
        force?: { kind?: string; asked?: boolean };
      } = {}
    ): boolean => {
      const world = latest.current.world;
      if (!world || pageOpenRef.current) return false;
      const p = latest.current.progress;
      // Seeded on the tile and the salt, like every other roll in this codebase: the same seed
      // must produce the same journal text, and `Math.random` here would make a seed
      // unshareable and this untestable.
      const roll = (s: string) => tileHash(world.seed, at.x, at.y, `${salt}:${s}`);
      const next = happeningNow(
        {
          occasion,
          shelter,
          fieldMapId: latest.current.fieldMapId,
          day: latest.current.day,
          // Everything the player holds, in the one flat list `Choice.needs` and
          // `Conditions.requires` are checked against -- words, discoveries they have at least
          // noticed, and recipes somebody has shown them. Assembled here because App is the only
          // thing that holds a Progress.
          holds: [...p.words, ...Object.keys(p.rungs), ...p.recipes],
          completed: Object.keys(p.rungs).filter(id=>isComplete(p,id)),
          seen: seenEvents.current,
          met: metStrangers.current,
          last: eventDays.current,
          flags: journeyFlags.current,
          poiId: extra.poiId ?? null,
          cameFrom: extra.cameFrom ?? null,
          campKind: extra.camp?.kind ?? null
        },
        roll,
        // What is here to make an event out of, when nothing authored can happen -- see
        // `happenings.ts`. Read from the same world and tile the roll is seeded on.
        surroundingsAt(world, at, latest.current.fieldMapId, latest.current.moment, roll, {
          ...extra,
          wanted: latest.current.wanted
        }),
        undefined,
        extra.force ?? null
      );
      if (!next) return false;
      openCard(next);
      return true;
    };

    /**
     * **The inspector: open an event now, without walking for three days to be rationed one.**
     *
     * `__happen('road')` asks the road question with the ration skipped; `__happen('night',
     * 'knock', 'roof')` asks for one template on one kind of night. It goes through exactly the path
     * a real step does -- the same surroundings, the same `seen` and `met`, the same card -- so what
     * it proves is the wiring, which no Node test can see. Exposed the way the scene exposes
     * `__walker` and `__travellers`, and for the same reason: `e2e/happenings.spec.ts` reads it.
     * Returns whether a card opened.
     *
     * `poiId` says which point an `arriving` is at, for a written happening narrowed to one -- *Where
     * you stop* belongs to the Caravan Ground. Absent, it is wherever the traveller is standing.
     */
    (
      window as unknown as {
        __happen?: (o: Occasion, kind?: string, shelter?: string, poiId?: string) => boolean;
      }
    ).__happen = (occasion, kind, shelter, poiId) => {
      const here = latest.current.at;
      if (!here) return false;
      return maybeHappens(occasion, here, shelter ?? null, `inspect:${occasion}`, {
        poiId: poiId ?? latest.current.poiId,
        force: kind ? { kind } : {}
      });
    };

    /**
     * A night passed. Ask whether anything happened in it.
     *
     * **`night-passed` had no listener at all** before events: emitted every time somebody slept,
     * carrying where they were and what shelter they had, and read by nothing.
     */
    const onNight = ({ at, shelter, hostedBy, hospitality, startDay, campResidents }: GameToUi['night-passed']) => {
      if (hospitality) {
        completedHospitality.current = { visit: hospitality, day: startDay, residents: campResidents };
        return;
      }
      if (storyNow('night', null)) return;
      // **Beside a camp, the night is at their fire.** The first night slept beside each camp is
      // asked for rather than rationed: its own kind's untold story if canon has one, else the fire
      // or what comes to the edge of its light. Every night after is an ordinary one.
      const camp = hostedBy;
      if (camp) {
        const first = !journeyFlags.current.includes(`fireside:${camp.id}`);
        if (first) journeyFlags.current = [...journeyFlags.current, `fireside:${camp.id}`];
        if (maybeHappens('night', at, shelter, `fireside:${camp.id}`, { camp, ...(first ? { force: { asked: true } } : {}) })) return;
      }
      maybeHappens('night', at, shelter, `night:${latest.current.day}`);
    };

    /**
     * Reached an authored place for the first time this journey.
     *
     * `poi-reached` rather than `standing-on`, deliberately: that one is a *state* and re-fires
     * every time you walk back onto the tile, so an arrival event would replay on every visit.
     * This one means what its name says.
     */
    const openArrival = ({ id: poiId, at: here, returning }: Extract<PendingSighting, { kind: 'place' }>) => {
      if (storyNow('arriving', poiId)) return;
      // Somebody who comes over, the first time you arrive where they are. They take the arrival:
      // a card and a person walking up at once would be two things asking for the same moment.
      if (returning) {
        if (events.some(e => e.id.startsWith('happening_valley_') && e.conditions.requires.length > 0 && e.conditions.pois.includes(poiId))) {
          maybeHappens('arriving', here, null, `returning:${poiId}`, { poiId });
        }
        return;
      }
      const approach = approachAt(poiId, seenEvents.current);
      if (approach) {
        EventBus.emitEvent('approach', { npcId: approach.npcId, sheet: approach.sheet });
        return;
      }
      // A place a stranger sent you to keeps the promise first, unrationed: see `rumourKept`.
      if (
        rumourAt(poiId, journeyFlags.current) &&
        maybeHappens('arriving', here, null, `rumour:${poiId}`, {
          poiId,
          campStanding: latest.current.world
            ? (encampmentOn(latest.current.world, latest.current.fieldMapId, fieldPlaced.current, latest.current.day)?.id ?? null)
            : null,
          force: { kind: 'rumour-kept', asked: true }
        })
      ) {
        return;
      }
      maybeHappens('arriving', here, null, `arriving:${poiId}`, { poiId });
    };

    const onTile = ({ at, day, fieldMapId, walked }: GameToUi['tile-entered']) => {
      let visit = encounters.current;
      if (!visit || visit.map !== fieldMapId) {
        visit = { map: fieldMapId, arrival: at, leftArrival: false, roadDay: visit?.roadDay, pending: [] };
        encounters.current = visit;
        road.current = null;
      }
      if (walked && hasLeftArrival(visit.arrival, at)) visit.leftArrival = true;
      if (walked && visit.roadDay !== day && road.current?.day !== day) road.current = { at, day, map: fieldMapId };
      const world = latest.current.world;
      if (!world || latest.current.fieldMapId !== fieldMapId) return;
      const camp = encampmentOn(world, fieldMapId, fieldPlaced.current, day);
      if (camp && campIsOpen(world, camp, day) && atCamp(camp, at) &&
          !seenEvents.current.includes(`woven:camp:${camp.id}`)) {
        enqueue({ kind: 'camp', id: camp.id, at, day });
      }
    };

    const onAlongside = ({ id, vehicle, at }: GameToUi['wanderer-alongside']) => {
      const visit = encounters.current;
      if (!vehicle || visit?.map !== 'field_map_dwarka' || !visit.leftArrival ||
          seenEvents.current.includes(`woven:passing:${id}`)) return;
      enqueue({ kind: 'wagon', id, vehicle, at });
    };

    // Handed out of the effect so the activity card can ask too: a take is not a bus event, it is a
    // modal React owns, and closing it is where the `working` question belongs.
    /**
     * **A story beat first.** Guyuk's and the princess's arcs (`content/storylines.ts`) are asked
     * before anything rationed or woven, at the same three moments: arriving somewhere, a night, a
     * day's road. A beat waits until it can be taken whole, so this either opens its card or is quiet.
     */
    const storyNow = (when: BeatWhen, poiId: string | null, requestedArc?: string): boolean => {
      // Nothing of a story over the crossing's cards; an arrival is held until stepping down anyway.
      if (pageOpenRef.current || crossing.current) return false;
      const p = latest.current.progress;
      const carried = latest.current.satchel;
      const event = beatNow(when, {
        fieldMapId: latest.current.fieldMapId,
        day: latest.current.day,
        poiId,
        flags: journeyFlags.current,
        requestedArc,
        // A discovery must be understood; a word, a recipe or a question held.
        holds: (id) =>
          id.startsWith('discovery_') ? isComplete(p, id) : p.words.includes(id) || p.recipes.includes(id) || journeyFlags.current.includes(id),
        carried: (id) => carried[id] ?? 0
      });
      if (!event) return false;
      openCard(event, false);
      return true;
    };
    storyRef.current = storyNow;

    happens.current = maybeHappens;
    const queuePlace = (poiId: string, returning: boolean) => {
      const at = fieldPlaced.current.find(place => place.poiId === poiId)?.at;
      if (at) enqueue({ kind: 'place', id: poiId, at, returning });
    };
    const onArrived = ({ poiId }: GameToUi['poi-reached']) => queuePlace(poiId, false);
    const onReturned = ({ poiId, fieldMapId }: GameToUi['poi-returned']) => {
      if (fieldMapId === encounters.current?.map) queuePlace(poiId, true);
    };
    const onApproached = ({ npcId }: GameToUi['approached']) => enqueue({ kind: 'approach', id: npcId });
    /**
     * The inspector for approaches, beside `__happen`: bring somebody over now, wherever you are.
     * The same bus message a first arrival sends, so what it proves is the walk and the wiring.
     */
    (window as unknown as { __approach?: (npcId: string) => boolean }).__approach = (npcId) => {
      const approach = APPROACHES.find((a) => a.npcId === npcId);
      if (!approach || !latest.current.at) return false;
      EventBus.emitEvent('approach', { npcId: approach.npcId, sheet: approach.sheet });
      return true;
    };

    const onCaravanWitnessed = ({ id, moment }: GameToUi['caravan-witnessed']) => {
      if (encounters.current?.map === 'field_map_twins' &&
          !seenEvents.current.includes(`woven:elamite-${moment}:${id}`)) enqueue({ kind: 'caravan', id, moment });
    };
    const sight = ({ flightId }: GameToUi['beedu-sighted']) => {
      if (!seenEvents.current.includes('happening_twin_beedu_flight')) enqueue({ kind: 'beedu', id: flightId });
    };
    const nearby = ({ near, safe = true }: GameToUi['beedu-nearby']) => {
      beeduSafe.current = safe;
      setBeeduNearby(near);
    };
    const deliver = () => {
      const visit = encounters.current;
      const current = latest.current;
      if (!canOpen() || !current.world || !visit || visit.map !== current.fieldMapId) return;
      const index = visit.pending.findIndex((item) => item.kind !== 'beedu' || beeduSafe.current);
      const pending = index >= 0 ? visit.pending.splice(index, 1)[0] : undefined;
      if (pending) {
        switch (pending.kind) {
          case 'place': openArrival(pending); break;
          case 'approach': {
            const approach = APPROACHES.find(({ npcId }) => npcId === pending.id);
            if (approach && !seenEvents.current.includes(approachId(approach))) {
              seenEvents.current = [...seenEvents.current, approachId(approach)];
              dispatch({ type: 'talk-to', npcId: pending.id });
            }
            break;
          }
          case 'camp': {
            const camp = encampmentOn(current.world, visit.map, fieldPlaced.current, pending.day);
            if (camp?.id === pending.id) maybeHappens('arriving', pending.at, null, `camp:${camp.id}`, {
              camp, force: { kind: 'camp', asked: true }
            });
            break;
          }
          case 'wagon': {
            maybeHappens('road', pending.at, null, `passing:${pending.id}`, {
              passing: { id: pending.id, vehicle: pending.vehicle }, force: { kind: 'passing', asked: true }
            });
            break;
          }
          case 'caravan': {
            const event = caravanWitnessEvent({ id: pending.id }, pending.moment, visit.map);
            if (!seenEvents.current.includes(event.id)) openCard(event);
            break;
          }
          case 'beedu': {
            const event = events.find(e => e.id === 'happening_twin_beedu_flight');
            if (event && pending.id.startsWith(current.world.seed + ':') && !seenEvents.current.includes(event.id)) {
              if (!journeyFlags.current.includes('beedu:witnessed')) journeyFlags.current = [...journeyFlags.current, 'beedu:witnessed'];
              openCard(event);
            }
            break;
          }
        }
        return;
      }
      const next = road.current;
      if (next && next.map === visit.map && current.day >= next.day) {
        road.current = null;
        if (next.day !== current.day || visit.roadDay === next.day) return;
        visit.roadDay = next.day;
        if (!storyNow('road', null)) maybeHappens('road', next.at, null, `road:${next.day}`);
      }
    };
    const timer = window.setInterval(deliver, 120);
    EventBus.onEvent('approached', onApproached);
    EventBus.onEvent('beedu-sighted', sight);
    EventBus.onEvent('beedu-nearby', nearby);
    EventBus.onEvent('caravan-witnessed', onCaravanWitnessed);
    EventBus.onEvent('night-passed', onNight);
    EventBus.onEvent('poi-reached', onArrived);
    EventBus.onEvent('poi-returned', onReturned);
    EventBus.onEvent('tile-entered', onTile);
    EventBus.onEvent('wanderer-alongside', onAlongside);
    return () => {
      window.clearInterval(timer);
      EventBus.offEvent('approached', onApproached);
      EventBus.offEvent('beedu-sighted', sight);
      EventBus.offEvent('beedu-nearby', nearby);
      EventBus.offEvent('night-passed', onNight);
      EventBus.offEvent('caravan-witnessed', onCaravanWitnessed);
      EventBus.offEvent('poi-reached', onArrived);
      EventBus.offEvent('poi-returned', onReturned);
      EventBus.offEvent('tile-entered', onTile);
      EventBus.offEvent('wanderer-alongside', onAlongside);
    };
    // Registered once, like the rest of the bus: every handler reads the refs, never the closure.
  }, []);

  function resolveEvent(event: GameEvent, choice: Choice, art: ArtSelection | null, topic?: AmbientTopic) {
    type Overnight = { visit: string; day?: number; residents?: string[] };
    let overnight: Overnight | null = null;
    if (event.id.startsWith('woven:camp-sleep:')) {
      if (choice.id === 'leave' || !event.subjectId || journeyFlags.current.includes(hospitalityFlag({ id: event.subjectId }))) {
        setHappening(null);
        return;
      }
      completedHospitality.current = null;
      EventBus.emitEvent('camp', { hospitality: event.subjectId });
      overnight = completedHospitality.current as Overnight | null;
      if (overnight?.visit !== event.subjectId) {
        setHappening(null);
        return;
      }
    }
    if (event.once && (event.origin === 'discovery' || event.origin === 'sub-location') &&
        seenEvents.current.includes(event.id)) return;
    // Through the same door a conversation uses. An event grants the same kinds of thing a
    // person does, so it must not grow a second way to change a Progress.
    if (choice.grants.length > 0) setProgress((p) => receiveAll(p, choice.grants));
    // Something found or given goes in the satchel, and something eased goes to the scene
    // through the door a remedy already uses -- see `Choice.gives` and `Choice.eases`.
    // And what a story beat asked to be handed over leaves the satchel: rice to Guyuk, the
    // seeds to the Atelier. The beat only came because it was all carried.
    if (choice.takes && choice.takes.length > 0) {
      const taken = choice.takes;
      setSatchel((s) => taken.reduce((held, t) => takeFromSatchel(held, t.id, t.n), s));
    }
    if (choice.gives && choice.gives.length > 0) {
      const given = choice.gives;
      setSatchel((s) => given.reduce((held, g) => addToSatchel(held, g.id, g.n), s));
    }
    if (choice.eases && choice.eases > 0) EventBus.emitEvent('ease', { by: choice.eases });
    // What this choice leaves behind, for a later event to find.
    if (choice.clears?.length) journeyFlags.current = journeyFlags.current.filter((flag) => !choice.clears!.includes(flag));
    for (const flag of choice.sets ?? []) {
      if (!journeyFlags.current.includes(flag)) journeyFlags.current = [...journeyFlags.current, flag];
    }
    EventBus.emitEvent('twin-knowledge', {completed:Object.keys(latest.current.progress.rungs).filter(id=>isComplete(latest.current.progress,id)), flags:journeyFlags.current});
    // Whoever this was about, you have met now.
    const stranger = event.stranger;
    if (stranger) {
      rememberNpcAppearance(npcAppearances.current, stranger.id, stranger.look);
      if (!metStrangers.current.includes(stranger.id)) metStrangers.current = [...metStrangers.current, stranger.id];
    }
    // Noted rather than announced, like every other outcome in this game: the progression
    // is a written journal and a thing that happened to you is a line in it.
    setMemory(choice.line);
    const news = event.topics?.find(({ id }) => id === 'news');
    const prose = [event.prose, news?.line, topic?.id === 'news' ? null : topic?.line].filter(Boolean).join(' ');
    setDiaryEvents((entries) => [
      ...entries,
      {
        id: occurrenceId(event.id, entries),
        eventId: event.id,
        origin: event.origin ?? (event.id.startsWith('happening_') ? 'happening' : 'woven'),
        ...(event.subjectId ? { subjectId: event.subjectId } : {}),
        title: event.title,
        prose,
        choiceId: choice.id,
        choiceLabel: choice.label,
        outcome: choice.line,
        day: overnight?.day ?? latest.current.day,
        ...(overnight?.residents ? { campResidents: overnight.residents } : {}),
        fieldMapId: latest.current.fieldMapId,
        ...(latest.current.poiId ? { poiId: latest.current.poiId } : {}),
        art: art && (art.folder === 'events' || art.folder === 'scenes' || art.folder === 'places')
          ? { collection: art.folder, key: art.key, take: art.take }
          : null
      }
    ]);
    if (event.once && !seenEvents.current.includes(event.id)) {
      seenEvents.current = [...seenEvents.current, event.id];
    }
  }

  const hearTopic = useCallback(({ historyKey, day }: AmbientTopic) => {
    if (eventDays.current[historyKey] === day) return;
    eventDays.current = { ...eventDays.current, [historyKey]: day };
  }, [eventDays]);

  /** The event card's props, or null while nothing is open. */
  const card: EventCardProps | null = happening
    ? {
        event: happening.event,
        met: metStrangers.current,
        holds: [...progress.words, ...Object.keys(progress.rungs), ...progress.recipes],
        onChoose: (choice, art, topic) => resolveEvent(happening.event, choice, art, topic),
        onTopicHeard: hearTopic,
        onClose: () => setHappening(null)
      }
    : null;

  return { happening, setHappening, resolveEvent, happens, storyRef, beeduNearby, card };
}
