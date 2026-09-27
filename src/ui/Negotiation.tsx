// Talking a holder round: the card the settling loop opens at a ground.
//
// **Undertale's ACT menu without the dodging**, which is what the owner asked for: the holder states
// a worry, the player answers with something they have -- listening, their tongue, a discovery, a
// person who will vouch, a thing carried -- and a wrong answer gets a reply in character and costs
// nothing. Every worry answered, and they agree.
//
// Presentation only. What counts as an answer, and what agreeing changes, is `content/homestead.ts`;
// this renders its answers and hands the new flags back.

import { useState } from 'react';
import {
  agreed,
  currentWorry,
  optionsFor,
  respond,
  stateOf,
  type Ground,
  type Holdings,
  type Homestead,
  type Option
} from '../content/homestead';
import { discovery } from '../content/knowledge';
import { npc } from '../content/places';
import { art } from './art';
import { Modal } from './Modal';
import { PersonPortrait } from './PersonPortrait';
import { ProfileButton } from './Profile';

export interface NegotiationProps {
  open: boolean;
  homestead: Homestead;
  ground: Ground;
  /** The journey's flags, where what has been said is kept. */
  flags: readonly string[];
  holdings: Holdings;
  /** Named people of this map: who could vouch. */
  peopleHere: readonly string[];
  onFlags: (flags: string[]) => void;
  onClose: () => void;
}

/** The order the approaches are offered in: listening first, then the rest. */
const KIND_ORDER: Record<Option['kind'], number> = { listen: 0, tongue: 1, show: 2, vouch: 3, offer: 4 };

const keyOf = (option: Option) => `${option.kind}:${option.id ?? ''}`;

/**
 * What the player did, in a sentence, said before the holder's reply.
 *
 * **Without it a second wrong answer looked like a dead button.** Every miss gets the holder's one
 * `not_that`, so the card read the same after the second answer as after the first, and the owner,
 * playing Lothal, reported that "Show" did nothing. It did; nothing on screen changed.
 */
function whatYouDid(option: Option, holderName: string): string {
  switch (option.kind) {
    case 'listen':
      return `You listen, and let ${holderName} talk.`;
    case 'tongue':
      return `You answer in ${holderName}'s own tongue.`;
    case 'show':
      return `You show ${holderName} what you found: ${discovery(option.id ?? '')?.name ?? 'your notes'}.`;
    case 'vouch':
      return `${npc(option.id ?? '')?.name ?? 'Somebody'} speaks up for you.`;
    case 'offer':
      return `You hold out the ${option.label.replace(/^Offer: /, '')}.`;
  }
}

export function Negotiation({ open, homestead, ground, flags, holdings, peopleHere, onFlags, onClose }: NegotiationProps) {
  // What the player did and what the holder said back. The ground's own prose before anything.
  const [exchange, setExchange] = useState<{ you: string; says: string } | null>(null);
  // What has been tried against which worry, and what listening drew out of it. Both belong to one
  // worry: when it eases, the next starts clean.
  const [tried, setTried] = useState<{ worry: string | null; keys: string[] }>({ worry: null, keys: [] });
  const [heard, setHeard] = useState<{ worry: string; hint: string } | null>(null);
  if (!open) return null;

  const holder = npc(ground.heldBy);
  const state = stateOf(homestead.fieldMapId, flags);
  const done = agreed(ground, state);
  const worry = currentWorry(ground, state);
  const options = optionsFor(homestead, ground, holdings, peopleHere).sort(
    (a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind]
  );
  const picture = art('events', 'settle-negotiation');
  const holderName = holder?.name ?? 'them';
  const triedHere = worry && tried.worry === worry.id ? tried.keys : [];
  const hint = worry && heard?.worry === worry.id ? heard.hint : null;
  // Everything but listening has been tried and missed: say so, rather than leave a wall of buttons
  // that all answer the same.
  const exhausted =
    !!worry && options.some((o) => o.kind !== 'listen') && options.every((o) => o.kind === 'listen' || triedHere.includes(keyOf(o)));

  const answer = (option: Option) => {
    const reply = respond(homestead, ground, flags, option);
    setExchange({ you: whatYouDid(option, holderName), says: reply.says });
    if (worry && option.kind === 'listen') setHeard({ worry: worry.id, hint: worry.hint });
    if (worry && !reply.eased && option.kind !== 'listen') {
      const base = tried.worry === worry.id ? tried.keys : [];
      setTried({ worry: worry.id, keys: base.includes(keyOf(option)) ? base : [...base, keyOf(option)] });
    }
    onFlags(reply.flags);
  };

  return (
    <Modal open label={`${ground.name}: talking it through`} onClose={onClose} veilClassName="diary-veil activity-veil">
      <section className="activity-card negotiation">
        {picture ? (
          <img className="activity-scene" src={picture} alt="" aria-hidden="true" />
        ) : (
          <div className="activity-scene activity-scene-blank" aria-hidden="true" />
        )}
        <div className="activity-body">
          <div className="event-heading">
            {holder && (
              <ProfileButton who={{ kind: 'named', npc: holder }} name={holder.name}>
                <PersonPortrait person={holder} size={40} />
              </ProfileButton>
            )}
            <h2 className="activity-title">{ground.name}</h2>
          </div>

          {/* What was just said, then what is still worrying them. A reply that eased a worry is
              followed straight away by the next one, so the exchange reads as a conversation. */}
          {exchange ? (
            <>
              <p className="activity-prose negotiation-you">{exchange.you}</p>
              <p className="activity-prose negotiation-reply">{exchange.says}</p>
            </>
          ) : (
            <p className="activity-prose">{ground.prose}</p>
          )}
          {!done && worry && (
            <p className="activity-prose negotiation-worry">
              {holder?.name ?? 'They'}: “{worry.says}”
            </p>
          )}
          {!done && hint && exchange?.says !== hint && <p className="activity-prose negotiation-hint">{hint}</p>}
          {!done && exhausted && (
            <p className="activity-prose negotiation-none">
              Nothing you have answers this yet. Leave it for now and come back with more; what is
              eased stays eased.
            </p>
          )}

          <div className="activity-choices">
            {done ? (
              <button type="button" className="activity-choice primary" onClick={onClose}>
                Go and build
              </button>
            ) : (
              <>
                {options.map((option) => {
                  // A miss stays pressable -- it costs nothing -- but says it has been tried, so a
                  // player can see what is left rather than pressing the same answer twice.
                  const spent = triedHere.includes(keyOf(option));
                  return (
                    <button
                      key={keyOf(option)}
                      type="button"
                      className={spent ? 'activity-choice tried' : 'activity-choice'}
                      onClick={() => answer(option)}
                    >
                      {option.label}
                      {spent && <span className="tried-mark"> · tried</span>}
                    </button>
                  );
                })}
                {/* Leaving is always an answer too, and loses nothing: what was eased stays eased. */}
                <button type="button" className="activity-choice ghost" onClick={onClose}>
                  Leave it for now
                </button>
              </>
            )}
          </div>
        </div>
      </section>
    </Modal>
  );
}
