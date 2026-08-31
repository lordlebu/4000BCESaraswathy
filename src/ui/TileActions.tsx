// Everything you can do on the ground you are standing on, in one list.
//
// **This exists because the doing was scattered by accident of implementation.** Taking what is
// under foot lived inside the satchel, so picking up a reed meant opening your bag. Unrolling the
// bedding lived in the field notes. Looking closer lived in the place panel. Nothing decided that
// arrangement; it is where each one happened to land, and a player had to learn three different
// homes for three things that are all "act on this tile".
//
// The genre decides the shape. This is a clicker rather than an action game, so a mechanic cannot
// be discovered by walking into it -- there is no walking into anything. **If it is not written on
// screen with a button beside it, it does not exist.** That rules out context keys and proximity
// prompts, and rules in a plain list of labelled rows.
//
// Two conventions come straight from the idle games that solved this already. Every action is
// listed *at all times*, and an action you cannot take is greyed with the reason rather than
// hidden -- because a disabled row reading "needs a settlement" is how a player learns settlements
// do anything at all, and a hidden one teaches nothing. Kittens Game and A Dark Room both do this
// and neither ever removes a button.
//
// Presentation only, like every other panel here. Whether an action is possible is a question for
// `journey.ts`, `gathering.ts` and `crafting.ts`; this renders their answers and calls back.

import type { ReactNode } from 'react';

/** One thing that can be done here. */
export interface TileAction {
  id: string;
  /** What the button says. Says what happens, not what it is -- "Take what is here". */
  label: string;
  /** A line under the label: what is here, or what this would do. */
  detail?: string;
  /**
   * Why this cannot be done, or null when it can.
   *
   * A string rather than a boolean on purpose. The reason *is* the teaching -- "needs a
   * settlement" is content, "disabled" is not -- so a caller cannot block an action without
   * saying why.
   */
  blocked: string | null;
  /**
   * A mark for the row. Decorative; the label carries the meaning.
   *
   * A node rather than a string, so an action can bring a drawing where a character will not do.
   * Resting uses `ShelterMark`, because a roof, a lean-to and a rolled mat are three different
   * amounts of shelter and should look like it.
   */
  mark: ReactNode;
  onDo: () => void;
}

export interface TileActionsProps {
  actions: readonly TileAction[];
}

export function TileActions({ actions }: TileActionsProps) {
  if (actions.length === 0) return null;

  return (
    <section className="tile-actions" aria-label="What you can do here">
      <h3 className="tile-actions-head">Here</h3>
      <ul className="tile-action-list">
        {actions.map((action) => (
          <Row key={action.id} action={action} />
        ))}
      </ul>
    </section>
  );
}

function Row({ action }: { action: TileAction }): ReactNode {
  const blocked = action.blocked !== null;
  return (
    <li className={blocked ? 'tile-action is-blocked' : 'tile-action'}>
      <button
        type="button"
        onClick={action.onDo}
        disabled={blocked}
        // The reason reaches a screen reader as the accessible description rather than only as
        // grey text, because "why is this off" is exactly the thing a disabled control usually
        // fails to communicate.
        aria-describedby={blocked ? `${action.id}-why` : undefined}
      >
        <span className="tile-action-mark" aria-hidden="true">
          {action.mark}
        </span>
        <span className="tile-action-words">
          <span className="tile-action-label">{action.label}</span>
          {action.detail && <span className="tile-action-detail">{action.detail}</span>}
        </span>
      </button>
      {blocked && (
        <p className="tile-action-why" id={`${action.id}-why`}>
          {action.blocked}
        </p>
      )}
    </li>
  );
}
