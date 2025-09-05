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
import AttendanceLayout from "./components/Attendance/AttendanceLayout";
import AttendanceRequest from "./components/Attendance/AttendanceRequest/AttendanceRequest";
import EmployeeAttendance from "./components/Attendance/Employee/EmployeeAttendance";
import TeamAttendance from "./components/Attendance/Team/TeamAttendance";
import TeamAttendanceDetails from "./components/Attendance/TeamAttendanceDetails/TeamAttendanceDetails";
import SalarySlipApp from "./components/SalarySlip/SalarySlipApp";
import SalarySlipsList from "./components/SalarySlip/SalarySlipList";
import ShiftChangeForm from "./components/ShiftRequest/AddRequestForm";
import ShiftRequestList from "./components/ShiftRequest/MyShiftList";
import ShiftRequestApp from "./components/ShiftRequest/ShiftRequestApp";
import Policies from "./components/Policies";
import PoliciesEnforced from "./components/PoliciesEnforced";
import PolicySignOff from "./components/PolicySignOff";
import DailyAllowanceClaim from "./components/Expenses-App/DailyAllowanceClaim/DailyAllowanceClaim";
import { Navigate } from "react-router";
import CTCSalaryUI from "./components/SalarySlip/CTCSalaryBreakdown";
import PoliciesApp from "./components/Policies/PoliciesApp";
import PoliciesCategory from "./components/Policies/PoliciesCategory";
import PoliciesList from "./components/Policies/PoliciesList";
import ViewPolicy from "./components/Policies/ViewPolicy";
import ViewSalarySlipModal from "./components/SalarySlip/SalarySlipPDF";
import EmployeeAttendanceDetails from "./components/Attendance/Employee/EmployeeAttendanceDetails";
import HRPayroll from "./components/SalarySlip/HR-Payroll";
import AttendancePolicies from "./components/Attendance/AttendancePolicies/AttendancePolicies";
import TrackerApp from "./components/ApprovalTracker/TrackerApp";
import FlowRequests from "./components/ApprovalTracker/FlowRequests";
import InitiateFlow from "./components/ApprovalTracker/InitiateFlow";
import InitiateForm from "./components/ApprovalTracker/InitiateForm";
import FlowRequestDetails from "./components/ApprovalTracker/FlowRequestDetails";
import NotificationList from "./components/Notification/Notification";
import OrganizationalChart from "./components/OrganizationalChart/OrganizationalChart";
import { AllShiftsDashboardRoute, MyShiftsListRoute, TeamShiftsListRoute, ShiftChangeRequestsRoute } from "./components/ShiftRequest/ShiftDynamicRoute";

export interface AppRoute {
  index?: boolean;
  path: string;
  element: ReactElement;
  children?: AppRoute[];
}

export const routesConfig: AppRoute[] = [
  // notification page route
  { path: "/webapp/notification-log", element: <NotificationList /> },
  // Standalone Routes
  { path: "/webapp/search-members", element: <SearchMembers /> },

  { path: "/webapp/id-card", element: <IdCard /> },
  { path: "/webapp/id-card/:employeeId", element: <IdCard /> },
  { path: "/webapp/expenses", element: <Expenses /> },
  { path: "/webapp/policies", element: <Policies /> },
  { path: "/webapp/policies-enforced", element: <PoliciesEnforced /> },
  {
    path: "/webapp/policies-enforced/view/:policyId",
    element: <PolicySignOff />,
  },
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
    children: [
      { path: "salary-slip-list", element: <SalarySlipsList /> },
      { path: "ctc-salary-breakdown", element: <CTCSalaryUI /> },
      { path: "hr-payroll", element: <HRPayroll /> },
    ],
  },
  {
    path: "/webapp/salary-slip-app/salary-slip-list/:salaryId",
    element: <ViewSalarySlipModal />,
  },

  {
    path: "/webapp/shift-request",
    element: <ShiftRequestApp />,
    children: [
      { path: "all-shifts-dashboard", element: <AllShiftsDashboardRoute /> },
      { path: "my-shift-assignment", element: <MyShiftsListRoute /> },
      { path: "team-shift", element: <TeamShiftsListRoute /> },
      { path: "shift-change-request", element: <ShiftChangeRequestsRoute /> },
      { path: "shift-list", element: <ShiftRequestList /> },
    ],
  },

  {
    path: "/webapp/shift-request/shift-change-form",
    element: <ShiftChangeForm />,
  },

  {
    path: "/webapp/notices",
    element: <NoticesLayout />,
    children: [
      { path: "all", element: <NoticesTab tab="all" /> },
      { path: "unread", element: <NoticesTab tab="unread" /> },
      // { path: 'archived', element: <NoticesTab tab="archived" /> },
    ],
  },

  { path: "/webapp/notices/:id", element: <NoticeDetails /> },
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
  {
    path: "/webapp/attendance",
    element: <AttendanceLayout />,
    children: [
      {
        path: "",
        index: true,
        element: <Navigate to="summary" replace />,
      },
      { path: "summary", element: <AttendanceSummary /> },
      { path: "emp-attendance", element: <EmployeeAttendance /> },
      {
        path: "emp-attendance/all",
        element: <AllEmpAttendance />,
      },
      {
        path: "emp-attendance/details",
        element: <EmployeeAttendanceDetails />,
      },
      { path: "team-attendance", element: <TeamAttendance /> },
      { path: "attendance-request", element: <AttendanceRequest /> },
      { path: "team-attendance-requests", element: <TeamAttendanceDetails /> },
      {
        path: "team-attendance-requests/pendings",
        element: <AllPendingRequests />,
      },
      {
        path: "attendance-policies",
        element: <AttendancePolicies />,
      },
    ],
  },

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

  //Policies routes
  {
    path: "/webapp/policies-app",
    element: <PoliciesApp />,
    children: [
      { path: "", element: <PoliciesCategory /> },
      { path: "policies-list", element: <PoliciesList /> },
      { path: "view-policy/:policyName", element: <ViewPolicy /> },
    ],
  },
  //Approval tracker routes
  {
    path: "/webapp/tracker-app",
    element: <TrackerApp />,
    children: [
      { path: "", element: <FlowRequests /> },
      { path: "initiate", element: <InitiateFlow /> },
      { path: "initiate-form", element: <InitiateForm /> },
      {
        path: "details/:id",
        element: <FlowRequestDetails />,
      },
    ],
  },
  {
    path: "/webapp/organizational-chart",
    element: <OrganizationalChart />,
  },
];
