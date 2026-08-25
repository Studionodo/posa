import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { richiediPersistenza } from './lib/db.js';

import './styles/tokens.css';
import './styles/stampa.css';

/* Chiede al browser di non sfrattare i dati sotto pressione di storage.
   Se nega, l'app funziona lo stesso: il rischio e' coperto dal backup JSON. */
richiediPersistenza().catch(() => {});

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
