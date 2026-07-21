import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

declare global {
  interface Window {
    csrf_token: string;
    nativeInterface: {
      execute: (method: string, params?: any) => Promise<any>;
      logToNative: (params: any) => Promise<void>;
    };
  }
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
); 

