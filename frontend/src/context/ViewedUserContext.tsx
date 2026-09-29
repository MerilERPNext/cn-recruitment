import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useCurrentEmployeeDetails } from "../hooks/useEmployee";
import { useQueryClient } from "@tanstack/react-query";

interface ViewedUserContextType {
  targetEmployeeId: string | null;
  setTargetEmployee: (
    employeeId: string | null,
    targetPath?: string,
    openInNewTab?: boolean,
  ) => void;
  clearTargetEmployee: () => void;
  isViewingOtherUser: boolean;
}

const ViewedUserContext = createContext<ViewedUserContextType | undefined>(
  undefined,
);

// The viewed employee rides on the history entry (location.state) instead of the
// URL, so it never shows in the address bar. `?target_user=` is still accepted on
// the way in (digest emails, bookmarks, links in the app) and stripped on arrival.
const TARGET_USER_PARAM = "target_user";
const HISTORY_STATE_KEY = "target_user";
const SESSION_STORAGE_KEY = "viewed_employee_id";
// A new tab starts with empty history state, so the id is handed over in window.name.
const WINDOW_NAME_PREFIX = "pw_target_user:";

const getStateTarget = (state: unknown): string | null => {
  const value =
    state && typeof state === "object"
      ? (state as Record<string, unknown>)[HISTORY_STATE_KEY]
      : null;
  return typeof value === "string" && value ? value : null;
};

const withStateTarget = (state: unknown, employeeId: string | null) => {
  const next: Record<string, unknown> =
    state && typeof state === "object" ? { ...state } : {};
  if (employeeId) {
    next[HISTORY_STATE_KEY] = employeeId;
  } else {
    delete next[HISTORY_STATE_KEY];
  }
  return next;
};

const withoutTargetParam = (search: string) => {
  const params = new URLSearchParams(search);
  params.delete(TARGET_USER_PARAM);
  const query = params.toString();
  return query ? `?${query}` : "";
};

// Read once per page load, at import: StrictMode runs state initializers twice
// and the second run would find window.name already cleared.
const handedOverEmployeeId = (() => {
  if (typeof window === "undefined" || !window.name.startsWith(WINDOW_NAME_PREFIX)) {
    return null;
  }
  const payload = window.name.slice(WINDOW_NAME_PREFIX.length);
  window.name = "";
  try {
    return decodeURIComponent(payload.slice(payload.indexOf(":") + 1)) || null;
  } catch {
    return null;
  }
})();

// Open an in-app path in a new tab, viewing it as `employeeId`, without putting
// the id in the URL. The timestamp keeps each window name unique, so a second
// click opens another tab instead of reusing the first one.
// eslint-disable-next-line react-refresh/only-export-components
export const openInNewTabAs = (path: string, employeeId: string) => {
  window.open(
    path,
    `${WINDOW_NAME_PREFIX}${Date.now()}:${encodeURIComponent(employeeId)}`,
  );
};

export const ViewedUserProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: currentEmployee } = useCurrentEmployeeDetails({ logged_in_employee_details: true });
  // What our own pending navigate() will put on the history entry: an employee
  // id, null while clearing, undefined when nothing is pending. Until it lands
  // the entry still carries the old target, which must not be adopted back.
  const awaitedTarget = useRef<string | null | undefined>(undefined);
  const navigateTimeoutRef = useRef<number | null>(null);
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const queryClient = useQueryClient();

  const [targetEmployeeId, setTargetEmployeeIdState] = useState<string | null>(
    () => {
      const initial =
        searchParams.get(TARGET_USER_PARAM) ||
        handedOverEmployeeId ||
        getStateTarget(location.state) ||
        sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (initial) {
        sessionStorage.setItem(SESSION_STORAGE_KEY, initial);
      }
      return initial;
    },
  );

  // Keep the history entry and the state in step on every navigation.
  useEffect(() => {
    const urlParam = searchParams.get(TARGET_USER_PARAM);
    const stateTarget = getStateTarget(location.state);

    if (awaitedTarget.current !== undefined) {
      const landed =
        awaitedTarget.current === null
          ? !urlParam && !stateTarget
          : stateTarget === awaitedTarget.current;
      if (!landed) {
        return;
      }
      awaitedTarget.current = undefined;
    }

    if (urlParam) {
      // Arrived through a ?target_user= link: adopt it and drop it from the URL.
      if (urlParam !== targetEmployeeId) {
        setTargetEmployeeIdState(urlParam);
        sessionStorage.setItem(SESSION_STORAGE_KEY, urlParam);
      }
      navigate(
        {
          pathname: location.pathname,
          search: withoutTargetParam(location.search),
          hash: location.hash,
        },
        { replace: true, state: withStateTarget(location.state, urlParam) },
      );
    } else if (stateTarget) {
      // Back/forward onto an entry recorded while viewing someone else.
      if (stateTarget !== targetEmployeeId) {
        setTargetEmployeeIdState(stateTarget);
        sessionStorage.setItem(SESSION_STORAGE_KEY, stateTarget);
      }
    } else if (targetEmployeeId) {
      // "Sticky Session": an entry reached without a target (sidebar link,
      // setSearchParams, ...) keeps showing the employee being viewed.
      navigate(
        {
          pathname: location.pathname,
          search: location.search,
          hash: location.hash,
        },
        { replace: true, state: withStateTarget(location.state, targetEmployeeId) },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key, targetEmployeeId]);

  // Links elsewhere in the app still hard-code ?target_user=. Catch clicks on
  // them before the browser or the router follows the href, and hand the id
  // over out of band instead, so it never reaches the address bar. Opening such
  // a link some other way (context menu, copy link) still works: the id is
  // taken from the URL on arrival and removed.
  useEffect(() => {
    const onLinkClick = (event: MouseEvent) => {
      const isNewTabClick = event.type === "auxclick";
      if (event.defaultPrevented || event.button !== (isNewTabClick ? 1 : 0)) {
        return;
      }
      const anchor = event
        .composedPath()
        .find((node): node is HTMLAnchorElement => node instanceof HTMLAnchorElement);
      if (!anchor?.href) {
        return;
      }
      const url = new URL(anchor.href, window.location.href);
      const employeeId = url.searchParams.get(TARGET_USER_PARAM);
      if (
        !employeeId ||
        url.origin !== window.location.origin ||
        !url.pathname.startsWith("/webapp")
      ) {
        return;
      }

      event.preventDefault();
      url.searchParams.delete(TARGET_USER_PARAM);
      const path = `${url.pathname}${url.search}${url.hash}`;
      if (
        isNewTabClick ||
        anchor.target === "_blank" ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey
      ) {
        openInNewTabAs(path, employeeId);
      } else {
        navigateRef.current(path, { state: { [HISTORY_STATE_KEY]: employeeId } });
      }
    };

    document.addEventListener("click", onLinkClick, true);
    document.addEventListener("auxclick", onLinkClick, true);
    return () => {
      document.removeEventListener("click", onLinkClick, true);
      document.removeEventListener("auxclick", onLinkClick, true);
    };
  }, []);

  const hasReloadedRef = useRef(false);

  useEffect(() => {
    if (!currentEmployee?.name || !targetEmployeeId || hasReloadedRef.current) {
      return;
    }

    // If impersonation target is same as logged-in user
    if (currentEmployee.name === targetEmployeeId) {
      hasReloadedRef.current = true;
      awaitedTarget.current = null;

      // Clear state + session
      setTargetEmployeeIdState(null);
      sessionStorage.removeItem(SESSION_STORAGE_KEY);

      // Clean the history entry
      navigate(
        {
          pathname: location.pathname,
          search: withoutTargetParam(location.search),
          hash: location.hash,
        },
        { replace: true, state: withStateTarget(location.state, null) },
      );

      // Force full reload (after URL cleanup)
      setTimeout(() => {
        window.location.reload();
      }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEmployee?.name, targetEmployeeId, location.key]);

  const setTargetEmployee = (
    employeeId: string | null,
    targetPath?: string,
    openInNewTab: boolean = false,
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

      // A target page keeps its own query string; staying put keeps the current one.
      const path =
        targetPath ||
        `${location.pathname}${withoutTargetParam(location.search)}${location.hash}`;

      if (openInNewTab) {
        // Only open in new tab - don't modify current tab's state or sessionStorage
        openInNewTabAs(path, employeeId);
      } else {
        // Navigate in current tab - update state and sessionStorage
        awaitedTarget.current = employeeId;
        setTargetEmployeeIdState(employeeId);
        sessionStorage.setItem(SESSION_STORAGE_KEY, employeeId);

        const state = targetPath
          ? withStateTarget(null, employeeId)
          : withStateTarget(location.state, employeeId);
        navigateTimeoutRef.current = window.setTimeout(() => {
          navigate(path, { replace: true, state });
        }, 100);
      }
    } else {
      clearTargetEmployee();
    }
  };

  const clearTargetEmployee = () => {
    // Only invalidate if we were actually viewing another user
    const wasImpersonating = targetEmployeeId !== null;

    // A switch still waiting to navigate would put its target back
    if (navigateTimeoutRef.current) {
      clearTimeout(navigateTimeoutRef.current);
      navigateTimeoutRef.current = null;
    }
    awaitedTarget.current = null;
    setTargetEmployeeIdState(null);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);

    if (wasImpersonating) {
      queryClient.invalidateQueries({
        predicate: (query) => {
          // queyKeys for apis which only get data for current Logged in Uer Only
          const excludedKeys = [
            ["currentEmployee"],
            ["currentUser"],
            ["currentEmployeeIdCard"],
            ["currentEmployeeAllDetails"],
            ["currentEmployeeDetails"]
          ];

          return !excludedKeys.some((key) => query.queryKey[0] === key[0]);
        },
      });
    }

    navigate(
      {
        pathname: location.pathname,
        search: withoutTargetParam(location.search),
        hash: location.hash,
      },
      { replace: true, state: withStateTarget(location.state, null) },
    );
  };

  const isViewingOtherUser =
    targetEmployeeId !== null &&
    currentEmployee?.name !== undefined &&
    targetEmployeeId !== currentEmployee.name;

  // Sync window.target_pw_user_id:
  // - If impersonating another user, set it to the impersonated employee's ID
  // - Otherwise, default to the logged-in employee's own ID (name field)
  useEffect(() => {
    if (isViewingOtherUser && targetEmployeeId) {
      window.target_pw_user_id = targetEmployeeId;
    } else {
      window.target_pw_user_id = currentEmployee?.name ?? null;
    }
  }, [isViewingOtherUser, targetEmployeeId, currentEmployee?.name]);

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

// Non-throwing accessor for the current target employee id. Returns null when
// used outside a ViewedUserProvider (e.g. shared hooks rendered above the
// provider), where impersonation is not in effect anyway.
// eslint-disable-next-line react-refresh/only-export-components
export const useOptionalTargetEmployeeId = (): string | null => {
  return useContext(ViewedUserContext)?.targetEmployeeId ?? null;
};
