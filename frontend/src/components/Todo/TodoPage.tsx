import { useNavigate } from "react-router";
import HeaderBar from "../HeaderBar";
import DesktopLayoutWrapper from "../DesktopLayoutWrapper";
import { useScreenSize } from "../../hooks/useScreenSize";
import TodoAppShadowWrapper from "../TodoAppShadowWrapper.tsx";

const TodoPage = () => {
  const { isDesktop } = useScreenSize();
  const navigate = useNavigate();

  const content = (
    <div className="bg-white">
      <TodoAppShadowWrapper />
    </div>
  );

  const mobileLayout = (
    <div className="flex flex-col min-h-screen bg-white">
      <HeaderBar title="Todo" onBack={() => navigate("/webapp")} />
      <main className="md:p-4 z-100 flex-grow overflow-y-auto">{content}</main>
    </div>
  );

  const desktopLayout = (
    <DesktopLayoutWrapper title="Todo">
      <div className="p-8 md:p-0 overflow-y-auto h-full">{content}</div>
    </DesktopLayoutWrapper>
  );

  return isDesktop ? desktopLayout : mobileLayout;
};

export default TodoPage;
