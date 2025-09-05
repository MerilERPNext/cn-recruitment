import { useScreenSize } from "../../hooks/useScreenSize";
import AllMyShiftsList from "./AllMyShiftsList";
import AllShiftsDashboard from "./AllShiftsDashboard";
import AllTeamShiftsList from "./AllTeamShiftsList";
import AllShiftChangeRequestsList from "./AllShiftChangeRequestsList";
import { Navigate } from "react-router-dom";
import ShiftChangeRequest from "./ShiftChangeRequest";
import TeamShift from "./TeamShift";
import MyShiftAssignment from "./MyShiftAssignment";

export const AllShiftsDashboardRoute = () => {
  const { isDesktop } = useScreenSize();
  return isDesktop ? <AllShiftsDashboard /> : <Navigate to="/webapp/shift-request" />;
};

export const MyShiftsListRoute = () => {
  const { isDesktop } = useScreenSize();
  return isDesktop ? <AllMyShiftsList /> : <MyShiftAssignment />;
};

export const TeamShiftsListRoute = () => {
  const { isDesktop } = useScreenSize();
  return isDesktop ? <AllTeamShiftsList /> : <TeamShift />;
};

export const ShiftChangeRequestsRoute = () => {
  const { isDesktop } = useScreenSize();
  return isDesktop ? <AllShiftChangeRequestsList /> : <ShiftChangeRequest />;
};