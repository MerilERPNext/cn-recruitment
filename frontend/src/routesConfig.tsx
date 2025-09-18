/* eslint-disable @typescript-eslint/no-explicit-any */
import { ReactElement, lazy, Suspense } from "react";
import { Navigate } from "react-router";
import { useScreenSize } from "./hooks/useScreenSize";
import EmployeeErrorBoundary from "./components/EmployeeErrorBoundary";

// Keep critical components as static imports for better UX
import SearchMembers from "./components/SearchMembers";
import IdCard from "./components/IdCard";
import NotificationList from "./components/Notification/Notification";

// Lazy load heavy components
const Expenses = lazy(() => import("./components/Expenses"));
const RecruitmentApp = lazy(() => import("./components/RecruitmentApp"));
const MyProfile = lazy(() => import("./components/MyProfile/MyProfile"));
const InterviewPage = lazy(() => import("./components/InterviewDetails"));
const InterviewList = lazy(() => import("./components/interview"));
const AddNewReferral = lazy(() => import("./components/AddNewReferral"));
const ReferralDetails = lazy(() => import("./components/ReferralDetails"));
const InterviewFeedbackForm = lazy(() => import("./components/Feedback"));
const AddRequisition = lazy(() => import("./components/AddRequisition"));
const JobRequisition = lazy(() => import("./components/JobRequisition"));
const RequisitionDetails = lazy(
  () => import("./components/RequisitionDetails")
);
const ReferralList = lazy(() => import("./components/ReferralList"));
const JobOpeningsUI = lazy(() => import("./components/JobOpening/JobOpening"));
const JobApplicantList = lazy(() => import("./components/JobApplicantList"));
const JobApplicantDetails = lazy(
  () => import("./components/JobApplicantDetail")
);
const NoticesLayout = lazy(() => import("./components/Notices/NoticesLayout"));
const NoticesTab = lazy(() => import("./components/Notices/NoticesTab"));
const NoticeDetails = lazy(() => import("./components/Notices/NoticeDetails"));
const ExpensesApp = lazy(() => import("./components/Expenses-App/ExpensesApp"));
const ExpensesList = lazy(
  () => import("./components/Expenses-App/ExpensesList")
);
const GeneralExpenseClaim = lazy(
  () => import("./components/Expenses-App/GeneralExpenseClaim")
);
const MileageExpenseClaim = lazy(
  () => import("./components/Expenses-App/MileageExpenseClaim")
);
const NewExpenseType = lazy(
  () => import("./components/Expenses-App/NewExpenseType")
);
const Holidays = lazy(() => import("./components/Leaves/Holidays"));
const HolidaysFull = lazy(() => import("./components/Leaves/HolidaysFull"));
const LeaveApp = lazy(() => import("./components/Leaves/LeaveApp"));
const LeaveBalance = lazy(() => import("./components/Leaves/LeaveBalance"));
const LeaveRequestApp = lazy(
  () => import("./components/Leaves/LeaveRequestApp")
);
const MyLeaveRequest = lazy(() => import("./components/Leaves/MyLeaveRequest"));
const TeamLeaveRequest = lazy(
  () => import("./components/Leaves/TeamLeaveRequest")
);
const AllPendingRequests = lazy(
  () =>
    import("./components/Attendance/TeamAttendanceDetails/AllPendingRequests")
);
const AttendanceSummary = lazy(
  () => import("./components/Attendance/AttendanceSummary")
);
const AllEmpAttendance = lazy(
  () => import("./components/Attendance/AllEmpAttendance/AllEmpAttendance")
);
const AttendanceLayout = lazy(
  () => import("./components/Attendance/AttendanceLayout")
);
const AttendanceRequest = lazy(
  () => import("./components/Attendance/AttendanceRequest/AttendanceRequest")
);
const EmployeeAttendance = lazy(
  () => import("./components/Attendance/Employee/EmployeeAttendance")
);
const TeamAttendance = lazy(
  () => import("./components/Attendance/Team/TeamAttendance")
);
const TeamAttendanceDetails = lazy(
  () =>
    import(
      "./components/Attendance/TeamAttendanceDetails/TeamAttendanceDetails"
    )
);
const SalarySlipApp = lazy(
  () => import("./components/SalarySlip/SalarySlipApp")
);
const SalarySlipsList = lazy(
  () => import("./components/SalarySlip/SalarySlipList")
);
const ShiftChangeForm = lazy(
  () => import("./components/ShiftRequest/AddRequestForm")
);
const ShiftRequestList = lazy(
  () => import("./components/ShiftRequest/MyShiftList")
);
const ShiftRequestApp = lazy(
  () => import("./components/ShiftRequest/ShiftRequestApp")
);
const Policies = lazy(() => import("./components/Policies"));
const PoliciesEnforced = lazy(() => import("./components/PoliciesEnforced"));
const PolicySignOff = lazy(() => import("./components/PolicySignOff"));
const DailyAllowanceClaim = lazy(
  () =>
    import("./components/Expenses-App/DailyAllowanceClaim/DailyAllowanceClaim")
);
const CTCSalaryUI = lazy(
  () => import("./components/SalarySlip/CTCSalaryBreakdown")
);
const PoliciesApp = lazy(() => import("./components/Policies/PoliciesApp"));
const PoliciesCategory = lazy(
  () => import("./components/Policies/PoliciesCategory")
);
const PoliciesList = lazy(() => import("./components/Policies/PoliciesList"));
const ViewPolicy = lazy(() => import("./components/Policies/ViewPolicy"));
const ViewSalarySlipModal = lazy(
  () => import("./components/SalarySlip/SalarySlipPDF")
);

const HRPayroll = lazy(() => import("./components/SalarySlip/HR-Payroll"));
const AttendancePolicies = lazy(
  () => import("./components/Attendance/AttendancePolicies/AttendancePolicies")
);
const TrackerApp = lazy(
  () => import("./components/ApprovalTracker/TrackerApp")
);
const FlowRequests = lazy(
  () => import("./components/ApprovalTracker/FlowRequests")
);
const InitiateFlow = lazy(
  () => import("./components/ApprovalTracker/InitiateFlow")
);
const InitiateForm = lazy(
  () => import("./components/ApprovalTracker/InitiateForm")
);
const FlowRequestDetails = lazy(
  () => import("./components/ApprovalTracker/FlowRequestDetails")
);
const AllShiftsDashboardRoute = lazy(() =>
  import("./components/ShiftRequest/ShiftDynamicRoute").then((module) => ({
    default: module.AllShiftsDashboardRoute,
  }))
);
const MyShiftsListRoute = lazy(() =>
  import("./components/ShiftRequest/ShiftDynamicRoute").then((module) => ({
    default: module.MyShiftsListRoute,
  }))
);
const TeamShiftsListRoute = lazy(() =>
  import("./components/ShiftRequest/ShiftDynamicRoute").then((module) => ({
    default: module.TeamShiftsListRoute,
  }))
);
const ShiftChangeRequestsRoute = lazy(() =>
  import("./components/ShiftRequest/ShiftDynamicRoute").then((module) => ({
    default: module.ShiftChangeRequestsRoute,
  }))
);
const PendingTeamLeaves = lazy(
  () => import("./components/Leaves/PendingTeamLeaves")
);
const LoansPage = lazy(() => import("./components/SalarySlip/Loan/LoanMain"));
const OvertimeRequests = lazy(
  () => import("./components/Attendance/OvertimeRequests/OvertimeRequests")
);
const AllOvertimePendingRequests = lazy(
  () =>
    import(
      "./components/Attendance/OvertimeRequests/AllOvertimePendingRequests"
    )
);
const LoanMainComponent = lazy(
  () => import("./components/SalarySlip/Loan/component/DetailsPageForMobile")
);
const OrganizationChart = lazy(
  () => import("./components/ORGChart/OrganizationChart")
);
const OrganizationCharttooo = lazy(
  () => import("./components/ORGChart/OrgnazationChartForTwoLavel")
);
const AdvancesList = lazy(
  () => import("./components/SalarySlip/Advances/AdvancesList")
);

const CompensatoryRequest = lazy(
  () => import("./components/Leaves/compensatory/CompensatoryRequest")
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
      { path: "team-attendance", element: <TeamAttendance /> },
      { path: "attendance-request", element: <AttendanceRequest /> },
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
