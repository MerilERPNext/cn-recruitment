import React from "react";
import {
  BrowserRouter as Router,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import { QueryProvider } from "./providers/QueryProvider";
import "./App.css";

import { AppRoute, routesConfig } from "./routesConfig";
import MobileDashboard from "./components/MobileDashboard";

const App: React.FC = () => {
  const renderRoutes = (routes: AppRoute[]) =>
    routes.map(({ path, element, children }, index) =>
      children ? (
        <Route key={`${index}-${path}`} path={path} element={element}>
          {renderRoutes(children)}
        </Route>
      ) : (
        <Route key={`${index}-${path}`} path={path} element={element} />
      )
    );

  return (
    <QueryProvider>
      <Router>
        <div
          className="min-h-screen"
          style={{ backgroundColor: "var(--background-medium)" }}
        >
          <Routes>
            <Route path="/webapp/" element={<MobileDashboard />} />
            {renderRoutes(routesConfig)}
            <Route path="*" element={<Navigate to="/webapp/" replace />} />
          </Routes>
        </div>
      </Router>
    </QueryProvider>
  );
};

export default App;
