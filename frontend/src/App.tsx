import React, { useEffect, useMemo, useState } from "react";
import {
  Navigate,
  Route,
  Routes,
  useNavigate,
  useLocation,
} from "react-router-dom";
import "./App.css";
import "./utils/FormioConfig";

import { AppRoute, routesConfig } from "./routesConfig";
import { findRouteConfig } from "./utils/routeUtils";
import ResponsiveDashboard from "./components/ResponsiveDashboard";
import { useFrappeDocumentCount } from "./hooks/useFrappeQuery";
import { useCurrentEmployeeAllDetails } from "./hooks/useEmployee";

import toast, { ToastBar, Toaster } from "react-hot-toast";
import ModalWrapper from "./components/ModalWrapper";
import { RequestLeaveModalProvider } from "./components/Leaves/RequestLeaveModalContext";
import EmployeeErrorBoundary from "./components/EmployeeErrorBoundary";
import { X, CheckCircle2, CircleX } from "lucide-react";
import { GlobalStoreProvider } from "./context/GlobalStoreContext";
import {
  preloadCriticalRoutes,
  preloadAdjacentRoutes,
} from "./utils/routePreloader";
import { useCurrentUser } from "./hooks/useCurrentUser";
import { ViewedUserProvider, useTargetUser } from "./context/ViewedUserContext";
import { setTargetEmployeeId } from "./utils/frappeAPI";
import { useGetUiPermission } from "./hooks/userUiPermission";
import { PermissionProvider } from "./context/PermissionContext";
import { LoadingOverlayProvider } from "./context/OverlayContext";
import GlobalLeaveRequestModal from "./components/Leaves/GlobalLeaveRequestModal";

import { useWebsiteBranding } from "./hooks/useBranding";

// Component to sync ViewedUserContext with frappeAPI
// NOTE: Must be defined BEFORE App to avoid Vite HMR evaluating it outside the provider tree.
const TargetUserSync: React.FC = () => {
  const { targetEmployeeId } = useTargetUser();

  useEffect(() => {
    setTargetEmployeeId(targetEmployeeId);
  }, [targetEmployeeId]);

  return null;
};

const App: React.FC = () => {
  const { data: currentUser, isLoading, } = useCurrentUser();
  const location = useLocation();
  const { data: brandingData } = useWebsiteBranding();
  const { data: uiPermissions } = useGetUiPermission();

  // Set document title and favicon from branding data
  useEffect(() => {
    if (brandingData?.title_prefix) {
      document.title = brandingData.title_prefix;
    }
    if (brandingData?.app_logo) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = brandingData.app_logo;
    }
  }, [brandingData]);

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
    if (isLoading) return;
    if (!currentUser) {
      window.location.href = "/login?redirect-to=%2Fwebapp";
    }
  }, [currentUser, isLoading, navigate]);

  // Preload critical routes after initial load
  useEffect(() => {
    // Only start preloading after the user is authenticated and app is loaded
    if (currentUser && !isLoading) {
      // Start preloading critical routes after a short delay
      const timeout = setTimeout(() => {
        preloadCriticalRoutes();
      }, 1000);

      return () => clearTimeout(timeout);
    }
  }, [currentUser, isLoading]);

  // Preload adjacent routes on navigation
  useEffect(() => {
    if (currentUser && !isLoading) {
      preloadAdjacentRoutes(location.pathname);
    }
  }, [location.pathname, currentUser, isLoading]);

  const permittedPages = useMemo(() => {
    return (
      uiPermissions?.flatMap(
        (app) =>
          app.pages
            ?.filter((page) => page.enabled)
            ?.map((page) => page.page_name) || [],
      ) || []
    );
  }, [uiPermissions]);

  useEffect(() => {
    if (isLoading || !uiPermissions) return;

    const currentPath = location.pathname;
    if (currentPath === "/webapp" || currentPath === "/webapp/") return;

    const routeConfig = findRouteConfig(routesConfig, currentPath);
    const routePermissionKey = routeConfig?.permissionKey;

    if (routePermissionKey) {
      const isPermitted = permittedPages.includes(routePermissionKey);
      if (!isPermitted) {
        toast.error(`You do not have permission to access: ${routePermissionKey}`);
        navigate("/webapp/");
      }
    }
  }, [location.pathname, permittedPages, isLoading, uiPermissions, navigate]);
  return (
    <EmployeeErrorBoundary>

      <PermissionProvider permissions={uiPermissions || []}>
        <GlobalStoreProvider>
          <ViewedUserProvider>
            <TargetUserSync />
            <LoadingOverlayProvider>
              <RequestLeaveModalProvider>
                <GlobalLeaveRequestModal />
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
                        minWidth: "260px",
                        padding: "1rem",
                        borderRadius: "0.5rem",
                        transition:
                          "all 300ms cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                      }}
                    >
                      {({ message }: { message: React.ReactNode }) => (
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
                          {message
                          }
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
                  className="min-h-screen bg-app"
                >
                  <Routes>
                    <Route element={<ModalWrapper />}>
                      <Route path="/webapp/" element={<ResponsiveDashboard />} />
                      {renderRoutes(routesConfig)}
                      <Route path="*" element={<Navigate to="/webapp/" replace />} />
                    </Route>
                  </Routes>
                </div>
              </RequestLeaveModalProvider>
            </LoadingOverlayProvider>
          </ViewedUserProvider>
        </GlobalStoreProvider>
      </PermissionProvider>
    </EmployeeErrorBoundary>
  );
};

export default App;

const MandatoryPoliciesHandler = () => {
  const { data: currentEmployee, isFetching: isCurrentEmployeeFetching } = useCurrentEmployeeAllDetails({
    fields: ["name"]
  });

  const navigate = useNavigate();
  const location = useLocation();
  const [isAutoOpened, setInAutoOpened] = useState(false);
  const [redirectTo, setRedirectTo] = useState<string>("/webapp");

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
      mandatoryPoliciesCount === undefined
    ) {
      return;
    }

    if (mandatoryPoliciesCount <= 0) {
      if (window.isApp) {
        window.nativeInterface.logToNative("destroyNestedWebView");
        window.nativeInterface.execute("destroyNestedWebView");
      } else if (
        window.location.pathname.includes("/webapp/policies-enforced") &&
        isAutoOpened
      ) {
        setInAutoOpened(false);
        navigate(redirectTo);
      }
    }

    if (mandatoryPoliciesCount > 0) {

      if (window.isApp) {
        window.nativeInterface.logToNative("openNestedWebView");
        window.nativeInterface.execute("openNestedWebView", {
          url: window.location.origin + "/webapp/policies-enforced",
          title: "HR Policies",
          isCloseable: false,
        });
      } else if (
        !window.location.pathname.includes("/webapp/policies-enforced")
      ) {
        setRedirectTo(location.pathname);
        setInAutoOpened(true);
        navigate("/webapp/policies-enforced");
      }
    }
  }, [
    mandatoryPoliciesCount,
    isCurrentEmployeeFetching,
    isMandatoryPoliciesCountFetching,
    navigate,
  ]);

  return null;
};