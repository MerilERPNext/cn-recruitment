/* eslint-disable @typescript-eslint/no-explicit-any */
import { ReactElement, Suspense } from "react";
import { Navigate } from "react-router";
import { useScreenSize } from "./hooks/useScreenSize";
import EmployeeErrorBoundary from "./components/EmployeeErrorBoundary";
import { lazyWithRetry } from "./utils/lazyWithRetry";

// Keep critical components as static imports for better UX
import SearchMembers from "./components/SearchMembers";
import IdCard from "./components/IdCard";
import NotificationList from "./components/Notification/Notification";
import AllAttendanceRequest from "./components/Attendance/AttendanceRequest/AllAttendanceRequests";

// Lazy load heavy components with retry mechanism
const Expenses = lazyWithRetry(
  () => import("./components/Expenses"),
  "Expenses"
);
const RecruitmentApp = lazyWithRetry(
  () => import("./components/RecruitmentApp"),
  "RecruitmentApp"
);
const MyProfile = lazyWithRetry(
  () => import("./components/MyProfile/MyProfile"),
  "MyProfile"
);
const InterviewPage = lazyWithRetry(
  () => import("./components/InterviewDetails"),
  "InterviewPage"
);
const InterviewList = lazyWithRetry(
  () => import("./components/interview"),
  "InterviewList"
);
const AddNewReferral = lazyWithRetry(
  () => import("./components/AddNewReferral"),
  "AddNewReferral"
);
const ReferralDetails = lazyWithRetry(
  () => import("./components/ReferralDetails"),
  "ReferralDetails"
);
const InterviewFeedbackForm = lazyWithRetry(
  () => import("./components/Feedback"),
  "InterviewFeedbackForm"
);
const AddRequisition = lazyWithRetry(
  () => import("./components/AddRequisition"),
  "AddRequisition"
);
const JobRequisition = lazyWithRetry(
  () => import("./components/JobRequisition"),
  "JobRequisition"
);
const RequisitionDetails = lazyWithRetry(
  () => import("./components/RequisitionDetails"),
  "RequisitionDetails"
);
const ReferralList = lazyWithRetry(
  () => import("./components/ReferralList"),
  "ReferralList"
);
const JobOpeningsUI = lazyWithRetry(
  () => import("./components/JobOpening/JobOpening"),
  "JobOpeningsUI"
);
const JobApplicantList = lazyWithRetry(
  () => import("./components/JobApplicantList"),
  "JobApplicantList"
);
const JobApplicantDetails = lazyWithRetry(
  () => import("./components/JobApplicantDetail"),
  "JobApplicantDetails"
);
const NoticesLayout = lazyWithRetry(
  () => import("./components/Notices/NoticesLayout"),
  "NoticesLayout"
);
const NoticesTab = lazyWithRetry(
  () => import("./components/Notices/NoticesTab"),
  "NoticesTab"
);
const NoticeDetails = lazyWithRetry(
  () => import("./components/Notices/NoticeDetails"),
  "NoticeDetails"
);
const ExpensesApp = lazyWithRetry(
  () => import("./components/Expenses-App/ExpensesApp"),
  "ExpensesApp"
);
const ExpensesList = lazyWithRetry(
  () => import("./components/Expenses-App/ExpensesList"),
  "ExpensesList"
);
const GeneralExpenseClaim = lazyWithRetry(
  () => import("./components/Expenses-App/GeneralExpenseClaim"),
  "GeneralExpenseClaim"
);
const MileageExpenseClaim = lazyWithRetry(
  () => import("./components/Expenses-App/MileageExpenseClaim"),
  "MileageExpenseClaim"
);
const NewExpenseType = lazyWithRetry(
  () => import("./components/Expenses-App/NewExpenseType"),
  "NewExpenseType"
);
const Holidays = lazyWithRetry(
  () => import("./components/Leaves/Holidays"),
  "Holidays"
);
const HolidaysFull = lazyWithRetry(
  () => import("./components/Leaves/HolidaysFull"),
  "HolidaysFull"
);
const LeaveApp = lazyWithRetry(
  () => import("./components/Leaves/LeaveApp"),
  "LeaveApp"
);
const LeaveBalance = lazyWithRetry(
  () => import("./components/Leaves/LeaveBalance"),
  "LeaveBalance"
);
const LeaveRequestApp = lazyWithRetry(
  () => import("./components/Leaves/LeaveRequestApp"),
  "LeaveRequestApp"
);
const MyLeaveRequest = lazyWithRetry(
  () => import("./components/Leaves/MyLeaveRequest"),
  "MyLeaveRequest"
);
const TeamLeaveRequest = lazyWithRetry(
  () => import("./components/Leaves/TeamLeaveRequest"),
  "TeamLeaveRequest"
);
const AllPendingRequests = lazyWithRetry(
  () =>
    import("./components/Attendance/TeamAttendanceDetails/AllPendingRequests"),
  "AllPendingRequests"
);
const AttendanceSummary = lazyWithRetry(
  () => import("./components/Attendance/AttendanceSummary"),
  "AttendanceSummary"
);
const AllEmpAttendance = lazyWithRetry(
  () => import("./components/Attendance/AllEmpAttendance/AllEmpAttendance"),
  "AllEmpAttendance"
);
const AttendanceLayout = lazyWithRetry(
  () => import("./components/Attendance/AttendanceLayout"),
  "AttendanceLayout"
);
const AttendanceRequest = lazyWithRetry(
  () => import("./components/Attendance/AttendanceRequest/AttendanceRequest"),
  "AttendanceRequest"
);
const EmployeeAttendance = lazyWithRetry(
  () => import("./components/Attendance/Employee/EmployeeAttendance"),
  "EmployeeAttendance"
);
const TeamAttendance = lazyWithRetry(
  () => import("./components/Attendance/Team/TeamAttendance"),
  "TeamAttendance"
);
const TeamAttendanceDetails = lazyWithRetry(
  () =>
    import(
      "./components/Attendance/TeamAttendanceDetails/TeamAttendanceDetails"
    ),
  "TeamAttendanceDetails"
);
const SalarySlipApp = lazyWithRetry(
  () => import("./components/SalarySlip/SalarySlipApp"),
  "SalarySlipApp"
);
const SalarySlipsList = lazyWithRetry(
  () => import("./components/SalarySlip/SalarySlipList"),
  "SalarySlipsList"
);
const ShiftChangeForm = lazyWithRetry(
  () => import("./components/ShiftRequest/AddRequestForm"),
  "ShiftChangeForm"
);
// const ShiftRequestList = lazyWithRetry(
//   () => import("./components/ShiftRequest/MyShiftList"),
//   "ShiftRequestList"
// );
const ShiftRequestApp = lazyWithRetry(
  () => import("./components/ShiftRequest/ShiftRequestApp"),
  "ShiftRequestApp"
);
const Policies = lazyWithRetry(
  () => import("./components/Policies"),
  "Policies"
);
const PoliciesEnforced = lazyWithRetry(
  () => import("./components/PoliciesEnforced"),
  "PoliciesEnforced"
);
const PolicySignOff = lazyWithRetry(
  () => import("./components/PolicySignOff"),
  "PolicySignOff"
);
const DailyAllowanceClaim = lazyWithRetry(
  () =>
    import("./components/Expenses-App/DailyAllowanceClaim/DailyAllowanceClaim"),
  "DailyAllowanceClaim"
);
const CTCSalaryUI = lazyWithRetry(
  () => import("./components/SalarySlip/CTCSalaryBreakdown"),
  "CTCSalaryUI"
);
const PoliciesApp = lazyWithRetry(
  () => import("./components/Policies/PoliciesApp"),
  "PoliciesApp"
);
const PoliciesCategory = lazyWithRetry(
  () => import("./components/Policies/PoliciesCategory"),
  "PoliciesCategory"
);
const PoliciesList = lazyWithRetry(
  () => import("./components/Policies/PoliciesList"),
  "PoliciesList"
);
const ViewPolicy = lazyWithRetry(
  () => import("./components/Policies/ViewPolicy"),
  "ViewPolicy"
);
const ViewSalarySlipModal = lazyWithRetry(
  () => import("./components/SalarySlip/SalarySlipPDF"),
  "ViewSalarySlipModal"
);

const HRPayroll = lazyWithRetry(
  () => import("./components/SalarySlip/HR-Payroll"),
  "HRPayroll"
);
const AttendancePolicies = lazyWithRetry(
  () => import("./components/Attendance/AttendancePolicies/AttendancePolicies"),
  "AttendancePolicies"
);
const TrackerApp = lazyWithRetry(
  () => import("./components/ApprovalTracker/TrackerApp"),
  "TrackerApp"
);
const FlowRequests = lazyWithRetry(
  () => import("./components/ApprovalTracker/FlowRequests"),
  "FlowRequests"
);
const InitiateFlow = lazyWithRetry(
  () => import("./components/ApprovalTracker/InitiateFlow"),
  "InitiateFlow"
);
const InitiateForm = lazyWithRetry(
  () => import("./components/ApprovalTracker/InitiateForm"),
  "InitiateForm"
);
const FlowRequestDetails = lazyWithRetry(
  () => import("./components/ApprovalTracker/FlowRequestDetails"),
  "FlowRequestDetails"
);
const AllShiftsDashboardRoute = lazyWithRetry(
  () =>
    import("./components/ShiftRequest/ShiftDynamicRoute").then((module) => ({
      default: module.AllShiftsDashboardRoute,
    })),
  "AllShiftsDashboardRoute"
);
const MyShiftsListRoute = lazyWithRetry(
  () =>
    import("./components/ShiftRequest/ShiftDynamicRoute").then((module) => ({
      default: module.MyShiftsListRoute,
    })),
  "MyShiftsListRoute"
);
const TeamShiftsListRoute = lazyWithRetry(
  () =>
    import("./components/ShiftRequest/ShiftDynamicRoute").then((module) => ({
      default: module.TeamShiftsListRoute,
    })),
  "TeamShiftsListRoute"
);
const ShiftChangeRequestsRoute = lazyWithRetry(
  () =>
    import("./components/ShiftRequest/ShiftDynamicRoute").then((module) => ({
      default: module.ShiftChangeRequestsRoute,
    })),
  "ShiftChangeRequestsRoute"
);
const MyShiftRequestsRoute = lazyWithRetry(
  () =>
    import("./components/ShiftRequest/ShiftDynamicRoute").then((module) => ({
      default: module.MyShiftRequestsRoute,
    })),
  "MyShiftRequestsRoute"
);
const PendingTeamLeaves = lazyWithRetry(
  () => import("./components/Leaves/PendingTeamLeaves"),
  "PendingTeamLeaves"
);
const LoansPage = lazyWithRetry(
  () => import("./components/SalarySlip/Loan/LoanMain"),
  "LoansPage"
);
const OvertimeRequests = lazyWithRetry(
  () => import("./components/Attendance/OvertimeRequests/OvertimeRequests"),
  "OvertimeRequests"
);
const AllOvertimePendingRequests = lazyWithRetry(
  () =>
    import(
      "./components/Attendance/OvertimeRequests/AllOvertimePendingRequests"
    ),
  "AllOvertimePendingRequests"
);
const LoanMainComponent = lazyWithRetry(
  () => import("./components/SalarySlip/Loan/component/DetailsPageForMobile"),
  "LoanMainComponent"
);
const OrganizationChart = lazyWithRetry(
  () => import("./components/ORGChart/OrganizationChart"),
  "OrganizationChart"
);
const OrganizationCharttooo = lazyWithRetry(
  () => import("./components/ORGChart/OrgnazationChartForTwoLavel"),
  "OrganizationCharttooo"
);
const AdvancesList = lazyWithRetry(
  () => import("./components/SalarySlip/Advances/AdvancesList"),
  "AdvancesList"
);

const CompensatoryRequest = lazyWithRetry(
  () => import("./components/Leaves/compensatory/CompensatoryRequest"),
  "CompensatoryRequest"
);

// Loading component for Suspense fallbacks
// eslint-disable-next-line react-refresh/only-export-components
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600 text-sm">Loading...</p>
    </div>
  </div>
);

// HOC to wrap components with Suspense and Error Boundary
const withLazyLoading = (
  Component: React.ComponentType,
  fallback = <LoadingSpinner />
) => {
  return (props: any) => (
    <EmployeeErrorBoundary>
      <Suspense fallback={fallback}>
        <Component {...props} />
      </Suspense>
    </EmployeeErrorBoundary>
  );
};

export interface AppRoute {
  index?: boolean;
  path: string;
  element: ReactElement;
  children?: AppRoute[];
}

// eslint-disable-next-line react-refresh/only-export-components
const ShiftRequestDefaultRoute = () => {
  const { isDesktop } = useScreenSize();

  if (isDesktop) {
    return <Navigate to="/webapp/attendance/all-shifts-dashboard" replace />;
  } else {
    return <Navigate to="/webapp/shift-request/my-shift-assignment" replace />;
  }
};

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
      { path: "loan", element: <LoansPage /> },
      { path: "details-page-mobile", element: <LoanMainComponent /> }, // Nested route
      { path: "advances-list", element: <AdvancesList /> },
    ],
  },
  {
    path: "/webapp/salary-slip-app/salary-slip-list/:salaryId",
    element: <ViewSalarySlipModal />,
  },
  {
    path: "/webapp/salary-slip-app/loan/:loanId",
    element: <LoanMainComponent />,
  },

  {
    path: "/webapp/shift-request",
    element: <ShiftRequestApp />,
    children: [
      {
        path: "",
        index: true,
        element: <ShiftRequestDefaultRoute />,
      },
      { path: "all-shifts-dashboard", element: <AllShiftsDashboardRoute /> },
      { path: "my-shift-assignment", element: <MyShiftsListRoute /> },
      { path: "team-shift", element: <TeamShiftsListRoute /> },
      { path: "shift-change-request", element: <ShiftChangeRequestsRoute /> },
      { path: "shift-list", element: <MyShiftRequestsRoute /> },
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
      { path: "team-attendance", element: <TeamAttendance /> },
      { path: "attendance-request", element: <AttendanceRequest /> },
      {
        path: "attendance-request/pendings",
        element: <AllAttendanceRequest />,
      },
      {
        path: "attendance-request/actioned",
        element: <AllAttendanceRequest />,
      },
      { path: "team-attendance-requests", element: <TeamAttendanceDetails /> },
      { path: "planned-overtime-requests", element: <OvertimeRequests /> },

      {
        path: "team-attendance-requests/pendings",
        element: <AllPendingRequests />,
      },
      {
        path: "planned-overtime-requests/pendings",
        element: <AllOvertimePendingRequests />,
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

      {
        path: "leave-requests/pending",
        element: <PendingTeamLeaves />,
      },
      {
        path: "compensatory-request",
        element: <CompensatoryRequest />,
      },
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
    element: <OrganizationChart />,
  },
  {
    path: "/webapp/organizational-chart-two-level",
    element: <OrganizationCharttooo />,
  },
];

// Export lazy loading utility for potential use elsewhere
export { withLazyLoading };
