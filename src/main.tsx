import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

import '@trimble-oss/modus-web-components/dist/modus-web-components/modus-web-components.css';
import { defineCustomElements } from '@trimble-oss/modus-web-components/loader';

defineCustomElements(window);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App/>
  </React.StrictMode>
);
