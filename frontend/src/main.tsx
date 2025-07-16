import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import "chatnext-ui/dist/index.css";
import "chatnext-ui/dist/index";
import "bootstrap/dist/css/bootstrap.min.css";
import "@formio/js/dist/formio.full.css";


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)