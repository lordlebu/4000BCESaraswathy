import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import './ui/styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root — index.html and main.tsx have drifted apart.');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
