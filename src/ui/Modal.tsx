// One door for every panel that stops the world.
//
// **Eleven things rendered `role="dialog"` and each wrote its own twenty lines.** Five of them
// drifted: the diary, the album, the people, the ending and the activity handled Escape and moved
// focus on open; the field kit, the satchel, the workshop, the overworld and the map sheet did
// neither. Nothing was wrong with the ones that worked -- there were simply five copies of them
// and five places for the sixth copy to be forgotten.
//
// **And every one of them made a promise it did not keep.** `aria-modal="true"` tells a screen
// reader that the rest of the page is unavailable. Measured by tabbing with Records open, *eight
// of the next ten stops were outside the dialog* -- two presses put the keyboard in the control
// bar behind a veil it cannot see past. A dialog that claims to be modal and then leaves the page
// tabbable is worse than one that claims nothing, because the claim is what stops assistive
// software from offering the way out.
//
// So this owns all six behaviours a modal has to have, and the panels keep only their content:
//
// 1. Escape closes it.
// 2. Focus moves in when it opens.
// 3. **Focus cannot leave while it is open** — Tab wraps at both ends.
// 4. **Focus goes back to whatever opened it** when it closes, so the keyboard does not land at
//    the top of the document.
// 5. The rest of the application is `inert`, which takes it out of the tab order *and* out of the
//    accessibility tree — the thing `aria-modal` was only asserting.
// 6. It renders in a portal outside `#root`, which is what makes (5) a single attribute on one
//    element rather than a hunt for every sibling.
//
// **The trap is implemented as well as inherited.** `inert` alone would do it in every browser
// this game supports, and the wrapping below looks redundant next to it. It is not: jsdom
// implements neither `inert` nor real focus order, so without the explicit wrap the whole of (3)
// and (5) would be untestable under `test/`, and this repository's own finding is that every
// fault in the interface work was found by rendering a component.
//
// Presentation and behaviour only. No panel's content, class names or CSS changes -- the veil is
// still `.diary-veil` and the sheet still positions itself, so this is invisible to anybody
// holding a mouse.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  type MouseEvent,
  type ReactNode
} from 'react';
import { createPortal } from 'react-dom';

/**
 * How deeply nested this modal is: 1 for one over the map, 2 for one opened from inside it.
 *
 * **Nesting is read from the tree rather than inferred from what opened first, and the difference
 * is the whole of this note.** A painted plate opens over the album (see `Specimen.tsx`), so two
 * modals are now on screen at once and something has to say which is on top. The obvious answer —
 * a stack pushed in an effect — is *backwards*, because React runs a child's effects **before its
 * parent's**: the inner plate would register first and the outer album would come out on top of
 * it. Every consequence of that is wrong in the same direction. The album would answer an Escape
 * meant for the plate, and its veil, appended to the body later, would paint over the picture.
 *
 * A context is the fact itself. A modal's depth is its parent's plus one, decided while rendering
 * the tree that nests them, and nothing about timing can get it wrong.
 */
const Depth = createContext(0);

/**
 * Every open modal, by identity, with its depth.
 *
 * A `Map` rather than an array: insertion order is preserved, so the topmost is the *last* entry
 * at the greatest depth -- depth first for nesting, insertion second for two panels opened at the
 * same level. It also does the job a plain count used to, because `inert` is one attribute on one
 * element and the first modal to close must not clear it for the second.
 */
const showing = new Map<symbol, number>();

/** Whether this modal is the one a key should reach. */
function isTopmost(me: symbol): boolean {
  let top: symbol | null = null;
  let best = -1;
  for (const [id, depth] of showing) {
    if (depth >= best) {
      best = depth;
      top = id;
    }
  }
  return top === me;
}

/** What `#root` looked like before the first modal opened, so closing the last one restores it. */
function setAppInert(inert: boolean): void {
  const root = document.getElementById('root');
  if (!root) return;
  if (inert) root.setAttribute('inert', '');
  else root.removeAttribute('inert');
}

/**
 * Everything inside `container` that can take focus, in document order.
 *
 * Deliberately not a general-purpose implementation. It covers the controls these panels actually
 * hold -- buttons, links, inputs, and the scrolling panel itself when it has been given a
 * `tabindex` -- and skips anything hidden or disabled. A `:not([inert])` guard is not needed here
 * because nothing inside a modal is inert.
 */
function focusable(container: HTMLElement): HTMLElement[] {
  const selector =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
    'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  // A trap that includes an invisible control sends the keyboard somewhere the eye cannot follow,
  // so hidden ones are dropped. `checkVisibility` is the one API that answers this for an ancestor
  // as well as the element -- `offsetParent` was tried first and is **always null under jsdom**,
  // which would have made the trap untestable while looking like it worked.
  return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter((el) =>
    typeof el.checkVisibility === 'function'
      ? el.checkVisibility({ checkVisibilityCSS: true })
      : !el.hasAttribute('hidden')
  );
}

export interface ModalProps {
  /** Whether it is on screen. Rendering with `false` renders nothing at all. */
  open: boolean;
  /**
   * What this dialog is called, for anything that cannot see it.
   *
   * Required rather than optional. Every panel already had one and a dialog without a name is
   * announced as "dialog", which is the least useful thing a screen reader can say.
   */
  label: string;
  /**
   * Close it. Called by Escape and, when `closeOnBackdrop` is set, by a click on the veil.
   *
   * Omitted for a dialog that cannot be dismissed — the front door, which is left by choosing
   * something rather than by backing out.
   */
  onClose?: () => void;
  /**
   * The veil's classes. Defaults to the shared `.diary-veil`.
   *
   * `null` renders no veil at all: the child positions itself and the portal contributes nothing
   * but the trap. That is the map sheet, which is a panel in a corner rather than a page over the
   * world, and giving it a backdrop would have been a visible change in a stage that promised
   * none.
   */
  veilClassName?: string | null;
  /** Where focus starts. Defaults to the first focusable thing inside. */
  initialFocus?: { current: HTMLElement | null };
  /** Whether a click on the veil closes it. Off by default — these panels close by their own button. */
  closeOnBackdrop?: boolean;
  children: ReactNode;
}

export function Modal({
  open,
  label,
  onClose,
  veilClassName = 'diary-veil',
  initialFocus,
  closeOnBackdrop = false,
  children
}: ModalProps) {
  const holder = useRef<HTMLElement | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  /** Who had focus when this opened. Restored on the way out. */
  const opener = useRef<HTMLElement | null>(null);
  /** This instance's identity, so two modals can never compare equal. */
  const me = useRef(Symbol('modal')).current;
  /** One deeper than whatever this is rendered inside. See the note on `Depth`. */
  const depth = useContext(Depth) + 1;

  // **The portal's node is made during render and attached before paint.** Making it in the effect
  // instead is the obvious way round and does not work: the render that would use it has already
  // returned `null`, and a ref assignment schedules no re-render, so the panel never appears. The
  // node is detached until the layout effect below adopts it, so nothing is in the document that
  // this render did not put there.
  if (open && !holder.current && typeof document !== 'undefined') {
    const node = document.createElement('div');
    node.className = 'modal-portal';
    holder.current = node;
  }

  // Attached in a layout effect rather than an ordinary one: a portal target adopted after paint
  // shows a frame of nothing, which on a panel opening under the player's finger reads as a
  // dropped tap. The node is kept across a close so reopening does not rebuild it.
  useLayoutEffect(() => {
    const node = holder.current;
    if (!open || !node) return;
    document.body.appendChild(node);
    return () => node.remove();
  }, [open]);

  // Escape, the trap, the inerting, and putting focus back. One effect, because they share a
  // lifetime exactly: all five start when the modal opens and all five end when it closes.
  useEffect(() => {
    if (!open) return;

    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    showing.set(me, depth);
    if (showing.size === 1) setAppInert(true);

    // Focus moves in now rather than on the next frame. A child's effects run before its parent's
    // in React, so by the time this executes every panel below has mounted and settled -- and a
    // deferred focus is not observable from a test, which would put the whole of this behaviour
    // outside `test/`.
    const container = panel.current;
    if (container) (initialFocus?.current ?? focusable(container)[0] ?? container).focus();

    const onKey = (e: KeyboardEvent) => {
      // Only the topmost modal answers. See the note on `Depth`.
      if (!isTopmost(me)) return;

      if (e.key === 'Escape' && onClose) {
        onClose();
        return;
      }

      if (e.key !== 'Tab') return;
      const container = panel.current;
      if (!container) return;

      const stops = focusable(container);
      if (stops.length === 0) {
        // Nothing to move to, so Tab must not take the keyboard out of the panel.
        e.preventDefault();
        container.focus();
        return;
      }

      const first = stops[0]!;
      const last = stops[stops.length - 1]!;
      const active = document.activeElement;

      // Wrap at both ends, and catch the case where focus is somehow already outside — which
      // happens on the very first Tab if the panel itself holds focus.
      if (e.shiftKey && (active === first || !container.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !container.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };

    // On `window`, not `document`: a listener on the window sees everything a listener on the
    // document sees and one thing more -- a key event dispatched straight at the window, which is
    // what a test does and what the panels this replaces already handled. Capture phase, so a
    // panel that stops a key from bubbling cannot swallow Escape.
    window.addEventListener('keydown', onKey, true);

    return () => {
      window.removeEventListener('keydown', onKey, true);
      showing.delete(me);
      if (showing.size === 0) setAppInert(false);

      // Only if it is still there. A control that opened a panel and was then removed by what the
      // panel did -- the Workshop button disappears when the last recipe is made -- would throw
      // the keyboard back to the top of the document, so this checks rather than assumes.
      const back = opener.current;
      if (back && document.contains(back)) back.focus();
      opener.current = null;
    };
    // `initialFocus` is a ref object and stable; including it would re-run the whole effect on
    // every render of a panel that happens to build one inline.
    // `me` is a stable identity created once per instance, `depth` comes from a context that only
    // changes when the tree does, and `initialFocus` is a ref object; including any of them would
    // re-run the whole effect on an unrelated render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, onClose]);

  const onVeilClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (!closeOnBackdrop || !onClose) return;
      if (e.target === e.currentTarget) onClose();
    },
    [closeOnBackdrop, onClose]
  );

  if (!open || !holder.current) return null;

  const body = (
    <div
      ref={panel}
      className={veilClassName ?? undefined}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      // Focusable as a last resort, for a panel holding no controls at all. `-1` keeps it out of
      // the tab order while still allowing `focus()`.
      tabIndex={-1}
      // **Only a nested modal takes a z-index from here.** Portal nodes are appended to the body in
      // effect order, which is child-first, so a plate opened from the album lands *before* the
      // album's own node and would be painted over by it. Lifting the inner one settles that
      // without touching the stylesheet -- and at depth 1 nothing is set at all, so `.diary-veil`
      // keeps its 40, the map sheet its 4 and the front door its 60, exactly as before.
      style={depth > 1 ? { zIndex: 40 + depth } : undefined}
      onClick={veilClassName ? onVeilClick : undefined}
    >
      <Depth.Provider value={depth}>{children}</Depth.Provider>
    </div>
  );

  return createPortal(body, holder.current);
}
