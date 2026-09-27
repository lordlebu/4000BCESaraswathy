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

export function Negotiation({ open, homestead, ground, flags, holdings, peopleHere, onFlags, onClose }: NegotiationProps) {
  // What the holder said last. The ground's own prose the first time, before anything is said.
  const [said, setSaid] = useState<string | null>(null);
  if (!open) return null;

  const holder = npc(ground.heldBy);
  const state = stateOf(homestead.fieldMapId, flags);
  const done = agreed(ground, state);
  const worry = currentWorry(ground, state);
  const options = optionsFor(homestead, ground, holdings, peopleHere).sort(
    (a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind]
  );
  const picture = art('events', 'settle-negotiation');

  const answer = (option: Option) => {
    const reply = respond(homestead, ground, flags, option);
    setSaid(reply.says);
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
          <p className="activity-prose">{said ?? ground.prose}</p>
          {!done && worry && (
            <p className="activity-prose negotiation-worry">
              {holder?.name ?? 'They'}: “{worry.says}”
            </p>
          )}

          <div className="activity-choices">
            {done ? (
              <button type="button" className="activity-choice primary" onClick={onClose}>
                Go and build
              </button>
            ) : (
              <>
                {options.map((option) => (
                  <button
                    key={`${option.kind}:${option.id ?? ''}`}
                    type="button"
                    className="activity-choice"
                    onClick={() => answer(option)}
                  >
                    {option.label}
                  </button>
                ))}
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
