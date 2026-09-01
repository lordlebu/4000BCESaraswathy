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
