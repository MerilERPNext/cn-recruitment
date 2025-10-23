import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { BrowserRouter } from "react-router-dom";
import { installChunkErrorHandler } from "./utils/chunkErrorHandler";
import QueryProvider from "./providers/QueryProvider";

// Install chunk error handler before anything else
installChunkErrorHandler();

const link = document.createElement("link");
link.href = `/assets/nextai/node_modules/chatnext-ui/dist/index.css`;
link.rel = "stylesheet";
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
