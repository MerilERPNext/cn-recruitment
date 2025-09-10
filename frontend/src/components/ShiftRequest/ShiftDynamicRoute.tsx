import AllMyShiftsList from "./AllMyShiftsList";
import AllShiftsDashboard from "./AllShiftsDashboard";
import AllTeamShiftsList from "./AllTeamShiftsList";
import AllShiftChangeRequestsList from "./AllShiftChangeRequestsList";
import { Navigate } from "react-router-dom";
import ShiftChangeRequest from "./ShiftChangeRequest";
import TeamShift from "./TeamShift";
import MyShiftAssignment from "./MyShiftAssignment";
import { useShiftRouting } from "../../hooks/useShiftRouting";

export const AllShiftsDashboardRoute = () => {
  const { isDesktop } = useShiftRouting();
  return isDesktop ? <AllShiftsDashboard /> : <Navigate to="/webapp/shift-request/my-shift-assignment" replace />;
};

export const MyShiftsListRoute = () => {
  const { isDesktop } = useShiftRouting();
  return isDesktop ? <AllMyShiftsList /> : <MyShiftAssignment />;
};

export const TeamShiftsListRoute = () => {
  const { isDesktop } = useShiftRouting();
  return isDesktop ? <AllTeamShiftsList /> : <TeamShift />;
};

export const ShiftChangeRequestsRoute = () => {
  const { isDesktop } = useShiftRouting();
  return isDesktop ? <AllShiftChangeRequestsList /> : <ShiftChangeRequest />;
};