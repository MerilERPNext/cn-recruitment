import { useScreenSize } from "../../hooks/useScreenSize";
import AllMyShiftsList from "./AllMyShiftsList";
import AllShiftsDashboard from "./AllShiftsDashboard";
import AllTeamShiftsList from "./AllTeamShiftsList";
import AllShiftChangeRequestsList from "./AllShiftChangeRequestsList";
import { Navigate } from "react-router-dom";
import ShiftChangeRequest from "./ShiftChangeRequest";
import TeamShift from "./TeamShift";
import MyShiftAssignment from "./MyShiftAssignment";
import { useShiftRouting } from "../../hooks/useShiftRouting";
import ShiftRequestList from "./MyShiftList";
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
  const { isDesktop } = useScreenSize();
  return isDesktop ? <AllMyShiftsList /> : <MyShiftAssignment />;
};

export const TeamShiftsListRoute = () => {
  useShiftRouting(); // Add the routing hook
  const { isDesktop } = useScreenSize();
  return isDesktop ? <AllTeamShiftsList /> : <TeamShift />;
};

export const ShiftChangeRequestsRoute = () => {
  useShiftRouting(); // Add the routing hook
  const { isDesktop } = useScreenSize();
  return isDesktop ? <AllShiftChangeRequestsList /> : <ShiftChangeRequest />;
};

export const MyShiftRequestsRoute = () => {
  useShiftRouting(); // Add the routing hook
  const { isDesktop } = useScreenSize();
  return isDesktop ? <AllMyShiftRequestsList /> : <ShiftRequestList />;
};
