// Somebody talking, with the screen to themselves.
//
// **Every person at a place used to talk at once.** `PlacePanel` rendered one of these per NPC and
// each mounted a live `Dialogue`, so arriving at Lothal Camp started three portraits and three
// typewriters stacked in a scroller that showed a third of itself on a landscape phone. Canon holds
// three people there and two at five other points of interest; their lines average thirty-two words
// and run to sixty-one. They are written to be listened to, and two at once is not a presentation
// of them.
//
// So a conversation is a mode: the place lists who is here, choosing somebody opens them in the
// dock at full height, and going back is one press. `surface.ts` decides which of the three things
// -- the notes, the place, a person -- has the slot, because that is arbitration and it is what
// that reducer is for.
//
// **What moved is the mounting, not the rules.** `linesFor`, `meeting`, `beats`, `offerIn` and
// `moreAfter` are unchanged and still pure; `Dialogue` still types a beat at a time and still counts
// a line as heard when its last beat lands. The class names are unchanged too -- `.person`,
// `.person-speaking`, `.person-words` -- because the browser suite reads them and the layout inside
// one person's turn was already right.

import { useCallback, useState } from 'react';
import { type Progress, isFirstMeeting, lineIsSpent, linesFor } from '../journey';
import { npc, type Line, type Npc } from '../content/places';
import { type Turn, beats, meeting, moreAfter, offerIn, quietNote } from '../content/conversation';
import type { Satchel } from '../content/satchel';
import { nameOf } from '../content/making';
import { Dialogue } from './Dialogue';
import { PersonPortrait } from './PersonPortrait';

/**
 * How large a person is drawn while they are talking.
 *
 * 96 rather than the 26 the mark was: at 26 a portrait is punctuation beside a name, and the point
 * of this one is that somebody is on the other side of the words. It is also what the built
 * portraits are sized against -- `tools/build-plates.js --portraits` writes 256, which covers this
 * on a 2x screen with the same margin a plate gets.
 */
const PORTRAIT_SIZE = 96;

/**
 * What Varuna says when he hands something over.
 *
 * **The only line he gets, and it is deliberately not a transaction.** "Trade reed mat" or "Give
 * (1) Reed mat" would make this a shop, and canon has no currency — the note on the `costs` field
 * says as much: it is one item one person wants, not a price. So the control reads as the thing he
 * does, in the register the rest of the panel uses, and names the person because handing a mat to
 * Uma is not the same act as handing one to anybody else.
 *
 * Lower-cased mid-sentence: canon capitalises an item's name as a title ("Reed mat"), which reads
 * as a proper noun in the middle of a sentence somebody is saying.
 */
export function handOver(name: string, itemId: string): string {
  return `Give ${name} the ${nameOf(itemId).toLowerCase()}`;
}

/**
 * One person, talking.
 *
 * **Being told something is how you hear it.** The old panel made the player click "Write it
 * down" beside each line, which was paperwork -- the diary is Varuna's and he does not need
 * permission to use it. What replaced it recorded the line on mount instead, which fixed the
 * clicking and introduced a subtler version of the same fault: a line counted as heard before it
 * was legible, so a player who left mid-sentence had still "heard" it. `Dialogue` now reports each
 * beat as it *finishes*, and the last beat of a line is what writes it down.
 *
 * **A first meeting is longer than a visit.** Measured against the shipped bundle: everybody opens
 * with two or three ungated lines -- nineteen across the eight of them -- and `saysNow` returns
 * exactly one, so about two fifths of the introductions were authored and never shown. `meeting`
 * plays all of them the first time and hands back to `saysNow` afterwards.
 */
function Person({
  person,
  progress,
  satchel,
  onListen
}: {
  person: Npc;
  progress: Progress;
  satchel: Satchel;
  onListen: (npcId: string, lineIndex: number) => void;
}) {
  const available = linesFor(progress, person.id, satchel);
  const spent = (l: Line) => lineIsSpent(progress, l);
  const first = isFirstMeeting(progress, person.id);

  // Held for the length of the exchange. Recomputing on every render would rebuild the turns from
  // a `Progress` that the exchange itself is changing -- so hearing the first line of a meeting
  // would end the meeting.
  const [turns] = useState(() => meeting(available, spent, first));
  const [over, setOver] = useState(false);

  // A priced line waits for the player to hand the thing over. Recomputed each render rather than
  // frozen with the turns: accepting one changes the satchel, and the offer has to go away.
  const offer = offerIn(available, spent);
  const [given, setGiven] = useState<Turn | null>(null);

  const beatsOf = turns.map((t) => beats(t.line.text));
  const flat = beatsOf.flat();

  // Which turn a flattened beat index belongs to, so a finished beat can record the right line.
  const owner: number[] = [];
  beatsOf.forEach((bs, turnIndex) => bs.forEach(() => owner.push(turnIndex)));

  const heardBeat = useCallback(
    (beatIndex: number) => {
      const turnIndex = owner[beatIndex];
      if (turnIndex === undefined) return;
      // The line is written down when its *last* beat lands, not its first.
      const isLastOfTurn = owner[beatIndex + 1] !== turnIndex;
      const turn = turns[turnIndex];
      if (isLastOfTurn && turn && turn.gives) onListen(person.id, turn.index);
    },
    [owner, turns, person.id, onListen]
  );

  const more = moreAfter(available, spent, turns);

  // What plays now: the introduction, or the priced line once it has been accepted.
  const playing = given ? beats(given.line.text) : flat;
  const talking = playing.length > 0 && !(over && !given);

  const heardGiven = useCallback(
    (beatIndex: number) => {
      // One line, so its last beat is the last beat there is.
      if (given && beatIndex === beats(given.line.text).length - 1) {
        onListen(person.id, given.index);
      }
    },
    [given, person.id, onListen]
  );

  return (
    <div className="person">
      {/* The portrait sits beside what is being said rather than above it, and at a size worth
          looking at. A speaking portrait is the third of the four things the genre does -- it does
          not need expressions, it needs to be large, next to the words, and to move a little while
          its owner talks. */}
      <div className="person-speaking">
        <PersonPortrait person={person} size={PORTRAIT_SIZE} speaking={talking} />
        <div className="person-words">
          <h4>
            {person.name} <span className="muted">· {person.role}</span>
          </h4>
          {talking ? (
            <Dialogue
              key={given ? given.line.text : 'opening'}
              beats={playing}
              onBeatDone={given ? heardGiven : heardBeat}
              onDone={() => setOver(true)}
              doneLabel={null}
            />
          ) : (
            <p className="muted">{quietNote(person.name)}</p>
          )}

          {/* Varuna's turn, and the only one he gets. Canon prices exactly two lines and writes
              both around the handover -- Uma asks "Is that one of mine?" and answers herself after
              the pause -- so the offer belongs here, between the question and the reply, rather
              than as a transaction the panel completes on his behalf. */}
          {offer && !given && (
            <button type="button" className="offer" onClick={() => setGiven(offer)}>
              {handOver(person.name, offer.line.costs!)}
            </button>
          )}

          {over && !offer && more && (
            <p className="muted said-more">There is more they could tell you.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export interface ConversationProps {
  /** Who is talking. */
  npcId: string;
  progress: Progress;
  /**
   * What the traveller is carrying.
   *
   * **Needed to see a whole mechanic.** Canon prices two lines, and `linesFor` refuses to offer a
   * priced line unless the item is in hand -- so a caller that did not pass this asked for the
   * lines a person will say *to somebody carrying nothing*, and the two gift lines were invisible
   * for as long as that was true. Both teach a recipe canon marks `taught_by` them and nothing
   * else, so a bedroll and a rope span were unobtainable.
   */
  satchel: Satchel;
  onListen: (npcId: string, lineIndex: number) => void;
  /** Stop listening. The place they are standing in comes back. */
  onClose: () => void;
}

export function Conversation({ npcId, progress, satchel, onListen, onClose }: ConversationProps) {
  const person = npc(npcId);
  // Canon and the save can disagree after a bundle changes, and a conversation with nobody is
  // better closed than rendered blank.
  if (!person) return null;

  return (
    <section className="conversation" aria-live="polite">
      <header className="conversation-head">
        <h2>{person.name}</h2>
        <button type="button" className="diary-close" onClick={onClose}>
          Back
        </button>
      </header>

      <Person person={person} progress={progress} satchel={satchel} onListen={onListen} />
    </section>
  );
}
