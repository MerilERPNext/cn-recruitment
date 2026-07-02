import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * Centralized back-navigation hook.
 *
 * Handles the native mobile-app bridge (`window.nativeInterface.goBack`)
 * when the browser history stack is empty, and falls back to
 * `navigate(-1)` for regular web navigation.
 */
export const useNavigateBack = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const canGoBack = location.key !== "default";

  const navigateBack = useCallback(() => {
    if (window?.isApp && !canGoBack && window?.nativeInterface?.execute) {
      // Mobile app: delegate to native bridge when web history is empty
      window.nativeInterface
        .execute("goBack", {})
        .then(() => {
          console.log("goBack");
        })
        .catch(() => {
          console.log("goBack failed");
          navigate("/webapp");
        });
    } else {
      navigate(-1);
    }
  }, [canGoBack, navigate]);

  return navigateBack;
};
