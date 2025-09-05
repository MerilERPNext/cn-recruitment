/* eslint-disable @typescript-eslint/ban-ts-comment */
import React, { useEffect } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { QueryProvider } from "./providers/QueryProvider";
import "./App.css";
import "./utils/FormioConfig";

import { AppRoute, routesConfig } from "./routesConfig";
import ResponsiveDashboard from "./components/ResponsiveDashboard";
import { useFrappeDocumentCount } from "./hooks/useFrappeQuery";
import { useCurrentEmployee } from "./hooks/useEmployee";
import toast, { ToastBar, Toaster } from "react-hot-toast";
import ModalWrapper from "./components/ModalWrapper";
import { RequestLeaveModalProvider } from "./components/Leaves/RequestLeaveModalContext";
import EmployeeErrorBoundary from "./components/EmployeeErrorBoundary";
import { X, CheckCircle2, CircleX } from "lucide-react";
import { useFrappeAuth } from "frappe-react-sdk";
import "./utils/FormioOverrides";
import { GlobalStoreProvider } from "./context/GlobalStoreContext";

const App: React.FC = () => {
  const { currentUser, isLoading, isValidating } = useFrappeAuth();

  const renderRoutes = (routes: AppRoute[]) =>
    routes.map(({ path, element, children, index }, idx) =>
      index ? (
        <Route key={`${idx}-index`} index element={element} />
      ) : (
        <Route key={`${idx}-${path}`} path={path} element={element}>
          {children && renderRoutes(children)}
        </Route>
      )
    );

  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading || isValidating) return;
    if (!currentUser) {
      navigate("/#login", { replace: true }); // prevents back button loop
    }
  }, [currentUser, isLoading, isValidating, navigate]);

  return (
    <QueryProvider>
      <EmployeeErrorBoundary>
        <GlobalStoreProvider>
          <RequestLeaveModalProvider>
            <Toaster position="top-center" containerClassName="z-50">
              {(t) => (
                <ToastBar
                  toast={t}
                  style={{
                    ...t.style,
                    background: "white",
                    borderLeft:
                      t.type === "success"
                        ? "4px solid #34D399"
                        : "4px solid #EF4444",
                    boxShadow:
                      "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                    minWidth: "250px",
                    padding: "1rem",
                    borderRadius: "0.5rem",
                    transition:
                      "all 300ms cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                  }}
                >
                  {({ message }) => (
                    <>
                      {t.type === "success" ? (
                        <CheckCircle2
                          className="h-6 w-6 text-green-500 mr-2"
                          strokeWidth={2}
                        />
                      ) : (
                        <CircleX
                          className="h-6 w-6 text-red-500 mr-2"
                          strokeWidth={2}
                        />
                      )}
                      {message}
                      {t.type !== "loading" && (
                        <button
                          className="ml-4 p-1 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-700 focus:outline-none transition-colors duration-200"
                          onClick={() => toast.dismiss(t.id)}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </>
                  )}
                </ToastBar>
              )}
            </Toaster>

            <MandatoryPoliciesHandler />

            <div
              className="min-h-screen"
              style={{ backgroundColor: "var(--background-medium)" }}
            >
              <Routes>
                <Route element={<ModalWrapper />}>
                  <Route path="/webapp/" element={<ResponsiveDashboard />} />
                  {renderRoutes(routesConfig)}
                  <Route
                    path="*"
                    element={<Navigate to="/webapp/" replace />}
                  />
                </Route>
              </Routes>
            </div>
          </RequestLeaveModalProvider>
        </GlobalStoreProvider>
      </EmployeeErrorBoundary>
      {/* @ts-ignore */}
      <chatnext-app />
    </QueryProvider>
  );
};

export default App;

const MandatoryPoliciesHandler = () => {
  const { data: currentEmployee, isFetching: isCurrentEmployeeFetching } =
    useCurrentEmployee();
  const {
    data: mandatoryPoliciesCount,
    isFetching: isMandatoryPoliciesCountFetching,
  } = useFrappeDocumentCount(
    {
      doctype: "Policy Details",
      filters: [
        ["status", "=", "Pending"],
        ["employee_id", "=", currentEmployee?.name || ""],
        ["sign_off_mandatory", "=", 1],
      ],
    },
    {
      enabled: !!currentEmployee,
    }
  );

  useEffect(() => {
    if (
      isCurrentEmployeeFetching ||
      isMandatoryPoliciesCountFetching ||
      mandatoryPoliciesCount === undefined ||
      !window.isApp
    )
      return;

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
  }, [
    mandatoryPoliciesCount,
    isCurrentEmployeeFetching,
    isMandatoryPoliciesCountFetching,
  ]);

  return null;
};
