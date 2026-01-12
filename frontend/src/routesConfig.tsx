/* eslint-disable @typescript-eslint/no-explicit-any */
import { ReactElement, Suspense } from "react";
import { Navigate } from "react-router";
import { useScreenSize } from "./hooks/useScreenSize";
import EmployeeErrorBoundary from "./components/EmployeeErrorBoundary";
import { lazyWithRetry } from "./utils/lazyWithRetry";
import { useLocation } from "react-router-dom";

// Keep critical components as static imports for better UX
import SearchMembers from "./components/SearchMembers";
import IdCard from "./components/IdCard";
import NotificationList from "./components/Notification/Notification";
import EmployeeProfile from "./components/EmployeeProfile/EmployeeProfile";
import PasswordReset from "./components/ResetPassword/ResetPassword";
import AddExpenseForm from "./components/Expenses-App/ExpenseClaim/AddExpenseForm";
import SharedExpenses from "./components/Expenses-App/ExpenseClaim/SharedExpenses";
import ExtraPayment from "./components/Compansation/Extrapayment/ExtraPayment";
import IncomeTaxSheet from "./components/Compansation/TaxSheet/TaxSheet";
import ITDeclarationForm from "./components/Compansation/IT Declaration/ITDeclaration";
import TeamLoanRequest from "./components/Compansation/Loan/TeamLoan/TeamLoanRequest";
import TeamAdvanceRequest from "./components/Compansation/Advances/ApprovalAdvanceRquest";
import Requests from "./components/Requests";
import Perquisite from "./components/Compansation/Perquisite/Perquisite";

// Lazy load heavy components with retry mechanism
const Expenses = lazyWithRetry(
  () => import("./components/Expenses"),
  "Expenses"
);
const RecruitmentApp = lazyWithRetry(
  () => import("./components/RecruitmentApp"),
  "RecruitmentApp"
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
  () => import("./components/Expenses-App/ExpenseClaim/ExpensesList"),
  "ExpensesList"
);
const TeamExpense = lazyWithRetry(
  () => import("./components/Expenses-App/ExpenseClaim/TeamExpense"),
  "TeamExpense"
);
const MyAdvanceExpenseList = lazyWithRetry(
  () => import("./components/Expenses-App/ExpenseAdvance/MyAdvanceExpenseList"),
  "MyAdvanceExpenseList"
);
const TeamAdvanceExpenseList = lazyWithRetry(
  () =>
    import("./components/Expenses-App/ExpenseAdvance/TeamAdvanceExpenseList"),
  "TeamAdvanceExpenseList"
);
const ExpenseAdvanceForm = lazyWithRetry(
  () => import("./components/Expenses-App/ExpenseAdvance/ExpenseAdvanceForm"),
  "ExpenseAdvanceForm"
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
  () => import("./components/Compansation/SalarySlipApp"),
  "SalarySlipApp"
);
const SalarySlipsList = lazyWithRetry(
  () => import("./components/Compansation/SalarySlipList"),
  "SalarySlipsList"
);
const ShiftChangeForm = lazyWithRetry(
  () => import("./components/ShiftRequest/AddRequestForm"),
  "ShiftChangeForm"
);
const ShiftReqeustEditForm = lazyWithRetry(
  () => import("./components/ShiftRequest/EditRequestForm"),
  "ShiftReqeustEditForm"
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
const CTCSalaryUI = lazyWithRetry(
  () => import("./components/Compansation/CTCSalaryBreakdown"),
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
  () => import("./components/Compansation/SalarySlipPDF"),
  "ViewSalarySlipModal"
);

const HRPayroll = lazyWithRetry(
  () => import("./components/Compansation/HR-Payroll"),
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
const LoansPage = lazyWithRetry(
  () => import("./components/Compansation/Loan/LoanMain"),
  "LoansPage"
);
const MyOvertimeRequests = lazyWithRetry(
  () => import("./components/Attendance/OvertimeRequests/MyOvertimeRequests"),
  "OvertimeRequests"
);
const TeamOvertimeRequests = lazyWithRetry(
  () => import("./components/Attendance/OvertimeRequests/TeamOvertimeRequests"),
  "OvertimeRequests"
);
const LoanMainComponent = lazyWithRetry(
  () => import("./components/Compansation/Loan/component/DetailsPageForMobile"),
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
  () => import("./components/Compansation/Advances/AdvancesList"),
  "AdvancesList"
);

const PayPackage = lazyWithRetry(
  () => import("./components/Compansation/Paypackage/PayPackage"),
  "PayPackage"
);

const CompensatoryRequest = lazyWithRetry(
  () => import("./components/Leaves/compensatory/CompensatoryRequest"),
  "CompensatoryRequest"
);

const FlowApp = lazyWithRetry(
  () => import("./components/Flows/FlowApp"),
  "FlowApp"
);

const FlowRequests2 = lazyWithRetry(
  () => import("./components/Flows/FlowRequests/FlowRequests"),
  "FlowRequests2"
);

const Separation = lazyWithRetry(
  () => import("./components/Flows/Separation/Separation"),
  "Separation"
);

const SeparationWorkflow = lazyWithRetry(
  () => import("./components/Flows/SeparationWorkflow/SeparationWorkflow"),
  "SeparationWorkflow"
);



const Confirmation = lazyWithRetry(
  () => import("./components/Flows/Confirmation/Confirmation"),
  "Confirmation"
);

const InitiateFlow2 = lazyWithRetry(
  () => import("./components/Flows/Initiate/InitiateFlow"),
  "InitiateFlow2"
);

const RequestDetails = lazyWithRetry(
  () => import("./components/Flows/RequestDetails/RequestDetails"),
  "RequestDetails"
);

const PerformanceApp = lazyWithRetry(
  () => import("./components/Performance/PerformanceApp"),
  "PerFormanceApp"
);

const Overview = lazyWithRetry(
  () => import("./components/Performance/Overview/Overview"),
  "Overview"
);

const NewGoalPlan = lazyWithRetry(
  () => import("./components/Performance/NewGoalPlan/NewGoalPlan"),
  "NewGoalPlan"
);

const PerformanceReviewApp = lazyWithRetry(
  () =>
    import("./components/Performance/PerformanceReview/PerformanceReviewApp"),
  "PerformanceReviewApp"
);

const BenefitsApp = lazyWithRetry(
  () => import("./components/Benefits/BenefitsApp"),
  "BenefitsApp"
);

const MyBenefits = lazyWithRetry(
  () => import("./components/Benefits/MyBenefits/MyBenefits"),
  "MyBenefits"
);

const MyBenefitRequests = lazyWithRetry(
  () => import("./components/Benefits/MyRequests/MyRequests"),
  "MyBenefitRequests"
);

const BenefitsSlips = lazyWithRetry(
  () => import("./components/Benefits/BenefitsSlips/BenefitsSlips"),
  "BenefitsSlips"
);

const MyTeamBenefitsRequests = lazyWithRetry(
  () => import("./components/Benefits/MyTeamRequest/MyTeamRequest"),
  "MyTeamBenefitsRequests"
);

const HelpDeskApp = lazyWithRetry(
  () => import("./components/HelpDesk/HelpDeskApp"),
  "HelpDeskApp"
);

const FAQPage = lazyWithRetry(
  () => import("./components/HelpDesk/FAQPage"),
  "FAQPage"
);

const TodoPage = lazyWithRetry(
  () => import("./components/Todo/TodoPage"),
  "TodoPage"
);

// eslint-disable-next-line react-refresh/only-export-components
const AddExpensePage = () => {
  const location = useLocation();
  const initialExpense = (location.state as any)?.expense || null;
  const expense_claim_name =
    (location.state as any)?.expense_claim_name || null;
  return (
    <AddExpenseForm
      initialExpense={initialExpense}
      expense_claim_name={expense_claim_name}
      isEditingFromDetailsPage={Boolean(initialExpense)}
    />
  );
};

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

  { path: "/webapp/requests", element: <Requests /> },
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
      { path: "ctc-salary-breakdown", element: <CTCSalaryUI /> },
      { path: "salary-slip-list", element: <SalarySlipsList /> },
      { path: "income-tax-sheet", element: <IncomeTaxSheet /> },
      { path: "it-declaration-form", element: <ITDeclarationForm /> },
      { path: "my-loan-requests", element: <LoansPage /> },
      { path: "team-loan-requests", element: <TeamLoanRequest /> },
      { path: "hr-payroll", element: <HRPayroll /> },
      { path: "details-page-mobile", element: <LoanMainComponent /> }, // Nested route
      { path: "advances-list", element: <AdvancesList /> },
      { path: "team-advances-list", element: <TeamAdvanceRequest /> },
      { path: "pay-package", element: <PayPackage /> },
      { path: "extra-payment", element: <ExtraPayment /> },
      { path: "perquisite-list", element: <Perquisite /> },
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
    path: "/webapp/benefits-app",
    element: <BenefitsApp />,
    children: [
      { path: "my-benefits", element: <MyBenefits /> },
      { path: "my-requests", element: <MyBenefitRequests /> },
      { path: "benefits-slips", element: <BenefitsSlips /> },
      { path: "my-team-requests", element: <MyTeamBenefitsRequests /> },
    ],
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
    path: "/webapp/shift-request/shift-change-form/:id",
    element: <ShiftReqeustEditForm />,
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
    path: "/webapp/employee-profile",
    element: <EmployeeProfile />,
  },

  // Nested Expenses App Routes
  {
    path: "/webapp/expenses-app",
    element: <ExpensesApp />,
    children: [
      { path: "expenses-list", element: <ExpensesList /> },
      { path: "team-requests", element: <TeamExpense /> },
      { path: "my-advance-expense", element: <MyAdvanceExpenseList /> },
      { path: "team-advance-expense", element: <TeamAdvanceExpenseList /> },
      { path: "shared-expenses", element: <SharedExpenses /> },
    ],
  },
  { path: "/webapp/expenses-app/add-expense", element: <AddExpensePage /> },
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
      { path: "my-overtime-requests", element: <MyOvertimeRequests /> },
      { path: "team-overtime-requests", element: <TeamOvertimeRequests /> },
      {
        path: "attendance-policies",
        element: <AttendancePolicies doctype_name="Attendance Policies" />,
      },
      {
        path: "overtime-policies",
        element: <AttendancePolicies doctype_name="Overtime Policy" />,
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
        path: "compensatory-request",
        element: <CompensatoryRequest />,
      },
    ],
  },

  // New route for Expense Advance Form
  {
    path: "/webapp/expenses-app/new-expense-advance",
    element: <ExpenseAdvanceForm />,
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
  // Flow App Routes
  {
    path: "/webapp/flow-app",
    element: <FlowApp />,
    children: [
      { path: "flow-requests", element: <FlowRequests2 /> },
      { path: "separation", element: <Separation /> },
      { path: "separation-workflow/:id", element: <SeparationWorkflow /> },
      { path: "confirmation", element: <Confirmation /> },
      { path: "initiate-flow", element: <InitiateFlow2 /> },
      { path: "flow-request/:id", element: <RequestDetails /> },
    ],
  },
  {
    path: "/webapp/performance-app",
    element: <PerformanceApp />,
    children: [
      { path: "overview", element: <Overview /> },
      { path: "new-goal-plan", element: <NewGoalPlan /> },
      { path: "performance-review", element: <PerformanceReviewApp /> },
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
  {
    path: "/webapp/password-reset",
    element: <PasswordReset />,
  },
  {
    path: "/webapp/helpdesk",
    element: <HelpDeskApp />,
  },
  {
    path: "/webapp/helpdesk/faq",
    element: <FAQPage />,
  },
  {
    path: "/webapp/todo-app",
    element: <TodoPage />,
  },
];

// Export lazy loading utility for potential use elsewhere
export { withLazyLoading };
