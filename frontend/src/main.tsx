import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { restoreStaticRoute } from './utils/staticRoute';
import './index.css';
import './theme/artisan.css';
import './theme/mobile-v2.css';

const restoredRoute = restoreStaticRoute(window.location, import.meta.env.BASE_URL);
if (restoredRoute) window.history.replaceState(null, '', restoredRoute);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    if (import.meta.env.PROD) {
      navigator.serviceWorker
        .register(`${import.meta.env.BASE_URL}service-worker.js`, { updateViaCache: 'none' })
        .then((registration) => registration.update().catch(() => {}))
        .catch(() => {});
      return;
    }

    navigator.serviceWorker.getRegistrations()
      .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
      .catch(() => {});

    if ('caches' in window) {
      caches.keys()
        .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
        .catch(() => {});
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
