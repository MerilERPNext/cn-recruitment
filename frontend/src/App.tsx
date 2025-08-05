import React, { useEffect } from "react";
import {
  BrowserRouter as Router,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import { QueryProvider } from "./providers/QueryProvider";
import "./App.css";
import "./utils/FormioConfig";

import { AppRoute, routesConfig } from "./routesConfig";
import MobileDashboard from "./components/MobileDashboard";
import { useFrappeDocumentCount } from "./hooks/useFrappeQuery";
import { useCurrentEmployee } from "./hooks/useEmployee";

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
      <MandatoryPoliciesHandler />
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

const MandatoryPoliciesHandler = () => {
  const { data: currentEmployee, isFetching: isCurrentEmployeeFetching } = useCurrentEmployee();
  const { data: mandatoryPoliciesCount, isFetching: isMandatoryPoliciesCountFetching } = useFrappeDocumentCount({
    doctype: "Policy Details",
    filters: [
      ["status", "=", "Pending"],
      ["employee_id", "=", currentEmployee?.name || ""],
      ["sign_off_mandatory", "=", 1],
    ]
  }, {
    enabled: !!currentEmployee,
  });

  useEffect(() => {
    if (isCurrentEmployeeFetching || isMandatoryPoliciesCountFetching || mandatoryPoliciesCount === undefined || !window.isApp) return;

    if (mandatoryPoliciesCount <= 0) {
      window.nativeInterface.logToNative("destroyNestedWebView");
      window.nativeInterface.execute("destroyNestedWebView");
      console.log("destroyNestedWebView");
    }

    if (mandatoryPoliciesCount > 0) {
      window.nativeInterface.logToNative("openNestedWebView");
      window.nativeInterface.execute("openNestedWebView", {
        url: window.location.origin + "/webapp/policies-enforced",
        title: "HR Policies",
        isCloseable: false,
      });
      console.log("openNestedWebView");

    }
  }, [mandatoryPoliciesCount, isCurrentEmployeeFetching, isMandatoryPoliciesCountFetching]);

  return null;
}