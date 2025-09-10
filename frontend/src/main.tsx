import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { FrappeProvider } from 'frappe-react-sdk';
import { BrowserRouter } from 'react-router-dom';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
        <FrappeProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </FrappeProvider>
  </React.StrictMode>
);
