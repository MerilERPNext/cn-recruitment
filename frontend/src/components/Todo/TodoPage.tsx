<<<<<<< Updated upstream
=======
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import HeaderBar from "../HeaderBar";
import DesktopLayoutWrapper from "../DesktopLayoutWrapper";
>>>>>>> Stashed changes
import { useScreenSize } from "../../hooks/useScreenSize";
import DesktopLayoutWrapper from "../DesktopLayoutWrapper";
import HeaderBar from "../HeaderBar";
import TodoAppShadowWrapper from "../TodoAppShadowWrapper.tsx";
import { useTodoSettings } from "../../hooks/useTodo";
import { useTargetUser } from "../../context/ViewedUserContext";
import { useCurrentEmployeeDetails } from "../../hooks/useEmployee";

const TodoPage = () => {
  const { isDesktop } = useScreenSize();
  const navigate = useNavigate();
  const { data: todoSettings } = useTodoSettings();
  const { targetEmployeeId } = useTargetUser();
  const { data: currentEmployee } = useCurrentEmployeeDetails({
    logged_in_employee_details: true,
  });

  // Redirect to dashboard when show_todo_for_self_only is enabled and impersonating
  const isImpersonating =
    !!targetEmployeeId && targetEmployeeId !== currentEmployee?.name;

  useEffect(() => {
    if (todoSettings?.show_todo_for_self_only && isImpersonating) {
      toast.error("Todo is only available for your own profile.", { id: "todo-self-only" });
      navigate("/webapp/", { replace: true });
    }
  }, [todoSettings?.show_todo_for_self_only, isImpersonating, navigate]);

  // Don't render while redirecting
  if (todoSettings?.show_todo_for_self_only && isImpersonating) {
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
