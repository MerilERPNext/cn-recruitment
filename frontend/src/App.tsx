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
import { useCurrentEmployeeDetails } from "./hooks/useEmployee";

import toast, { ToastBar, Toaster } from "react-hot-toast";
import ModalWrapper from "./components/ModalWrapper";
import { RequestLeaveModalProvider } from "./components/Leaves/RequestLeaveModalContext";
import EmployeeErrorBoundary from "./components/EmployeeErrorBoundary";
import { X, CheckCircle2, CircleX } from "lucide-react";
import { Typography } from "./components/shared/atoms/Typography";
import { GlobalStoreProvider } from "./context/GlobalStoreContext";
import {
  preloadCriticalRoutes,
  preloadAdjacentRoutes,
} from "./utils/routePreloader";
import { useCurrentUser } from "./hooks/useCurrentUser";
import { ViewedUserProvider, useTargetUser } from "./context/ViewedUserContext";
import { setTargetEmployeeId } from "./utils/frappeAPI";
import { initializeDateFormat } from "./utils/dateFormatStore";
import { useGetUiPermission } from "./hooks/userUiPermission";
import { PermissionProvider } from "./context/PermissionContext";
import { LoadingOverlayProvider } from "./context/OverlayContext";
import PermissionDeniedScreen from "./components/shared/PermissionDeniedScreen";
import GlobalLeaveRequestModal from "./components/Leaves/GlobalLeaveRequestModal";

import { useWebsiteBranding } from "./hooks/useBranding";
import MandatoryHrProcessHandler from "./components/MandatoryHrProcessHandler";
import MandatoryDocumentsHandler from "./components/MandatoryDocumentsHandler";

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
  // Initialize system date format from backend settings once at app boot
  useEffect(() => {
    initializeDateFormat();
  }, []);

  const { data: currentUser, isLoading } = useCurrentUser();
  const location = useLocation();
  const { data: brandingData } = useWebsiteBranding();
  const {
    data: uiPermissions,
    isLoading: isPermissionLoading,
    isError: isPermissionError,
    refetch: refetchPermissions,
  } = useGetUiPermission();

  const navigate = useNavigate();

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

  // Clear recent searches on page reload (sessionStorage persists across reloads)
  useEffect(() => {
    if (typeof performance !== "undefined" && typeof performance.getEntriesByType === "function") {
      const navEntries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
      if (navEntries.length > 0 && navEntries[0].type === "reload") {
        sessionStorage.removeItem("recentSearches");
      }
    }
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (!currentUser) {
      window.location.href = "/login?redirect-to=%2Fwebapp";
    }
  }, [currentUser, isLoading, navigate]);

  // Preload critical routes after initial load
  useEffect(() => {
    if (isPermissionLoading || isPermissionError) return;
    if (currentUser && !isLoading) {
      const timeout = setTimeout(() => {
        preloadCriticalRoutes();
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [currentUser, isLoading, isPermissionLoading, isPermissionError]);

  // Preload adjacent routes on navigation
  useEffect(() => {
    if (isPermissionLoading || isPermissionError) return;
    if (currentUser && !isLoading) {
      preloadAdjacentRoutes(location.pathname);
    }
  }, [location.pathname, currentUser, isLoading, isPermissionLoading, isPermissionError]);

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
    if (isPermissionLoading || isPermissionError) return;
    if (isLoading || !uiPermissions) return;

    const currentPath = location.pathname;
    if (currentPath === "/webapp" || currentPath === "/webapp/") return;

    const routeConfig = findRouteConfig(routesConfig, currentPath);
    const routePermissionKey = routeConfig?.permissionKey;

    if (routePermissionKey) {
      // A route may declare a single page name or several (aggregate pages like
      // Awards-Live). Access is granted if ANY of the listed pages is enabled.
      const keys = Array.isArray(routePermissionKey)
        ? routePermissionKey
        : [routePermissionKey];
      const isPermitted = keys.some((key) => permittedPages.includes(key));
      if (!isPermitted) {
        toast.error(`You do not have permission to access: ${keys.join(", ")}`);
        navigate("/webapp/");
      }
    }
  }, [location.pathname, permittedPages, isLoading, uiPermissions, navigate, isPermissionLoading, isPermissionError]);

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

  // First, let the authentication check handle unauthenticated users or loading states
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
        <Typography variant="bodySmall" color="body2">
          Redirecting to login...
        </Typography>
      </div>
    );
  }

  // ── Permission gate: check permission API FIRST ──
  // While loading, show a full-screen spinner with message
  if (isPermissionLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
        <Typography variant="bodySmall" color="body2">
          Checking user permissions...
        </Typography>
      </div>
    );
  }

  // If permission API errored, block the entire app
  if (isPermissionError) {
    return (
      <EmployeeErrorBoundary>
        <PermissionDeniedScreen onRetry={refetchPermissions} />
      </EmployeeErrorBoundary>
    );
  }

  // ── Permission resolved successfully — render the app ──
  return (
    <EmployeeErrorBoundary>

      <PermissionProvider permissions={uiPermissions || []}>
        <GlobalStoreProvider>
          <ViewedUserProvider>
            <TargetUserSync />
            <LoadingOverlayProvider>
              <RequestLeaveModalProvider>
                <GlobalLeaveRequestModal />
                <Toaster
                  position="top-center"
                  containerClassName="z-50 !top-4 md:!top-6"
                  toastOptions={{
                    style: {
                      maxWidth: "90vw",
                      width: "380px",
                    }
                  }}
                >
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
                        minWidth: "280px",
                        maxWidth: "90vw",
                        padding: "0.75rem 1rem",
                        borderRadius: "0.5rem",
                        transition:
                          "all 300ms cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                      }}
                    >
                      {({ message }: { message: React.ReactNode }) => (
                        <div className="flex items-start w-full min-w-0">
                          {t.type === "success" ? (
                            <CheckCircle2
                              className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5"
                              strokeWidth={2}
                            />
                          ) : (
                            <CircleX
                              className="h-5 w-5 text-red-500 mr-2 shrink-0 mt-0.5"
                              strokeWidth={2}
                            />
                          )}
                          <div
                            className="flex-1 min-w-0 overflow-y-auto pr-1 text-sm text-gray-700 break-words custom-toast-scrollbar"
                            style={{
                              scrollbarWidth: "thin",
                            }}
                          >
                            {message}
                          </div>
                          {t.type !== "loading" && (
                            <button
                              className="ml-3 p-1 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none transition-colors duration-200 shrink-0"
                              onClick={() => toast.dismiss(t.id)}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </ToastBar>
                  )}
                </Toaster>
                <MandatoryPoliciesHandler />
                <MandatoryHrProcessHandler />
                <MandatoryDocumentsHandler />

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

const SESSION_POLICY_SHOWN_KEY = "policy_page_shown";
const SESSION_POLICY_REDIRECT_TO_KEY = "policy_redirect_to";
const SESSION_POLICY_AUTO_OPENED_KEY = "policy_is_auto_opened";

const MandatoryPoliciesHandler = () => {
  const { data: currentEmployee, isFetching: isCurrentEmployeeFetching } = useCurrentEmployeeDetails({ logged_in_employee_details: true });
  const { isViewingOtherUser } = useTargetUser();

  const navigate = useNavigate();
  const location = useLocation();
  const [isAutoOpened, setInAutoOpened] = useState(() => {
    return sessionStorage.getItem(SESSION_POLICY_AUTO_OPENED_KEY) === "true";
  });
  const [redirectTo, setRedirectTo] = useState<string>(() => {
    return sessionStorage.getItem(SESSION_POLICY_REDIRECT_TO_KEY) || "/webapp";
  });

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
        ["triggered_from_flow", "!=", 1],
        ["due_date", ">=", new Date().toLocaleDateString('en-CA')],
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
      isViewingOtherUser
    ) {
      return;
    }

    const onPolicyPage = window.location.pathname.includes("/webapp/policies-enforced");

    if (mandatoryPoliciesCount <= 0) {
      if (window.isApp) {
        window.nativeInterface.logToNative("destroyNestedWebView");
        window.nativeInterface.execute("destroyNestedWebView");
      } else if (onPolicyPage && isAutoOpened) {
        // Only auto-navigate away if we were redirected here due to pending policies
        setInAutoOpened(false);
        sessionStorage.removeItem(SESSION_POLICY_AUTO_OPENED_KEY);
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
      } else if (!onPolicyPage) {
        sessionStorage.setItem(SESSION_POLICY_SHOWN_KEY, "true");
        sessionStorage.setItem(SESSION_POLICY_AUTO_OPENED_KEY, "true");
        sessionStorage.setItem(SESSION_POLICY_REDIRECT_TO_KEY, location.pathname);
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
    isAutoOpened,
    redirectTo,
    location.pathname,
    isViewingOtherUser,
  ]);


  return null;
};