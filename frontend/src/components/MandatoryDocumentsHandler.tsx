import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCurrentEmployeeDetails } from "../hooks/useEmployee";
import { useFrappeDocumentCount } from "../hooks/useFrappeQuery";
import { useTargetUser } from "../context/ViewedUserContext";
import { useMandatoryTasks } from "../hooks/useMandatoryTasks";
import { ROUTES } from "../constants/routes";

const SESSION_MANDATORY_DOC_SHOWN_KEY = "mandatory_doc_page_shown";
const SESSION_MANDATORY_DOC_REDIRECT_TO_KEY = "mandatory_doc_redirect_to";
const SESSION_MANDATORY_DOC_AUTO_OPENED_KEY = "mandatory_doc_is_auto_opened";

const MandatoryDocumentsHandler = () => {
  const { data: currentEmployee, isFetching: isCurrentEmployeeFetching } =
    useCurrentEmployeeDetails({ logged_in_employee_details: true });
  const { isViewingOtherUser } = useTargetUser();

  const navigate = useNavigate();
  const location = useLocation();
  const [isAutoOpened, setIsAutoOpened] = useState(() => {
    return (
      sessionStorage.getItem(SESSION_MANDATORY_DOC_AUTO_OPENED_KEY) === "true"
    );
  });
  const [redirectTo, setRedirectTo] = useState<string>(() => {
    return (
      sessionStorage.getItem(SESSION_MANDATORY_DOC_REDIRECT_TO_KEY) || "/webapp"
    );
  });

  const {
    data: mandatoryDocsCount,
    isFetching: isMandatoryDocsCountFetching,
  } = useFrappeDocumentCount(
    {
      doctype: "Employee Documents",
      filters: [
        ["status", "=", "Acknowledgement Required"],
        ["employee", "=", currentEmployee?.name || ""],
        ["enable_mandatory_acknowledgement", "!=", 1],
      ],
    },
    {
      enabled: !!currentEmployee,
    }
  );

  const {
    data: mandatoryResponse,
    isFetching: isMandatoryTasksFetching,
  } = useMandatoryTasks({
    enabled: !!currentEmployee,
  });

  const mandatoryTasks = useMemo(
    () => mandatoryResponse?.data ?? [],
    [mandatoryResponse?.data],
  );
  const mandatoryTasksCount = mandatoryTasks.length;

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
      isMandatoryDocsCountFetching ||
      mandatoryDocsCount === undefined ||
      isMandatoryTasksFetching ||
      mandatoryResponse === undefined ||
      isMandatoryPoliciesCountFetching ||
      mandatoryPoliciesCount === undefined ||
      isViewingOtherUser
    ) {
      return;
    }

    const onPoliciesPage = location.pathname.includes(ROUTES.POLICIES_ENFORCED);
    const onMandatoryHrPage = location.pathname.includes(ROUTES.HR_PROCESS_MANDATORY) || location.pathname.includes(ROUTES.TODO);

    if (mandatoryPoliciesCount > 0 || mandatoryTasksCount > 0 || onPoliciesPage || onMandatoryHrPage) {
      return;
    }

    const onMandatoryDocsPage = location.pathname.includes("/webapp/mandatory-documents");

    if (mandatoryDocsCount <= 0) {
      if (window.isApp) {
        window.nativeInterface.logToNative("destroyNestedWebView");
        window.nativeInterface.execute("destroyNestedWebView");
      } else if (onMandatoryDocsPage) {
        setIsAutoOpened(false);
        sessionStorage.removeItem(SESSION_MANDATORY_DOC_AUTO_OPENED_KEY);
        navigate(redirectTo === "/webapp/mandatory-documents" || !redirectTo ? "/webapp/" : redirectTo);
      }
      return;
    }

    if (mandatoryDocsCount > 0) {
      if (window.isApp) {
        window.nativeInterface.logToNative("openNestedWebView");
        window.nativeInterface.execute("openNestedWebView", {
          url: window.location.origin + "/webapp/mandatory-documents",
          title: "Mandatory Documents",
          isCloseable: false,
        });
      } else if (!onMandatoryDocsPage) {
        sessionStorage.setItem(SESSION_MANDATORY_DOC_SHOWN_KEY, "true");
        sessionStorage.setItem(SESSION_MANDATORY_DOC_AUTO_OPENED_KEY, "true");
        sessionStorage.setItem(
          SESSION_MANDATORY_DOC_REDIRECT_TO_KEY,
          location.pathname,
        );
        setRedirectTo(location.pathname);
        setIsAutoOpened(true);
        navigate("/webapp/mandatory-documents");
      }
    }
  }, [
    mandatoryDocsCount,
    isCurrentEmployeeFetching,
    isMandatoryDocsCountFetching,
    mandatoryTasksCount,
    mandatoryTasks,
    mandatoryResponse,
    isMandatoryTasksFetching,
    mandatoryPoliciesCount,
    isMandatoryPoliciesCountFetching,
    navigate,
    isAutoOpened,
    redirectTo,
    location.pathname,
    isViewingOtherUser,
  ]);

  return null;
};

export default MandatoryDocumentsHandler;
