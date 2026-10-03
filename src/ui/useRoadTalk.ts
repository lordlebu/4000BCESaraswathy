// The road's people, from React's side: who the talk row means, calling out to somebody so they
// wait, opening what they have to say once you are beside them, the people who keep today's camp,
// and who speaks first as you come alongside.
//
// **The first hook out of `App.tsx`** (`docs/retrospective.md`, what to do next, item 2;
// `docs/scaling-study.md` section 2), moved as it was with no change in behaviour. Every rule is
// still in `content/` -- `roadTalk` and `talkTarget` in `presence.ts`, `campPeople` and
// `campCallers` in `campLife.ts`, `whoSpeaksFirst` in `bumping.ts` -- and the scene's half is
// `game/systems/TravellerView.ts`. What this takes from `App` is its parameter list, which is the
// point of moving it: the seam is written down.

import { useEffect, useMemo, useRef, useState, type Dispatch, type MutableRefObject } from 'react';
import { EventBus, type GameToUi } from '../game/EventBus';
import { campCallers, campPeople, doingLine, type CampActivity, type CampPerson } from '../content/campLife';
import { encampmentOn, type Encampment } from '../content/encampments';
import { roadTalk } from '../content/presence';
import { travellersOn } from '../content/travellers';
import type { Bumped } from '../content/bumping';
import type { Occasion } from '../content/events';
import type { CampTalk, Talk } from '../content/happenings';
import type { SurfaceAction } from './surface';
import type { World } from '../world/types';

/** `maybeHappens` as App hands it out: open a card for this occasion, here, if one is due. */
export type Happens = (
    occasion: Occasion,
    at: { x: number; y: number },
    shelter: string | null,
    salt: string,
    extra?: {
      poiId?: string | null;
      taken?: readonly string[];
      strangerId?: string | null;
      talk?: Talk | null;
      camp?: Encampment | null;
      campPerson?: CampTalk | null;
      cameFrom?: string | null;
      /** The painting of the road just travelled, for a road's happening that has none of its own. */
      roadArt?: string | null;
      force?: { kind?: string; asked?: boolean };
    }
  ) => boolean;

export function useRoadTalk({
  nearbyTravellers,
  world,
  arrival,
  fieldMapId,
  fieldPlaced,
  metStrangers,
  seenEvents,
  happens,
  dispatch,
  talkFor,
  cardOpen,
  cardOpenRef,
  bumpedNamed,
  speakFirst
}: {
  /** Who the scene reports walking near, closest first. */
  nearbyTravellers: GameToUi['travellers-nearby']['travellers'];
  world: World | null;
  arrival: { at: { x: number; y: number }; day: number } | null;
  fieldMapId: string;
  /** Where this map's places landed, from the scene's `world-ready`. */
  fieldPlaced: MutableRefObject<{ poiId: string; at: { x: number; y: number } }[]>;
  metStrangers: MutableRefObject<string[]>;
  seenEvents: MutableRefObject<string[]>;
  happens: MutableRefObject<Happens | null>;
  dispatch: Dispatch<SurfaceAction>;
  /** What a stranger walked up to makes of the player, for small talk. */
  talkFor: (travellerId: string, at: { x: number; y: number }) => Talk;
  cardOpen: boolean;
  cardOpenRef: MutableRefObject<boolean>;
  /** Who among the named people near has a reason to speak first. */
  bumpedNamed: (npcIds: readonly string[], travellerOf: (npcId: string) => string | null) => Bumped[];
  speakFirst: MutableRefObject<(near: readonly Bumped[]) => void>;
}) {
  // Who the talk row is about. **Asked of `roadTalk`**, which says who they are, whether they are
  // beside you, and who else is near; `chosen` is somebody the player tapped, kept while they are
  // in view, and `previousTarget` keeps a tie between two equally near people from flicking.
  const [chosenTraveller, setChosenTraveller] = useState<string | null>(null);
  const previousTarget = useRef<string | null>(null);
  // Everybody who could be near: the road's travellers and, while a camp stands, the people who
  // keep it. The scene draws them both and reports them both; this is who they are.
  const campToday = useMemo(
    () => (world && arrival ? encampmentOn(world, fieldMapId, fieldPlaced.current, arrival.day) : null),
    [world, fieldMapId, arrival?.day]
  );
  const seed = world?.seed ?? '';
  const campFolk = useMemo<CampPerson[]>(() => (campToday ? campPeople(campToday, fieldMapId, seed) : []), [campToday, fieldMapId, seed]);
  const talk = useMemo(
    () =>
      roadTalk(nearbyTravellers, fieldMapId, metStrangers.current, chosenTraveller, previousTarget.current, [
        ...travellersOn(fieldMapId, seed),
        ...campFolk
      ], campToday?.kind ?? null),
    [nearbyTravellers, fieldMapId, chosenTraveller, campFolk]
  );
  const talkTargetId = talk?.travellerId ?? null;
  useEffect(() => {
    previousTarget.current = talkTargetId;
    // The map marks whoever the row means, so two people the same distance away can be told apart.
    EventBus.emitEvent('talk-target', { travellerId: talkTargetId });
  }, [talkTargetId]);

  /**
   * Somebody the player called to and is walking up to. Their conversation opens when the scene
   * reports them beside -- see the effect below -- and the call is forgotten once they are out of
   * view, so a wait that ended never opens anything later.
   */
  const pendingTalk = useRef<string | null>(null);

  /** Open the conversation with somebody on the road, who is beside the player now. */
  const talkWith = useRef<(travellerId: string, npcId: string | null) => void>(() => {});
  talkWith.current = (travellerId, npcId) => {
    if (npcId) {
      dispatch({ type: 'talk-to', npcId });
      return;
    }
    if (!arrival) return;
    // Somebody who keeps a camp. The one who leads speaks the camp's own card first, if it has not
    // been seen -- that is the welcome -- and after that each of them has a word of their own.
    const person = campFolk.find((p) => p.id === travellerId);
    if (person && campToday) {
      if (person.slot === 'leader' && !seenEvents.current.includes(`woven:camp:${campToday.id}`)) {
        happens.current?.('arriving', arrival.at, null, `camp:${campToday.id}`, {
          camp: campToday,
          force: { kind: 'camp', asked: true }
        });
        return;
      }
      const doing = (nearbyTravellers.find((t) => t.id === travellerId)?.doing ?? 'chore') as CampActivity;
      happens.current?.('road', arrival.at, null, `camp-talk:${arrival.day}:${travellerId}`, {
        campPerson: { person, doing: doingLine(person.kind, person.slot, doing), meal: doing === 'meal' },
        force: { kind: 'camp-talk', asked: true }
      });
      return;
    }
    // A stranger has no lines of their own: walking with them is the company card, about this
    // stranger, opened because the player asked rather than rationed by the road. The first time,
    // the company card, which is how you learn their name. After that, small talk: how the map
    // knows you, and what they have heard.
    const key = `${fieldMapId}:${travellerId}`;
    const met = metStrangers.current.includes(key);
    happens.current?.('road', arrival.at, null, `walk-with:${arrival.day}:${travellerId}`, {
      strangerId: travellerId,
      talk: met ? talkFor(travellerId, arrival.at) : null,
      force: { kind: met ? 'small-talk' : 'company', asked: true }
    });
  };

  /**
   * Talk to somebody on the road: at once if they are beside you, otherwise call out so they stop
   * and wait while the traveller walks up. One press either way, and the same press whether it came
   * from the row, its key or a tap on them.
   */
  const callTo = useRef<(travellerId: string) => void>(() => {});
  callTo.current = (travellerId) => {
    const near = nearbyTravellers.find((t) => t.id === travellerId);
    if (!near) return;
    // Held either way: beside you, so they do not walk off mid-sentence; further off, so they can
    // be reached at all.
    EventBus.emitEvent('hail', { travellerId });
    if (near.beside) {
      pendingTalk.current = null;
      talkWith.current(travellerId, near.npcId);
      return;
    }
    pendingTalk.current = travellerId;
  };

  // Tapping somebody on the map chooses them and talks to them, exactly as their row would.
  useEffect(() => {
    const onTapped = ({ travellerId }: GameToUi['traveller-tapped']) => {
      setChosenTraveller(travellerId);
      callTo.current(travellerId);
    };
    EventBus.onEvent('traveller-tapped', onTapped);
    return () => {
      EventBus.offEvent('traveller-tapped', onTapped);
    };
  }, []);

  // Somebody chosen who has walked out of view is no longer chosen, and nobody is still walked up to.
  useEffect(() => {
    if (chosenTraveller && !nearbyTravellers.some((t) => t.id === chosenTraveller)) setChosenTraveller(null);
    if (pendingTalk.current && !nearbyTravellers.some((t) => t.id === pendingTalk.current)) {
      pendingTalk.current = null;
    }
  }, [nearbyTravellers, chosenTraveller]);

  // On the road: whoever has just come alongside.
  useEffect(() => {
    const beside = nearbyTravellers.filter((t) => t.beside);
    if (beside.length === 0) return;
    // Somebody the player called to and has now reached: their conversation, and nobody else's --
    // once any card already open is closed. Until then the call stays pending, and this runs again
    // when `cardOpen` turns false.
    const called = beside.find((t) => t.id === pendingTalk.current);
    if (called && (cardOpen || cardOpenRef.current)) return;
    if (called) {
      pendingTalk.current = null;
      talkWith.current(called.id, called.npcId);
      return;
    }
    const named = bumpedNamed(
      beside.flatMap((t) => (t.npcId ? [t.npcId] : [])),
      (npcId) => beside.find((t) => t.npcId === npcId)?.id ?? null
    );
    // Camp people keep to their camp; they never fall in beside you the way road company do. Only
    // the leader may call you over, and only to give the camp's own welcome (`campCallers`).
    const strangers: Bumped[] = beside
      .filter((t) => t.npcId === null && !campFolk.some((p) => p.id === t.id))
      .map((t) => ({ key: `${fieldMapId}:${t.id}`, npcId: null, travellerId: t.id, reason: 'passing' }));
    const callers = campToday
      ? campCallers(
          beside.map((t) => t.id),
          campFolk,
          fieldMapId,
          seenEvents.current.includes(`woven:camp:${campToday.id}`)
        )
      : [];
    speakFirst.current([...named, ...callers, ...strangers]);
  }, [nearbyTravellers, bumpedNamed, fieldMapId, campFolk, campToday, cardOpen]);

  return { talk, campToday, campFolk, talkWith, callTo };
}
