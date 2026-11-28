import type { ErrorInfo, ReactNode } from 'react';
import { Component } from 'react';
import { freshSeed } from './seed';

export function RecoveryScreen({ seed }: { seed: string }) {
  const startAgain = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('seed', freshSeed());
    url.searchParams.delete('at');
    url.searchParams.delete('door');
    window.location.assign(url);
  };

  return (
    <div className="fallback" role="alert">
      <div className="fallback-sheet">
        <h2>The map has stopped.</h2>
        <p className="fallback-seed">This world is <span>{seed}</span></p>
        <button type="button" onClick={() => window.location.reload()}>Try this journey again</button>
        <button type="button" onClick={startAgain}>Start with a new seed</button>
      </div>
    </div>
  );
}

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

    const seed = new URLSearchParams(window.location.search).get('seed')?.trim() || this.props.seed;
    return <RecoveryScreen seed={seed} />;
  }
}
