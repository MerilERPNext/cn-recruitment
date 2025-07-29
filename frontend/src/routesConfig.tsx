import { ReactElement } from "react";
import SearchMembers from "./components/SearchMembers";
import IdCard from "./components/IdCard";
import Expenses from "./components/Expenses";
import RecruitmentApp from "./components/RecruitmentApp";
import MyProfile from "./components/MyProfile/MyProfile";
import InterviewPage from "./components/InterviewDetails";
import InterviewList from "./components/interview";
import AddNewReferral from "./components/AddNewReferral";
import ReferralDetails from "./components/ReferralDetails";
import InterviewFeedbackForm from "./components/Feedback";
import AddRequisition from "./components/AddRequisition";
import JobRequisition from "./components/JobRequisition";
import RequisitionDetails from "./components/RequisitionDetails";
import ReferralList from "./components/ReferralList";
import JobOpeningsUI from "./components/JobOpening/JobOpening";
import JobApplicantList from "./components/JobApplicantList";
import JobApplicantDetails from "./components/JobApplicantDetail";
import NoticesLayout from "./components/Notices/NoticesLayout";
import NoticesTab from "./components/Notices/NoticesTab";
import NoticeDetails from "./components/Notices/NoticeDetails";
import ExpensesApp from "./components/Expenses-App/ExpensesApp";
import ExpensesList from "./components/Expenses-App/ExpensesList";
import GeneralExpenseClaim from "./components/Expenses-App/GeneralExpenseClaim";
import MileageExpenseClaim from "./components/Expenses-App/MileageExpenseClaim";
import NewExpenseType from "./components/Expenses-App/NewExpenseType";
import Holidays from "./components/Leaves/Holidays";
import HolidaysFull from "./components/Leaves/HolidaysFull";
import LeaveApp from "./components/Leaves/LeaveApp";
import LeaveBalance from "./components/Leaves/LeaveBalance";
import LeaveRequestApp from "./components/Leaves/LeaveRequestApp";
import MyLeaveRequest from "./components/Leaves/MyLeaveRequest";
import TeamLeaveRequest from "./components/Leaves/TeamLeaveRequest";
import AllPendingRequests from "./components/Attendance/TeamAttendanceDetails/AllPendingRequests";
import AttendanceSummary from "./components/Attendance/AttendanceSummary";
import AllEmpAttendance from "./components/Attendance/AllEmpAttendance/AllEmpAttendance";
// import { Navigate } from "react-router";
// import AttendanceLayout from "./components/Attendance/AttendanceLayout";
import AttendanceRequest from "./components/Attendance/AttendanceRequest/AttendanceRequest";
import EmployeeAttendance from "./components/Attendance/Employee/EmployeeAttendance";
import TeamAttendance from "./components/Attendance/Team/TeamAttendance";
import TeamAttendanceDetails from "./components/Attendance/TeamAttendanceDetails/TeamAttendanceDetails";
import SalarySlipApp from "./components/SalarySlip/SalarySlipApp";
import SalarySlipsList from "./components/SalarySlip/SalarySlipList";
import ShiftChangeForm from "./components/ShiftRequest/AddRequestForm";
import MyShiftAssignment from "./components/ShiftRequest/MyShiftAssignment";
import ShiftRequestList from "./components/ShiftRequest/MyShiftList";
import ShiftChangeRequest from "./components/ShiftRequest/ShiftChangeRequest";
import ShiftRequestApp from "./components/ShiftRequest/ShiftRequestApp";
import TeamShift from "./components/ShiftRequest/TeamShift";
import SalarySlipDetails from "./components/SalarySlip/SalaryDetails";
import Policies from "./components/Policies";
import DailyAllowanceClaim from "./components/Expenses-App/DailyAllowanceClaim/DailyAllowanceClaim";
import CTCSalaryUI from "./components/SalarySlip/CTCSalaryBreakdown";

export interface AppRoute {
  index?: boolean;
  path: string;
  element: ReactElement;
  children?: AppRoute[];
}

export const routesConfig: AppRoute[] = [
  // Standalone Routes
  { path: "/webapp/search-members", element: <SearchMembers /> },

  { path: "/webapp/id-card", element: <IdCard /> },
  { path: "/webapp/id-card/:employeeId", element: <IdCard /> },
  { path: "/webapp/expenses", element: <Expenses /> },
  { path: "/webapp/policies", element: <Policies /> },
  {
    path: "/webapp/recruitment-app/job-applicant-detail/:id",
    element: <JobApplicantDetails />,
  },

  // Nested Recruitment App Routes
  {
    path: "/webapp/recruitment-app",
    element: <RecruitmentApp />,
    children: [
      { path: "requisitions", element: <JobRequisition /> },
      { path: "referrals", element: <ReferralList /> },
      { path: "interviews", element: <InterviewList /> },
      { path: "job-openings", element: <JobOpeningsUI /> },
      { path: "job-applicant-list", element: <JobApplicantList /> },
    ],
  },
  //salary slip route
  {
    path: "/webapp/salary-slip-app",
    element: <SalarySlipApp />,
    children: [{ path: "salary-slip-list", element: <SalarySlipsList /> },
      {path: "ctc-salary-breakdown", element: <CTCSalaryUI />},
    ],
  },
  {
    path: "/webapp/salary-slip-app/salary-slip-list/:salaryId",
    element: <SalarySlipDetails />,
  },

  {
    path: "/webapp/shift-request",
    element: <ShiftRequestApp />,
    children: [
      { path: "my-shift-assignment", element: <MyShiftAssignment /> },
      { path: "team-shift", element: <TeamShift /> },
      { path: "shift-list", element: <ShiftRequestList /> },
      { path: "shift-change-request", element: <ShiftChangeRequest /> },
    ],
  },

  {
    path: "/webapp/shift-request/shift-change-form",
    element: <ShiftChangeForm />,
  },

  {
    path: '/webapp/notices',
    element: <NoticesLayout />,
    children: [
      { path: 'all', element: <NoticesTab tab="all" /> },
      { path: 'unread', element: <NoticesTab tab="unread" /> },
      // { path: 'archived', element: <NoticesTab tab="archived" /> },
    ],
  },

  { path: '/webapp/notices/:id', element: <NoticeDetails /> },
  {
    path: "/webapp/my-profile",
    element: <MyProfile />,
  },

  // Nested Expenses App Routes
  {
    path: "/webapp/expenses-app",
    element: <ExpensesApp />,
    children: [{ path: "expenses-list", element: <ExpensesList /> }],
  },

  // Flat Recruitment Routes
  {
    path: "/webapp/recruitment-app/referrals/add-new-referral",
    element: <AddNewReferral />,
  },
  {
    path: "/webapp/recruitment-app/referrals/:id",
    element: <ReferralDetails />,
  },
  {
    path: "/webapp/recruitment-app/requisitions/:requisitionId",
    element: <RequisitionDetails />,
  },
  {
    path: "/webapp/recruitment-app/interviews/:id",
    element: <InterviewPage />,
  },
  {
    path: "/webapp/recruitment-app/interviews/interview-feedback/:id",
    element: <InterviewFeedbackForm />,
  },
  {
    path: "/webapp/recruitment-app/requisitions/add-requisition/*",
    element: <AddRequisition />,
  },

  // {
  //   path: "/webapp/attendance",
  //   element: <AttendanceLayout />,
  //   children: [

  //   ],
  // },
  { path: '/webapp/attendance', element: <AttendanceSummary /> },
  { path: '/webapp/attendance/emp-attendance', element: <EmployeeAttendance /> },
  { path: '/webapp/attendance/team-attendance', element: <TeamAttendance /> },
  { path: '/webapp/attendance/attendance-request', element: <AttendanceRequest /> },
  { path: '/webapp/attendance/team-attendance-details', element: <TeamAttendanceDetails /> },
  { path: '/webapp/attendance/team-attendance-details/pendings', element: <AllPendingRequests /> },
  { path: '/webapp/attendance/emp-attendance/all', element: <AllEmpAttendance /> },
  //Leaves routes
  {
    path: "/webapp/leave-app",
    element: <LeaveApp />,
    children: [
      { path: "leaves/leave-balance", element: <LeaveBalance /> },
      {
        path: "leaves/leave-requests",
        element: <LeaveRequestApp />,
        children: [
          { path: "my", element: <MyLeaveRequest /> },
          { path: "team", element: <TeamLeaveRequest /> },
        ],
      },
      { path: "leaves/holidays", element: <Holidays /> },
      { path: "leaves/holidays/all", element: <HolidaysFull /> },
    ],
  },
  {
    path: "/webapp/expenses-app/expenses-list/new-expense-type",
    element: <NewExpenseType />,
  },
  // New route for General Expense Claim
  {
    path: "/webapp/expenses-app/general-expense-claim",
    element: <GeneralExpenseClaim />,
  },
  // New route for Daily Allowance Claim
  {
    path: "/webapp/expenses-app/daily-allowance-claim",
    element: <DailyAllowanceClaim />,
  },
  // New route for Mileage Expense Claim
  {
    path: "/webapp/expenses-app/mileage-expense-claim",
    element: <MileageExpenseClaim />,
  },
];
