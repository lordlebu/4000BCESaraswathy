import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import { Fallback } from './ui/Fallback';
import { seedFromUrl } from './ui/seed';
import './ui/styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root — index.html and main.tsx have drifted apart.');

// The boundary wraps everything, because a throw anywhere below it used to blank the page --
// React unmounts the whole tree when a render fails and nothing was catching it. Outside
// `StrictMode` so it also catches a fault during the double-render StrictMode performs in
// development, which is exactly where a new bug shows up first.
createRoot(root).render(
  <Fallback seed={seedFromUrl()}>
    <StrictMode>
      <App />
    </StrictMode>
  </Fallback>
);

// Installable, and playable again without a connection -- see `tools/service-worker.js` for what it
// keeps and why. Production only: in development there is no `sw.js` to find, and a worker caching
// a dev server's modules is a well-known way to spend an afternoon. `BASE_URL` rather than `/`,
// because the game is served from a subpath on Pages and from a path nobody chooses on itch.io.
// A refusal is not an error worth showing: the game plays exactly as it did before there was one.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => undefined);
  });
}
