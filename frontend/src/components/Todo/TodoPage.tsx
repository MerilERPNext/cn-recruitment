
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import HeaderBar from "../HeaderBar";
import DesktopLayoutWrapper from "../DesktopLayoutWrapper";
import { useScreenSize } from "../../hooks/useScreenSize";
import TodoAppShadowWrapper from "../TodoAppShadowWrapper.tsx";
import { useImpersonationSettings } from "../../hooks/useImpersonationSettings";
import { useTargetUser } from "../../context/ViewedUserContext";
import { useCurrentEmployeeDetails } from "../../hooks/useEmployee";
import { useGetUiPermission } from "../../hooks/userUiPermission";
import { getImpersonationFallbackRoute } from "../../utils/impersonationUtils";

const TodoPage = () => {
  const { isDesktop } = useScreenSize();
  const navigate = useNavigate();
  const { data: impersonationSettings } = useImpersonationSettings();
  const { targetEmployeeId } = useTargetUser();
  const { data: currentEmployee } = useCurrentEmployeeDetails({
    logged_in_employee_details: true,
  });
  const { data: uiPermissions } = useGetUiPermission();

  // Redirect when impersonating and show_todo is not enabled
  const isImpersonating =
    !!targetEmployeeId && targetEmployeeId !== currentEmployee?.name;

  const isTodoHidden = isImpersonating && !impersonationSettings?.show_todo;
  const isDashboardHidden =
    isImpersonating && !impersonationSettings?.show_dashboard;

  useEffect(() => {
    if (isTodoHidden) {
      toast.error("Todo is only available for your own profile.", { id: "todo-self-only" });
      const targetPath = isDashboardHidden
        ? getImpersonationFallbackRoute(uiPermissions)
        : "/webapp/";
      navigate(targetPath, { replace: true });
    }
  }, [
    isTodoHidden,
    isDashboardHidden,
    uiPermissions,
    navigate,
  ]);

  // Don't render while redirecting
  if (isTodoHidden) {
    return null;
  }

  const content = (
    <div className="bg-white h-full w-full">
      <TodoAppShadowWrapper />
    </div>
  );

  const mobileLayout = (
    <div className="flex flex-col h-screen bg-white">
      <HeaderBar title="Todo" />
      <main className="flex-1 overflow-y-auto z-100">{content}</main>
    </div>
  );

  const desktopLayout = (
    <DesktopLayoutWrapper title="Todo">
      <div className="h-full w-full overflow-hidden">{content}</div>
    </DesktopLayoutWrapper>
  );

  return isDesktop ? desktopLayout : mobileLayout;
};

export default TodoPage;
