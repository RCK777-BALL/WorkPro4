/*
 * SPDX-License-Identifier: MIT
 */

import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/global.css';

declare global {
  interface Window {
    initNavBar?: () => void;
  }
}

if (typeof window.initNavBar === 'function') {
  window.initNavBar();
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void import('workbox-window')
      .then(({ Workbox }) => {
        const wb = new Workbox('/sw.js', { scope: '/' });

        wb.addEventListener('waiting', () => {
          void wb.messageSkipWaiting();
        });

        wb.addEventListener('controlling', () => {
          window.location.reload();
        });

        void wb.register();
      })
      .catch((error) => {
        if (import.meta.env.DEV) {
          console.error('Failed to register service worker', error);
        }
      });
  });
}
