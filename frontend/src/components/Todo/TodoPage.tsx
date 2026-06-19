import { useNavigate } from "react-router";
import HeaderBar from "../HeaderBar";
import DesktopLayoutWrapper from "../DesktopLayoutWrapper";
import { useScreenSize } from "../../hooks/useScreenSize";
import TodoAppShadowWrapper from "../TodoAppShadowWrapper.tsx";

const TodoPage = () => {
  const { isDesktop } = useScreenSize();
  const navigate = useNavigate();

  const content = (
    <div className="bg-white h-full w-full">
      <TodoAppShadowWrapper />
    </div>
  );

  const mobileLayout = (
    <div className="flex flex-col h-screen bg-white">
      <HeaderBar title="Todo" onBack={() => navigate("/webapp/")} />
      <main className="flex-1 overflow-y-auto z-100">{content}</main>
    </div>
  );

  const desktopLayout = (
    <DesktopLayoutWrapper title="Todo">
      <div className="h-full w-full overflow-y-auto">{content}</div>
    </DesktopLayoutWrapper>
  );

  return isDesktop ? desktopLayout : mobileLayout;
};

export default TodoPage;
