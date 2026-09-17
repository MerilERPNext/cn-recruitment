import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { BrowserRouter } from "react-router-dom";
import { installChunkErrorHandler } from "./utils/chunkErrorHandler";
import QueryProvider from "./providers/QueryProvider";

// Install chunk error handler before anything else
installChunkErrorHandler();

// nextai's ChatNext package was renamed chatnext-ui -> chatnext-frontend; if the
// stylesheet 404s the ChatNext modal renders unstyled, so fall back to the old name.
const link = document.createElement("link");
link.href = `/assets/nextai/node_modules/chatnext-frontend/dist/index.css`;
link.rel = "stylesheet";
link.onerror = () => {
  link.onerror = null;
  link.href = `/assets/nextai/node_modules/chatnext-ui/dist/index.css`;
};
document.head.append(link);
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryProvider>
  </React.StrictMode>
);
