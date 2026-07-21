import React from 'react'
import {createRoot} from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import "chatnext-ui/dist/index.css";
import "chatnext-ui/dist/index";


createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)