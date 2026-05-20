import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCurrentEmployeeDetails } from "../hooks/useEmployee";
import { useMandatoryTasks } from "../hooks/useMandatoryTasks";
import { ROUTES } from "../constants/routes";
import { useFrappeDocumentCount } from "../hooks/useFrappeQuery";

const SESSION_MANDATORY_HR_SHOWN_KEY = "mandatory_hr_page_shown";
const SESSION_MANDATORY_HR_REDIRECT_TO_KEY = "mandatory_hr_redirect_to";
const SESSION_MANDATORY_HR_AUTO_OPENED_KEY = "mandatory_hr_is_auto_opened";
const SESSION_MANDATORY_HR_CURRENT_TASK_KEY = "mandatory_hr_current_task";

const MandatoryHrProcessHandler = () => {
  const { data: currentEmployee, isFetching: isCurrentEmployeeFetching } =
    useCurrentEmployeeDetails({ logged_in_employee_details: true });

  const navigate = useNavigate();
  const location = useLocation();
  const [isAutoOpened, setIsAutoOpened] = useState(() => {
    return (
      sessionStorage.getItem(SESSION_MANDATORY_HR_AUTO_OPENED_KEY) === "true"
    );
  });
  const [redirectTo, setRedirectTo] = useState<string>(() => {
    return (
      sessionStorage.getItem(SESSION_MANDATORY_HR_REDIRECT_TO_KEY) || "/webapp"
    );
  });

  const {
    data: mandatoryResponse,
    isFetching: isMandatoryTasksFetching,
    refetch,
  } = useMandatoryTasks({
    enabled: !!currentEmployee,
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
        ["triggered_from_flow", "=", 0],
        ["due_date", ">=", new Date().toLocaleDateString('en-CA')],
      ],
    },
    {
      enabled: !!currentEmployee,
    }
  );

  const mandatoryTasks = useMemo(
    () => mandatoryResponse?.data ?? [],
    [mandatoryResponse?.data],
  );
  const mandatoryTasksCount = mandatoryTasks.length;

  const getHashTaskName = (hash: string) => hash.replace(/^#\/?/, "").trim();

  const isOnMandatoryHrPage = (pathname: string) =>
    pathname.includes(ROUTES.HR_PROCESS_MANDATORY) ||
    pathname.includes(ROUTES.TODO);

  useEffect(() => {
    if (
      isCurrentEmployeeFetching ||
      isMandatoryTasksFetching ||
      mandatoryResponse === undefined ||
      isMandatoryPoliciesCountFetching ||
      mandatoryPoliciesCount === undefined
    ) {
      return;
    }

    const onPoliciesPage = location.pathname.includes(ROUTES.POLICIES_ENFORCED);

    // First complete hr policy then enforce hr process mandatory
    if (mandatoryPoliciesCount > 0 || onPoliciesPage) {
      return;
    }

    const onMandatoryHrPage = isOnMandatoryHrPage(location.pathname);
    const onTodoPage = location.pathname.includes(ROUTES.TODO);

    if (mandatoryTasksCount <= 0) {
      if (window.isApp) {
        window.nativeInterface.logToNative("destroyNestedWebView");
        window.nativeInterface.execute("destroyNestedWebView");
      } else if (onMandatoryHrPage && isAutoOpened) {
        setIsAutoOpened(false);
        sessionStorage.removeItem(SESSION_MANDATORY_HR_AUTO_OPENED_KEY);
        sessionStorage.removeItem(SESSION_MANDATORY_HR_CURRENT_TASK_KEY);
        navigate(redirectTo);
      }
      return;
    }

    if (mandatoryTasksCount > 0) {
      if (window.isApp) {
        window.nativeInterface.logToNative("openNestedWebView");
        window.nativeInterface.execute("openNestedWebView", {
          url: window.location.origin + ROUTES.HR_PROCESS_MANDATORY,
          title: "Mandatory HR Actions",
          isCloseable: false,
        });
      } else if (!onMandatoryHrPage) {
        sessionStorage.setItem(SESSION_MANDATORY_HR_SHOWN_KEY, "true");
        sessionStorage.setItem(SESSION_MANDATORY_HR_AUTO_OPENED_KEY, "true");
        sessionStorage.setItem(
          SESSION_MANDATORY_HR_REDIRECT_TO_KEY,
          location.pathname,
        );
        setRedirectTo(location.pathname);
        setIsAutoOpened(true);
        navigate(ROUTES.HR_PROCESS_MANDATORY);
      } else if (onTodoPage) {
        const hashName = getHashTaskName(
          location.hash || window.location.hash,
        );
        const hasValidMandatoryTaskInUrl =
          Boolean(hashName) &&
          mandatoryTasks.some((task) => task.name === hashName);

        if (!hasValidMandatoryTaskInUrl) {
          if (!isAutoOpened) {
            sessionStorage.setItem(SESSION_MANDATORY_HR_SHOWN_KEY, "true");
            sessionStorage.setItem(SESSION_MANDATORY_HR_AUTO_OPENED_KEY, "true");
            sessionStorage.setItem(
              SESSION_MANDATORY_HR_REDIRECT_TO_KEY,
              location.pathname,
            );
            setRedirectTo(location.pathname);
            setIsAutoOpened(true);
          }
          navigate(ROUTES.HR_PROCESS_MANDATORY, { replace: true });
        }
      }
    }
  }, [
    mandatoryTasksCount,
    mandatoryTasks,
    mandatoryResponse,
    isCurrentEmployeeFetching,
    isMandatoryTasksFetching,
    navigate,
    isAutoOpened,
    redirectTo,
    location.pathname,
    location.hash,
    mandatoryPoliciesCount,
    isMandatoryPoliciesCountFetching,
  ]);

  useEffect(() => {
    const handleChatClose = async () => {
      if (!isAutoOpened) return;

      const result = await refetch();
      const tasks = result.data?.data ?? [];

      sessionStorage.removeItem(SESSION_MANDATORY_HR_CURRENT_TASK_KEY);

      if (tasks.length > 0) {
        navigate(ROUTES.HR_PROCESS_MANDATORY, { replace: true });
        return;
      }

      const storedRedirect =
        sessionStorage.getItem(SESSION_MANDATORY_HR_REDIRECT_TO_KEY) ||
        "/webapp";
      setRedirectTo(storedRedirect);
      setIsAutoOpened(false);
      sessionStorage.removeItem(SESSION_MANDATORY_HR_AUTO_OPENED_KEY);
      navigate(storedRedirect);
    };

    document.addEventListener("chatnext:modal:chat:close", handleChatClose);

    return () => {
      document.removeEventListener(
        "chatnext:modal:chat:close",
        handleChatClose,
      );
    };
  }, [isAutoOpened, refetch, navigate]);

  return null;
};

export default MandatoryHrProcessHandler;
