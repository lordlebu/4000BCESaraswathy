// One person's portrait, at the size it was painted, with what you know of them.
//
// **The owner, 27 September:** "just like the animal plates, we should be able to open the npc
// profiles to see their info, including the randomly generated ones. The focus should be to show the
// drawing to the player. The drawing shouldn't be all over the screen, as it might fade."
//
// So this is `Specimen` for people, on purpose: the same card, picture at the top and what canon says
// underneath, the world stopped behind it -- a second thing worth looking at should not invent a
// second way of being looked at. The portraits and the stranger faces are painted at **256 square**
// (`tools/build-plates.js`), and the card draws them at that and no larger. Enlarged past its own
// pixels a watercolour goes soft, which is the fading the owner means.
//
// Presentation only. Who somebody is, where they walk and whether you helped them are all asked of
// `content/`: `places.ts`, `people.ts` and `travellers.ts`.

import { useState, type ReactNode } from 'react';
import type { Npc } from '../content/places';
import { poi } from '../content/places';
import { PEOPLE_NAMES, strangersMet, type StrangerMet } from '../content/people';
import { fieldMap } from '../content/places';
import { Modal } from './Modal';
import { PersonPortrait } from './PersonPortrait';
import { StrangerFace } from './StrangerFace';

/** The size a portrait and a stranger's face are painted at, and the most either is drawn at. */
export const PROFILE_SIZE = 256;

/** Somebody a profile can be opened for: a person canon wrote, or a stranger met on the road. */
export type Profiled =
  | { kind: 'named'; npc: Npc; helped?: boolean }
  /** `known` is whether their name has been learned: until then the card says "A carrier". */
  | { kind: 'stranger'; key: string; known: boolean };

const capital = (text: string) => (text ? text[0]!.toUpperCase() + text.slice(1) : text);
const placeName = (id: string) => poi(id)?.name ?? null;

export interface ProfileCardProps {
  who: Profiled;
  open: boolean;
  onClose: () => void;
}

export function ProfileCard({ who, open, onClose }: ProfileCardProps) {
  if (who.kind === 'named') return <NamedCard npc={who.npc} helped={who.helped ?? false} open={open} onClose={onClose} />;
  const met = strangersMet([who.key])[0];
  if (!met) return null;
  return <StrangerCard met={met} known={who.known} open={open} onClose={onClose} />;
}

function NamedCard({ npc, helped, open, onClose }: { npc: Npc; helped: boolean; open: boolean; onClose: () => void }) {
  const places = npc.foundAt.map(placeName).filter((n): n is string => n !== null);
  return (
    <Modal open={open} label={npc.name} onClose={onClose} veilClassName="diary-veil plate-card-veil">
      <section className="plate-card profile-card">
        <div className="profile-card-image">
          <PersonPortrait person={npc} size={PROFILE_SIZE} />
        </div>
        <div className="plate-card-body">
          <h2 className="plate-card-name">{npc.name}</h2>
          <p className="plate-card-binomial">{capital(npc.role)}</p>
          <p className="plate-card-facts">
            {npc.language && <span>Speaks {capital(npc.language)}</span>}
            {places.map((p) => (
              <span key={p}>{p}</span>
            ))}
          </p>
          {helped && <p className="plate-card-prose">You have been some use to them.</p>}
          <button type="button" className="ghost plate-card-close" onClick={onClose}>
            Close
          </button>
        </div>
      </section>
    </Modal>
  );
}

function StrangerCard({
  met,
  known,
  open,
  onClose
}: {
  met: StrangerMet;
  known: boolean;
  open: boolean;
  onClose: () => void;
}) {
  const { traveller } = met;
  // A name is learned by walking with them, and a card must not tell it early.
  const name = known && traveller.givenName ? traveller.givenName : traveller.name;
  const people = traveller.culture ? PEOPLE_NAMES[traveller.culture] : null;
  const map = fieldMap(met.fieldMapId)?.name ?? null;
  return (
    <Modal open={open} label={name} onClose={onClose} veilClassName="diary-veil plate-card-veil">
      <section className="plate-card profile-card">
        <div className="profile-card-image">
          <StrangerFace
            stranger={{
              id: met.key,
              role: traveller.role,
              look: traveller.look!,
              culture: traveller.culture,
              givenName: known ? traveller.givenName : null
            }}
            size={PROFILE_SIZE}
          />
        </div>
        <div className="plate-card-body">
          <h2 className="plate-card-name">{name}</h2>
          <p className="plate-card-binomial">{capital(traveller.role)}</p>
          <p className="plate-card-facts">
            {people && <span>{people}</span>}
            {map && <span>{map}</span>}
          </p>
          {met.between.length >= 2 && (
            <p className="plate-card-prose">
              Walks the road between {met.between.slice(0, -1).join(', ')} and {met.between.at(-1)}.
            </p>
          )}
          <button type="button" className="ghost plate-card-close" onClick={onClose}>
            Close
          </button>
        </div>
      </section>
    </Modal>
  );
}

export interface ProfileButtonProps {
  who: Profiled;
  /** What they are called, for the control's name. */
  name: string;
  /** The small portrait or face, as it is drawn where this sits. */
  children: ReactNode;
}

/**
 * A portrait that can be opened, wherever a person is drawn small -- `PlateButton` for people.
 *
 * Owns its own open state for the reason `PlateButton` gives: which picture somebody tapped is not
 * a panel, and threading it up to `App` would put view state beside the journey.
 */
export function ProfileButton({ who, name, children }: ProfileButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="profile-open"
        // What pressing it does, not a second reading of the name beside it.
        aria-label={`${name} — see their portrait`}
        onClick={() => setOpen(true)}
      >
        {children}
      </button>
      <ProfileCard who={who} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
