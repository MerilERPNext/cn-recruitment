import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useCurrentEmployee } from "../hooks/useEmployee";
import { useQueryClient } from "@tanstack/react-query";

interface ViewedUserContextType {
  targetEmployeeId: string | null;
  setTargetEmployee: (
    employeeId: string | null,
    targetPath?: string,
    openInNewTab?: boolean
  ) => void;
  clearTargetEmployee: () => void;
  isViewingOtherUser: boolean;
}

const ViewedUserContext = createContext<ViewedUserContextType | undefined>(
  undefined
);

const TARGET_USER_PARAM = "target_user";
const SESSION_STORAGE_KEY = "viewed_employee_id";

export const ViewedUserProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: currentEmployee } = useCurrentEmployee();
  const isClearing = useRef(false);
  const navigateTimeoutRef = useRef<number | null>(null);
  const queryClient = useQueryClient();

  const [targetEmployeeId, setTargetEmployeeIdState] = useState<string | null>(
    () => {
      // Initialize from URL first, then session storage
      const urlParam = searchParams.get(TARGET_USER_PARAM);
      if (urlParam) {
        sessionStorage.setItem(SESSION_STORAGE_KEY, urlParam);
        return urlParam;
      }
      return sessionStorage.getItem(SESSION_STORAGE_KEY);
    }
  );

  // Sync URL -> State when URL changes manually (e.g., bookmark, back button)
  useEffect(() => {
    // If we're in the process of clearing, don't do anything
    // This prevents race conditions where the effect runs before state updates complete
    if (isClearing.current) {
      return;
    }

    const urlParam = searchParams.get(TARGET_USER_PARAM);

    if (urlParam && urlParam !== targetEmployeeId) {
      // URL has a different target user, update state
      setTargetEmployeeIdState(urlParam);
      sessionStorage.setItem(SESSION_STORAGE_KEY, urlParam);
    } else if (!urlParam && targetEmployeeId) {
      // URL is missing the param but we have a target user in state
      // This is the "Sticky Session" logic - append the param to URL
      const newParams = new URLSearchParams(searchParams);
      newParams.set(TARGET_USER_PARAM, targetEmployeeId);

      navigate(
        {
          pathname: location.pathname,
          search: newParams.toString(),
        },
        { replace: true }
      );
    } else if (!urlParam && !targetEmployeeId) {
      // Both are null, we're in a clean state
      isClearing.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, searchParams.toString(), targetEmployeeId]);

  const hasReloadedRef = useRef(false);


  useEffect(() => {
    if (
      !currentEmployee?.name ||
      !targetEmployeeId ||
      hasReloadedRef.current
    ) {
      return;
    }

    // If impersonation target is same as logged-in user
    if (currentEmployee.name === targetEmployeeId) {
      hasReloadedRef.current = true;
      isClearing.current = true;

      // Clear state + session
      setTargetEmployeeIdState(null);
      sessionStorage.removeItem(SESSION_STORAGE_KEY);

      // Clean URL
      const newParams = new URLSearchParams(searchParams);
      newParams.delete(TARGET_USER_PARAM);

      navigate(
        {
          pathname: location.pathname,
          search: newParams.toString(),
        },
        { replace: true }
      );

      // Force full reload (after URL cleanup)
      setTimeout(() => {
        window.location.reload();
      }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEmployee?.name, targetEmployeeId]);


  const setTargetEmployee = (
    employeeId: string | null,
    targetPath?: string,
    openInNewTab: boolean = false
  ) => {
    // Clear any pending navigation timeout
    if (navigateTimeoutRef.current) {
      clearTimeout(navigateTimeoutRef.current);
      navigateTimeoutRef.current = null;
    }

    if (employeeId) {
      if (employeeId === targetEmployeeId && !targetPath && !openInNewTab) {
        return;
      }

      const newParams = new URLSearchParams(searchParams);
      newParams.set(TARGET_USER_PARAM, employeeId);
      const fullPath = `${targetPath || location.pathname
        }?${newParams.toString()}`;

      if (openInNewTab) {
        // Only open in new tab - don't modify current tab's state or sessionStorage
        window.open(fullPath, "_blank");
      } else {
        // Navigate in current tab - update state and sessionStorage
        isClearing.current = false;
        setTargetEmployeeIdState(employeeId);
        sessionStorage.setItem(SESSION_STORAGE_KEY, employeeId);

        navigateTimeoutRef.current = window.setTimeout(() => {
          navigate(
            {
              pathname: targetPath || location.pathname,
              search: newParams.toString(),
            },
            { replace: true }
          );
        }, 100);
      }
    } else {
      clearTargetEmployee();
    }
  };

  const clearTargetEmployee = () => {
    isClearing.current = true;
    setTargetEmployeeIdState(null);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);

    // Remove param from URL
    const newParams = new URLSearchParams(searchParams);
    newParams.delete(TARGET_USER_PARAM);
    queryClient.invalidateQueries({
      queryKey: ["ui-permission"],
    });

    navigate(
      {
        pathname: location.pathname,
        search: newParams.toString(),
      },
      { replace: true }
    );
  };

  const isViewingOtherUser =
    targetEmployeeId !== null &&
    currentEmployee?.name !== undefined &&
    targetEmployeeId !== currentEmployee.name;

  return (
    <ViewedUserContext.Provider
      value={{
        targetEmployeeId,
        setTargetEmployee,
        clearTargetEmployee,
        isViewingOtherUser,
      }}
    >
      {children}
    </ViewedUserContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useTargetUser = () => {
  const context = useContext(ViewedUserContext);
  if (context === undefined) {
    throw new Error("useTargetUser must be used within a ViewedUserProvider");
  }
  return context;
};
