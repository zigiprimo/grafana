import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import 'inter-ui/inter.css';
import './index.css';

window.__grafana_public_path__ = 'https://grafana-assets.grafana.net/grafana/10.3.0/public/';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
