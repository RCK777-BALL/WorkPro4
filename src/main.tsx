/*
 * SPDX-License-Identifier: MIT
 */

import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

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
