import React from 'react';
import { createRoot } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import App from './App';
import { JournalProvider } from './lib/store';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <JournalProvider>
      <App />
    </JournalProvider>
  </React.StrictMode>,
);
if (import.meta.env.PROD && !Capacitor.isNativePlatform() && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* Offline support retries on the next visit. */
    });
  });
}
