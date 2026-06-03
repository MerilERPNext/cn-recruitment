import React, { useEffect, useMemo, useRef, useState } from "react";
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
import MandatoryHrProcessHandler from "./components/MandatoryHrProcessHandler";

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
const SESSION_NON_MANDATORY_POLICY_REDIRECTED_KEY =
  "non_mandatory_policy_redirected";


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

  const {
    data: NonMandatoryPoliciesCount,
    isFetching: isNonMandatoryPoliciesCountFetching,
  } = useFrappeDocumentCount(
    {
      doctype: "Policy Details",
      filters: [
        ["status", "=", "Pending"],
        ["employee_id", "=", currentEmployee?.name || ""],
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

  // One-time redirect per page reload for non-mandatory policies
  const hasRedirectedForNonMandatory = useRef(false);

  // If a different employee logs in without a full reload, ensure we don't
  // suppress their redirect due to a previous user's in-memory ref state.
  useEffect(() => {
    hasRedirectedForNonMandatory.current = false;
  }, [currentEmployee?.name]);

  useEffect(() => {
    if (
      isCurrentEmployeeFetching ||
      isMandatoryPoliciesCountFetching ||
      isNonMandatoryPoliciesCountFetching ||
      mandatoryPoliciesCount === undefined ||
      NonMandatoryPoliciesCount === undefined ||
      isViewingOtherUser
    ) {
      return;
    }

    // Skip if mandatory policies are present (mandatory flow takes priority)
    if (mandatoryPoliciesCount > 0) {
      return;
    }

    const sessionRedirectKey = currentEmployee?.name
      ? `${SESSION_NON_MANDATORY_POLICY_REDIRECTED_KEY}_${currentEmployee.name}`
      : SESSION_NON_MANDATORY_POLICY_REDIRECTED_KEY;

    // Skip if already redirected once in this session (or since last reload)
    if (
      hasRedirectedForNonMandatory.current ||
      sessionStorage.getItem(sessionRedirectKey) === "true"
    ) {
      return;
    }

    const onPolicyPage = window.location.pathname.includes("/webapp/policies-enforced");

    if (NonMandatoryPoliciesCount > 0 && !onPolicyPage) {
      hasRedirectedForNonMandatory.current = true;
      sessionStorage.setItem(sessionRedirectKey, "true");
      navigate("/webapp/policies-enforced");
    }
  }, [
    NonMandatoryPoliciesCount,
    isNonMandatoryPoliciesCountFetching,
    mandatoryPoliciesCount,
    isCurrentEmployeeFetching,
    isMandatoryPoliciesCountFetching,
    navigate,
    location.pathname,
    isViewingOtherUser,
    currentEmployee?.name,
  ]);

  return null;
};