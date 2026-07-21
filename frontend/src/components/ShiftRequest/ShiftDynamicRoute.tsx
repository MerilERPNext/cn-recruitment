import { useScreenSize } from "../../hooks/useScreenSize";
import AllMyShiftsList from "./AllMyShiftsList";
import AllShiftsDashboard from "./AllShiftsDashboard";
import AllTeamShiftsList from "./AllTeamShiftsList";
import AllShiftChangeRequestsList from "./AllShiftChangeRequestsList";
import { Navigate } from "react-router-dom";
import { useShiftRouting } from "../../hooks/useShiftRouting";
import AllMyShiftRequestsList from "./AllMyShiftRequestsList";

export const AllShiftsDashboardRoute = () => {
  useShiftRouting(); // Add the routing hook
  const { isDesktop } = useScreenSize();
  return isDesktop ? (
    <AllShiftsDashboard />
  ) : (
    <Navigate to="/webapp/shift-request/my-shift-assignment" replace />
  );
};

export const MyShiftsListRoute = () => {
  useShiftRouting(); // Add the routing hook
  return <AllMyShiftsList />;
};

export const TeamShiftsListRoute = () => {
  useShiftRouting(); // Add the routing hook
  return <AllTeamShiftsList />;
};

export const ShiftChangeRequestsRoute = () => {
  useShiftRouting(); // Add the routing hook
  return <AllShiftChangeRequestsList />;
};

export const MyShiftRequestsRoute = () => {
  useShiftRouting(); // Add the routing hook
  return <AllMyShiftRequestsList />;
};
