import MobileDashboard from "../components/MobileDashboard/MobileDashboard";
import DesktopDashboard from "./DesktopDashboard";
import { useScreenSize } from "../hooks/useScreenSize";

const ResponsiveDashboard: React.FC = () => {
  const { isDesktop } = useScreenSize();

  return isDesktop ? <DesktopDashboard /> : <MobileDashboard />;
};

export default ResponsiveDashboard;
