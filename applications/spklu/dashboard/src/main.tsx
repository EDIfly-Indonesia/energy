import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Terapkan tema sebelum render supaya tidak ada kedipan (flash) saat reload.
const savedTheme = localStorage.getItem('spklu_theme');
document.documentElement.setAttribute(
  'data-theme',
  savedTheme === 'light' ? 'light' : 'dark',
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
