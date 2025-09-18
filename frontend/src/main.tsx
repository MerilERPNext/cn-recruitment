import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { FrappeProvider } from "frappe-react-sdk";
import { BrowserRouter } from "react-router-dom";
const link = document.createElement("link");
link.href = `/assets/nextai/node_modules/chatnext-ui/dist/index.css`;
link.rel = "stylesheet";
document.head.append(link);
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <FrappeProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </FrappeProvider>
  </React.StrictMode>
);
