// What the player sees when something throws.
//
// **Until this existed, a single uncaught error blanked the page.** React unmounts the whole tree
// when a render throws and nothing was catching it, so a fault anywhere -- a panel, an adapter, a
// scene callback reaching into React -- took the map, the notes and the diary with it and left a
// white screen with no way back.
//
// The one thing this must do is not lose the journey. The save is written on every step and lives
// in `localStorage`, so it survives whatever just happened; the danger is a player who cannot get
// back to it, hits reload, and finds the same error waiting. So the offer here is **reload**,
// which re-reads the save, and the seed is shown because it is the whole world in a word -- a
// player who has it can return to the same ground from anywhere.
//
// The register is the rest of the game's. Nothing here is an apology and nothing is a stack
// trace: a person who came to walk a river does not want either. The details are in the console
// for whoever is debugging it, which is where the useful version already is.

import type { ErrorInfo, ReactNode } from 'react';
import { Component } from 'react';

export interface FallbackProps {
  /** The seed, so the player can return to the same world from anywhere. */
  seed: string;
  children: ReactNode;
}

interface FallbackState {
  failed: boolean;
}

export class Fallback extends Component<FallbackProps, FallbackState> {
  // A class, because `componentDidCatch` has no hook equivalent -- this is the one place in the
  // codebase React still requires one, and it is not worth a library to avoid.
  override state: FallbackState = { failed: false };

  static getDerivedStateFromError(): FallbackState {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Logged rather than shown. The console keeps the stack and the component trace, which is
    // what anybody debugging this actually wants; the panel below keeps its own register.
    console.error('[fallback] the page stopped:', error, info.componentStack);
  }

  override render(): ReactNode {
    if (!this.state.failed) return this.props.children;

    return (
      <div className="fallback" role="alert">
        <div className="fallback-sheet">
          <h2>The map has stopped.</h2>
          <p>
            Something went wrong and the page could not carry on. Nothing you have found is lost —
            the journal is written down as you walk, and it will still be there.
          </p>
          <p className="fallback-seed">
            This world is <span>{this.props.seed}</span>
          </p>
          <button type="button" onClick={() => window.location.reload()}>
            Pick it up again
          </button>
        </div>
      </div>
    );
  }
}
