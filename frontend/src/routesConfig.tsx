/* eslint-disable @typescript-eslint/no-explicit-any */
import { ReactElement, Suspense } from "react";
import { Navigate } from "react-router";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import EmployeeErrorBoundary from "./components/EmployeeErrorBoundary";
import { useFrappeDocument } from "./hooks/useFrappeQuery";
import { useScreenSize } from "./hooks/useScreenSize";
import { Expense, ExpenseClaim } from "./types/expenseAdvance";
import { lazyWithRetry } from "./utils/lazyWithRetry";

// Keep critical components as static imports for better UX
import TeamAdvanceRequest from "./components/Compansation/Advances/ApprovalAdvanceRquest";
import ExtraPayment from "./components/Compansation/Extrapayment/ExtraPayment";
import Invoice from "./components/Compansation/Invoice/Invoice";
import ITDeclarationForm from "./components/Compansation/IT Declaration/ITDeclaration";
import TeamProofSubmissionList from "./components/Compansation/IT Declaration/TeamApproval/TeamProofSubmissionList";
import TeamLoanRequest from "./components/Compansation/Loan/TeamLoan/TeamLoanRequest";
import Perquisite from "./components/Compansation/Perquisite/Perquisite";
import IncomeTaxSheet from "./components/Compansation/TaxSheet/TaxSheet";
import EmployeeProfile from "./components/EmployeeProfile/EmployeeProfile";
//import AddExpenseForm from "./components/Expenses-App/ExpenseClaim/AddExpenseForm";
import AddExpenseFormV2 from "./components/Expenses-App/ExpenseClaim/AddExpenseFormV2";
import {
  ExpenseNavigationState,
  buildExpenseNavigationState,
} from "./components/Expenses-App/ExpenseClaim/expenseNavigationHelper";
import RejectedSeparationRequest from "./components/Flows/Separation/RejectedSeparationRequest";
import IdCard from "./components/IdCard";
import NotificationList from "./components/Notification/Notification";
import OnboardingFieldApproval from "./components/Onboarding/component/fieldLabelApproval";
import Onboarding from "./components/Onboarding/Onboarding";
import Requests from "./components/Requests";
import PasswordReset from "./components/ResetPassword/ResetPassword";
import SearchMembers from "./components/SearchMembers";
import AppraisalCycleWizard from "./components/Performance/AppraisalCycleWizard/AppraisalCycleWizard.tsx";
import Eligibility from "./components/Performance/AppraisalCycleWizard/Eligibility.tsx";
import Stages from "./components/Performance/AppraisalCycleWizard/Stages.tsx";
import FormBuilder from "./components/Performance/AppraisalCycleWizard/FormBuilder.tsx";
import GoalPullIn from "./components/Performance/AppraisalCycleWizard/GoalPullIn.tsx";


const TeamApprovalListExemptionTable = lazyWithRetry(
  () =>
    import("./components/Compansation/IT Declaration/TeamApproval/TeamApprovalListView"),
  "TeamApprovalListExemptionTable",
);

// Lazy load heavy components with retry mechanism
const Expenses = lazyWithRetry(
  () => import("./components/Expenses"),
  "Expenses",
);
const RecruitmentApp = lazyWithRetry(
  () => import("./components/RecruitmentApp"),
  "RecruitmentApp",
);
const InterviewPage = lazyWithRetry(
  () => import("./components/InterviewDetails"),
  "InterviewPage",
);
const InterviewList = lazyWithRetry(
  () => import("./components/interview"),
  "InterviewList",
);
const AddNewReferral = lazyWithRetry(
  () => import("./components/AddNewReferral"),
  "AddNewReferral",
);
const ReferralDetails = lazyWithRetry(
  () => import("./components/ReferralDetails"),
  "ReferralDetails",
);
const InterviewFeedbackForm = lazyWithRetry(
  () => import("./components/Feedback"),
  "InterviewFeedbackForm",
);
const AddRequisition = lazyWithRetry(
  () => import("./components/AddRequisition"),
  "AddRequisition",
);
const JobRequisition = lazyWithRetry(
  () => import("./components/JobRequisition"),
  "JobRequisition",
);
const RequisitionDetails = lazyWithRetry(
  () => import("./components/RequisitionDetails"),
  "RequisitionDetails",
);
const ReferralList = lazyWithRetry(
  () => import("./components/ReferralList"),
  "ReferralList",
);
const MyGoals = lazyWithRetry(
  () => import("./components/Performance/MyGoals/MyGoals"),
  "MyGoals",
);

const TeamOverview = lazyWithRetry(
  () => import("./components/Performance/MyTeam/TeamOverview"),
  "TeamOverview",
);
const TeamGoals = lazyWithRetry(
  () => import("./components/Performance/MyTeam/TeamGoals"),
  "TeamGoals",
);

const TeamReviews = lazyWithRetry(
  () => import("./components/Performance/MyTeam/TeamReviews"),
  "TeamReviews",
);

const TeamCalibration = lazyWithRetry(
  () => import("./components/Performance/MyTeam/TeamCalibration"),
  "TeamCalibration",
);

const TeamCheckIns = lazyWithRetry(
  () => import("./components/Performance/MyTeam/TeamCheckIns.tsx"),
  "TeamCheckIns",
);

const TeamNotes = lazyWithRetry(
  () => import("./components/Performance/MyTeam/TeamNotes"),
  "TeamNotes",
);

const GoalDetails = lazyWithRetry(
  () => import("./components/Performance/MyGoals/components/GoalDetails"),
  "GoalDetails",
);
const Review = lazyWithRetry(
  () => import("./components/Performance/Review/SelfReview"),
  "Review",
);
const PeerNominationPage = lazyWithRetry(
  () => import("./components/Performance/Review/PeerNominationPage"),
  "PeerNominationPage",
);
const Feedback = lazyWithRetry(
  () => import("./components/Performance/Feedback/Feedback"),
  "Feedback",
);
const NewGoal = lazyWithRetry(
  () => import("./components/Performance/GoalCreation/NewGaol"),
  "NewGoal",
);
const SkillsAndProficiency = lazyWithRetry(
  () =>
    import("./components/Performance/SkillsAndProficiency/SkillsAndProficiency"),
  "SkillsAndProficiency",
);
const JobOpeningsUI = lazyWithRetry(
  () => import("./components/JobOpening/JobOpening"),
  "JobOpeningsUI",
);
const JobApplicantList = lazyWithRetry(
  () => import("./components/JobApplicantList"),
  "JobApplicantList",
);
const JobApplicantDetails = lazyWithRetry(
  () => import("./components/JobApplicantDetail"),
  "JobApplicantDetails",
);
const NoticesLayout = lazyWithRetry(
  () => import("./components/Notices/NoticesLayout"),
  "NoticesLayout",
);
const NoticesTab = lazyWithRetry(
  () => import("./components/Notices/NoticesTab"),
  "NoticesTab",
);
const NoticeDetails = lazyWithRetry(
  () => import("./components/Notices/NoticeDetails"),
  "NoticeDetails",
);
const ExpensesApp = lazyWithRetry(
  () => import("./components/Expenses-App/ExpensesApp"),
  "ExpensesApp",
);
const ExpensesList = lazyWithRetry(
  () => import("./components/Expenses-App/ExpenseClaim/ExpensesList"),
  "ExpensesList",
);
const TeamExpense = lazyWithRetry(
  () => import("./components/Expenses-App/ExpenseClaim/TeamExpense"),
  "TeamExpense",
);
const MyAdvanceExpenseList = lazyWithRetry(
  () => import("./components/Expenses-App/ExpenseAdvance/MyAdvanceExpenseList"),
  "MyAdvanceExpenseList",
);
const TeamAdvanceExpenseList = lazyWithRetry(
  () =>
    import("./components/Expenses-App/ExpenseAdvance/TeamAdvanceExpenseList"),
  "TeamAdvanceExpenseList",
);
const ExpenseAdvanceForm = lazyWithRetry(
  () => import("./components/Expenses-App/ExpenseAdvance/ExpenseAdvanceForm"),
  "ExpenseAdvanceForm",
);
const Holidays = lazyWithRetry(
  () => import("./components/Leaves/Holidays"),
  "Holidays",
);
const LeaveApp = lazyWithRetry(
  () => import("./components/Leaves/LeaveApp"),
  "LeaveApp",
);
const LeaveBalance = lazyWithRetry(
  () => import("./components/Leaves/LeaveBalance"),
  "LeaveBalance",
);
const LeaveRequestApp = lazyWithRetry(
  () => import("./components/Leaves/LeaveRequestApp"),
  "LeaveRequestApp",
);
const MyLeaveRequest = lazyWithRetry(
  () => import("./components/Leaves/MyLeaveRequest"),
  "MyLeaveRequest",
);
const TeamLeaveRequest = lazyWithRetry(
  () => import("./components/Leaves/TeamLeaveRequest"),
  "TeamLeaveRequest",
);
const AttendanceSummary = lazyWithRetry(
  () => import("./components/Attendance/AttendanceSummary"),
  "AttendanceSummary",
);
const AllEmpAttendance = lazyWithRetry(
  () => import("./components/Attendance/AllEmpAttendance/AllEmpAttendance"),
  "AllEmpAttendance",
);
const AttendanceLayout = lazyWithRetry(
  () => import("./components/Attendance/AttendanceLayout"),
  "AttendanceLayout",
);
const AttendanceRequest = lazyWithRetry(
  () => import("./components/Attendance/AttendanceRequest/AttendanceRequest"),
  "AttendanceRequest",
);
const EmployeeAttendance = lazyWithRetry(
  () => import("./components/Attendance/Employee/EmployeeAttendance"),
  "EmployeeAttendance",
);
const TeamAttendance = lazyWithRetry(
  () => import("./components/Attendance/Team/TeamAttendance"),
  "TeamAttendance",
);
const AttendanceRequestFormV2 = lazyWithRetry(
  () =>
    import("./components/Attendance/AttendanceRequest/AttendanceRequestFormV2"),
  "AttendanceRequestFormV2",
);
const TeamAttendanceDetails = lazyWithRetry(
  () =>
    import("./components/Attendance/TeamAttendanceDetails/TeamAttendanceDetails"),
  "TeamAttendanceDetails",
);
const SalarySlipApp = lazyWithRetry(
  () => import("./components/Compansation/SalarySlipApp"),
  "SalarySlipApp",
);
const SalarySlipsList = lazyWithRetry(
  () => import("./components/Compansation/SalarySlipList"),
  "SalarySlipsList",
);

// const ShiftRequestList = lazyWithRetry(
//   () => import("./components/ShiftRequest/MyShiftList"),
//   "ShiftRequestList"
// );
const ShiftRequestApp = lazyWithRetry(
  () => import("./components/ShiftRequest/ShiftRequestApp"),
  "ShiftRequestApp",
);
const Policies = lazyWithRetry(
  () => import("./components/Policies"),
  "Policies",
);
const PoliciesEnforced = lazyWithRetry(
  () => import("./components/PoliciesEnforced"),
  "PoliciesEnforced",
);
const PolicySignOff = lazyWithRetry(
  () => import("./components/PolicySignOff"),
  "PolicySignOff",
);
const CTCSalaryUI = lazyWithRetry(
  () => import("./components/Compansation/CTCSalaryBreakdown"),
  "CTCSalaryUI",
);
const PoliciesApp = lazyWithRetry(
  () => import("./components/Policies/PoliciesApp"),
  "PoliciesApp",
);
const PoliciesCategory = lazyWithRetry(
  () => import("./components/Policies/PoliciesCategory"),
  "PoliciesCategory",
);
const PoliciesList = lazyWithRetry(
  () => import("./components/Policies/PoliciesList"),
  "PoliciesList",
);
const ViewPolicy = lazyWithRetry(
  () => import("./components/Policies/ViewPolicy"),
  "ViewPolicy",
);
const ViewSalarySlipModal = lazyWithRetry(
  () => import("./components/Compansation/SalarySlipPDF"),
  "ViewSalarySlipModal",
);

const HRPayroll = lazyWithRetry(
  () => import("./components/Compansation/HR-Payroll"),
  "HRPayroll",
);
const AttendancePolicies = lazyWithRetry(
  () => import("./components/Attendance/AttendancePolicies/AttendancePolicies"),
  "AttendancePolicies",
);
const EmployeesDirectory = lazyWithRetry(
  () => import("./components/EmployeesDirectory/EmployeeDirectoryLayout"),
  "EmployeesDirectory",
);
const AllShiftsDashboardRoute = lazyWithRetry(
  () =>
    import("./components/ShiftRequest/ShiftDynamicRoute").then((module) => ({
      default: module.AllShiftsDashboardRoute,
    })),
  "AllShiftsDashboardRoute",
);
const MyShiftsListRoute = lazyWithRetry(
  () =>
    import("./components/ShiftRequest/ShiftDynamicRoute").then((module) => ({
      default: module.MyShiftsListRoute,
    })),
  "MyShiftsListRoute",
);
const TeamShiftsListRoute = lazyWithRetry(
  () =>
    import("./components/ShiftRequest/ShiftDynamicRoute").then((module) => ({
      default: module.TeamShiftsListRoute,
    })),
  "TeamShiftsListRoute",
);
const ShiftChangeRequestsRoute = lazyWithRetry(
  () =>
    import("./components/ShiftRequest/ShiftDynamicRoute").then((module) => ({
      default: module.ShiftChangeRequestsRoute,
    })),
  "ShiftChangeRequestsRoute",
);
const MyShiftRequestsRoute = lazyWithRetry(
  () =>
    import("./components/ShiftRequest/ShiftDynamicRoute").then((module) => ({
      default: module.MyShiftRequestsRoute,
    })),
  "MyShiftRequestsRoute",
);
const LoansPage = lazyWithRetry(
  () => import("./components/Compansation/Loan/LoanMain"),
  "LoansPage",
);
const MyOvertimeRequests = lazyWithRetry(
  () => import("./components/Attendance/OvertimeRequests/MyOvertimeRequests"),
  "OvertimeRequests",
);
const TeamOvertimeRequests = lazyWithRetry(
  () => import("./components/Attendance/OvertimeRequests/TeamOvertimeRequests"),
  "OvertimeRequests",
);
const LoanMainComponent = lazyWithRetry(
  () => import("./components/Compansation/Loan/component/DetailsPageForMobile"),
  "LoanMainComponent",
);
const OrganizationChart = lazyWithRetry(
  () => import("./components/ORGChart/OrganizationChart"),
  "OrganizationChart",
);
const OrganizationCharttooo = lazyWithRetry(
  () => import("./components/ORGChart/OrgnazationChartForTwoLavel"),
  "OrganizationCharttooo",
);
const AdvancesList = lazyWithRetry(
  () => import("./components/Compansation/Advances/AdvancesList"),
  "AdvancesList",
);

const PayPackage = lazyWithRetry(
  () => import("./components/Compansation/Paypackage/PayPackage"),
  "PayPackage",
);

const CompensatoryRequest = lazyWithRetry(
  () => import("./components/Leaves/compensatory/CompensatoryRequest"),
  "CompensatoryRequest",
);

const FlowApp = lazyWithRetry(
  () => import("./components/Flows/FlowApp"),
  "FlowApp",
);

const FlowRequests2 = lazyWithRetry(
  () => import("./components/Flows/FlowRequests/FlowRequests"),
  "FlowRequests2",
);

const Separation = lazyWithRetry(
  () => import("./components/Flows/Separation/Separation"),
  "Separation",
);

const SeparationWorkflow = lazyWithRetry(
  () => import("./components/Flows/SeparationWorkflow/SeparationWorkflow"),
  "SeparationWorkflow",
);

const Confirmation = lazyWithRetry(
  () => import("./components/Flows/Confirmation/Confirmation"),
  "Confirmation",
);

const InitiateFlow2 = lazyWithRetry(
  () => import("./components/Flows/Initiate/InitiateFlow"),
  "InitiateFlow2",
);

const RequestDetails = lazyWithRetry(
  () => import("./components/Flows/FlowRequests/FlowDetails/RequestDetails"),
  "RequestDetails",
);

const PerformanceApp = lazyWithRetry(
  () => import("./components/Performance/PerformanceApp"),
  "PerFormanceApp",
);

const Overview = lazyWithRetry(
  () => import("./components/Performance/Overview/Overview"),
  "Overview",
);

const NewGoalPlan = lazyWithRetry(
  () => import("./components/Performance/NewGoalPlan/NewGoalPlan"),
  "NewGoalPlan",
);

const PerformanceReviewApp = lazyWithRetry(
  () =>
    import("./components/Performance/PerformanceReview/PerformanceReviewApp"),
  "PerformanceReviewApp",
);

const BenefitsApp = lazyWithRetry(
  () => import("./components/Benefits/BenefitsApp"),
  "BenefitsApp",
);

const MyBenefits = lazyWithRetry(
  () => import("./components/Benefits/MyBenefits/MyBenefits"),
  "MyBenefits",
);

const MyBenefitRequests = lazyWithRetry(
  () => import("./components/Benefits/MyRequests/MyRequests"),
  "MyBenefitRequests",
);

const BenefitsSlips = lazyWithRetry(
  () => import("./components/Benefits/BenefitsSlips/BenefitsSlips"),
  "BenefitsSlips",
);

const MyTeamBenefitsRequests = lazyWithRetry(
  () => import("./components/Benefits/MyTeamRequest/MyTeamRequest"),
  "MyTeamBenefitsRequests",
);

const HelpDeskApp = lazyWithRetry(
  () => import("./components/HelpDesk/HelpDeskApp"),
  "HelpDeskApp",
);

const FAQPage = lazyWithRetry(
  () => import("./components/HelpDesk/FAQPage"),
  "FAQPage",
);

const TicketDetailView = lazyWithRetry(
  () => import("./components/HelpDesk/TicketDetailView"),
  "TicketDetailView",
);

const TodoPage = lazyWithRetry(
  () => import("./components/Todo/TodoPage"),
  "TodoPage",
);

const Recruitment = lazyWithRetry(
  () => import("./components/Recruitment/RecruitmentApp"),
  "Recruitment",
);
const RecruitmentOverview = lazyWithRetry(
  () => import("./components/Recruitment/Overview"),
  "RecruitmentOverview",
);
const Requisition = lazyWithRetry(
  () => import("./components/Recruitment/Requisition"),
  "Requisition",
);
const RequisitionForm = lazyWithRetry(
  () => import("./components/Recruitment/RequisitionForm"),
  "RequisitionForm",
);
const RecognitionPage = lazyWithRetry(
  () => import("./components/Recognition/RecognitionPage"),
  "RecognitionPage",
);
const HallOfFamePage = lazyWithRetry(
  () => import("./components/Recognition/HallOfFamePage"),
  "HallOfFamePage",
);
const LeaderboardPage = lazyWithRetry(
  () => import("./components/Recognition/LeaderboardPage"),
  "LeaderboardPage",
);

// eslint-disable-next-line react-refresh/only-export-components
const AddExpensePage = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const navigationState = location.state as ExpenseNavigationState | null;

  console.log("[AddExpensePage] Initial Location State:", navigationState);

  const queryExpenseClaim = searchParams.get("expenseClaim");
  const queryExpenseItem = searchParams.get("expenseItem");
  const queryIsResubmit = searchParams.get("isResubmit") === "true";

  console.log("[AddExpensePage] URL params:", {
    queryExpenseClaim,
    queryExpenseItem,
    queryIsResubmit,
  });

  // We must decide if we need to fetch backup data.
  const needsBackupHydration =
    !navigationState?.expense && !!queryExpenseClaim && !!queryExpenseItem;

  if (needsBackupHydration) {
    console.warn(
      "[AddExpensePage] Location state missing or incomplete. Triggering API hydration fallback.",
    );
  }

  const { data: fetchedDoc, isLoading } = useFrappeDocument(
    "Expense Claim",
    needsBackupHydration ? queryExpenseClaim! : "",
  );

  if (needsBackupHydration && isLoading) {
    return <LoadingSpinner />;
  }

  // Reconstruction of state from fetched data if location.state went AWOL
  let resolvedExpense = navigationState?.expense || null;
  let resolvedClaimName = navigationState?.expense_claim_name || null;
  let resolvedIsResubmit = navigationState?.isResubmit || false;

  if (needsBackupHydration && fetchedDoc) {
    const claimData = fetchedDoc as unknown as ExpenseClaim;
    const matchingItem = claimData.expenses?.find(
      (e: Expense) => e.name === queryExpenseItem,
    );

    if (matchingItem) {
      const fallbackState = buildExpenseNavigationState(
        claimData,
        matchingItem,
        queryIsResubmit,
      );
      resolvedExpense = fallbackState.expense;
      resolvedClaimName = fallbackState.expense_claim_name;
      resolvedIsResubmit = fallbackState.isResubmit || false;
    }
  }

  const draft_document_name = navigationState?.draft_document_name || null;
  const isEditingFromDraft = Boolean(draft_document_name);

  return (
    <AddExpenseFormV2
      key={
        resolvedExpense
          ? `edit-${resolvedClaimName}-${resolvedExpense.name}`
          : "add-new"
      }
      initialExpense={resolvedExpense}
      expense_claim_name={resolvedClaimName}
      draft_document_name={draft_document_name}
      isEditingFromDetailsPage={Boolean(resolvedExpense) && !isEditingFromDraft}
      isResubmit={resolvedIsResubmit}
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

// eslint-disable-next-line react-refresh/only-export-components
const AttendanceRequestFormRoute = () => {
  const navigate = useNavigate();
  return <AttendanceRequestFormV2 onClose={() => navigate(-1)} />;
};

// HOC to wrap components with Suspense and Error Boundary
const withLazyLoading = (
  Component: React.ComponentType,
  fallback = <LoadingSpinner />,
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
  permissionKey: string;
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
  {
    path: "/webapp/notification-log",
    element: <NotificationList />,
    permissionKey: "NotificationList",
  },
  // Standalone Routes
  {
    path: "/webapp/search-members",
    element: <SearchMembers />,
    permissionKey: "Employee Directory",
  },

  {
    path: "/webapp/requests",
    element: <Requests />,
    permissionKey: "Dashboard",
  },
  {
    path: "/webapp/id-card",
    element: <IdCard />,
    permissionKey: "Employee Directory",
  },
  {
    path: "/webapp/id-card/:employeeId",
    element: <IdCard />,
    permissionKey: "Employee Directory",
  },
  {
    path: "/webapp/expenses",
    element: <Expenses />,
    permissionKey: "Expenses",
  },
  {
    path: "/webapp/policies",
    element: <Policies />,
    permissionKey: "Policies",
  },
  {
    path: "/webapp/policies-enforced",
    element: <PoliciesEnforced />,
    permissionKey: "Policies",
  },
  {
    path: "/webapp/policies-enforced/view/:policyId",
    element: <PolicySignOff />,
    permissionKey: "Policies",
  },
  {
    path: "/webapp/recruitment-app/job-applicant-detail/:id",
    element: <JobApplicantDetails />,
    permissionKey: "Recruitment",
  },

  {
    path: "/webapp/recruitment-app",
    element: <RecruitmentApp />,
    permissionKey: "Recruitment",
    children: [
      {
        path: "requisitions",
        element: <JobRequisition />,
        permissionKey: "Requisitions",
      },
      {
        path: "referrals",
        element: <ReferralList />,
        permissionKey: "Referrals",
      },
      {
        path: "interviews",
        element: <InterviewList />,
        permissionKey: "Interviews",
      },
      {
        path: "job-openings",
        element: <JobOpeningsUI />,
        permissionKey: "Job Openings",
      },
      {
        path: "job-applicant-list",
        element: <JobApplicantList />,
        permissionKey: "Job Applicant List",
      },
    ],
  },

  //salary slip route
  {
    path: "/webapp/salary-slip-app",
    element: <SalarySlipApp />,
    permissionKey: "Compensation",
    children: [
      {
        path: "ctc-salary-breakdown",
        element: <CTCSalaryUI />,
        permissionKey: "Annual CTC",
      },
      {
        path: "salary-slip-list",
        element: <SalarySlipsList />,
        permissionKey: "Salary Slip",
      },
      {
        path: "income-tax-sheet",
        element: <IncomeTaxSheet />,
        permissionKey: "Tax Declaration Sheet",
      },
      {
        path: "it-declaration-form",
        element: <ITDeclarationForm />,
        permissionKey: "IT Declaration",
      },
      {
        path: "team-approval-it-declaration/:proofId",
        element: <TeamApprovalListExemptionTable />,
        permissionKey: "Team IT Declaration",
      },
      {
        path: "team-declaration-listview",
        element: <TeamProofSubmissionList />,
        permissionKey: "Team IT Declaration",
      },
      {
        path: "my-loan-requests",
        element: <LoansPage />,
        permissionKey: "My Loan Requests",
      },
      {
        path: "team-loan-requests",
        element: <TeamLoanRequest />,
        permissionKey: "Team Loan Requests",
      },
      {
        path: "hr-payroll",
        element: <HRPayroll />,
        permissionKey: "Payroll Documents",
      },
      {
        path: "details-page-mobile",
        element: <LoanMainComponent />,
        permissionKey: "My Loan Requests",
      }, // Nested route
      {
        path: "advances-list",
        element: <AdvancesList />,
        permissionKey: "My Advances",
      },
      {
        path: "team-advances-list",
        element: <TeamAdvanceRequest />,
        permissionKey: "Team Advances",
      },
      {
        path: "pay-package",
        element: <PayPackage />,
        permissionKey: "Pay Package",
      },
      {
        path: "extra-payment",
        element: <ExtraPayment />,
        permissionKey: "Extra Payment",
      },
      {
        path: "perquisite-list",
        element: <Perquisite />,
        permissionKey: "Perquisite",
      },
      { path: "invoice-page", element: <Invoice />, permissionKey: "Invoice" },
    ],
  },
  {
    path: "/webapp/salary-slip-app/salary-slip-list/:salaryId",
    element: <ViewSalarySlipModal />,
    permissionKey: "Salary Slip",
  },
  {
    path: "/webapp/salary-slip-app/loan/:loanId",
    element: <LoanMainComponent />,
    permissionKey: "My Loan Requests",
  },

  {
    path: "/webapp/benefits-app",
    element: <BenefitsApp />,
    permissionKey: "Benefit",
    children: [
      {
        path: "my-benefits",
        element: <MyBenefits />,
        permissionKey: "My Benefits",
      },
      {
        path: "my-requests",
        element: <MyBenefitRequests />,
        permissionKey: "My Requests",
      },
      {
        path: "benefits-slips",
        element: <BenefitsSlips />,
        permissionKey: "Benefit Slips",
      },
      {
        path: "my-team-requests",
        element: <MyTeamBenefitsRequests />,
        permissionKey: "Team Requests",
      },
    ],
  },

  {
    path: "/webapp/shift-request",
    element: <ShiftRequestApp />,
    permissionKey: "Shift",
    children: [
      {
        path: "",
        index: true,
        element: <ShiftRequestDefaultRoute />,
        permissionKey: "Shift",
      },
      {
        path: "all-shifts-dashboard",
        element: <AllShiftsDashboardRoute />,
        permissionKey: "All Shifts",
      },
      {
        path: "my-shift-assignment",
        element: <MyShiftsListRoute />,
        permissionKey: "My Shifts",
      },
      {
        path: "team-shift",
        element: <TeamShiftsListRoute />,
        permissionKey: "Team Shifts",
      },
      {
        path: "shift-change-request",
        element: <ShiftChangeRequestsRoute />,
        permissionKey: "Team Shift Requests",
      },
      {
        path: "shift-list",
        element: <MyShiftRequestsRoute />,
        permissionKey: "My Shift Requests",
      },
    ],
  },

  {
    path: "/webapp/notices",
    element: <NoticesLayout />,
    permissionKey: "Notices Dashboard",
    children: [
      {
        path: "all",
        element: <NoticesTab tab="all" />,
        permissionKey: "Notices Dashboard",
      },
      {
        path: "unread",
        element: <NoticesTab tab="unread" />,
        permissionKey: "Notices Dashboard",
      },
      // { path: 'archived', element: <NoticesTab tab="archived" /> },
    ],
  },

  {
    path: "/webapp/notices/:id",
    element: <NoticeDetails />,
    permissionKey: "Notices Dashboard",
  },

  {
    path: "/webapp/employee-profile",
    element: <EmployeeProfile />,
    permissionKey: "Employee Profile",
  },

  // Nested Expenses App Routes
  {
    path: "/webapp/expenses-app",
    element: <ExpensesApp />,
    permissionKey: "Expenses",
    children: [
      {
        path: "expenses-list",
        element: <ExpensesList />,
        permissionKey: "Expense Claims",
      },
      {
        path: "team-requests",
        element: <TeamExpense />,
        permissionKey: "Team Requests",
      },
      {
        path: "my-advance-expense",
        element: <MyAdvanceExpenseList />,
        permissionKey: "My Advances",
      },
      {
        path: "team-advance-expense",
        element: <TeamAdvanceExpenseList />,
        permissionKey: "Team Advances",
      },
    ],
  },
  {
    path: "/webapp/expenses-app/add-expense",
    element: <AddExpensePage />,
    permissionKey: "Expense Claims",
  },
  // Flat Recruitment Routes
  {
    path: "/webapp/recruitment-app/referrals/add-new-referral",
    element: <AddNewReferral />,
    permissionKey: "Referrals",
  },
  {
    path: "/webapp/recruitment-app/referrals/:id",
    element: <ReferralDetails />,
    permissionKey: "Referrals",
  },
  {
    path: "/webapp/recruitment-app/requisitions/:requisitionId",
    element: <RequisitionDetails />,
    permissionKey: "Requisitions",
  },
  {
    path: "/webapp/recruitment-app/interviews/:id",
    element: <InterviewPage />,
    permissionKey: "Interviews",
  },
  {
    path: "/webapp/recruitment-app/interviews/interview-feedback/:id",
    element: <InterviewFeedbackForm />,
    permissionKey: "Interviews",
  },
  {
    path: "/webapp/recruitment-app/requisitions/add-requisition/*",
    element: <AddRequisition />,
    permissionKey: "Requisitions",
  },
  {
    path: "/webapp/attendance",
    element: <AttendanceLayout />,
    permissionKey: "Attendance",
    children: [
      {
        path: "",
        index: true,
        element: <Navigate to="summary" replace />,
        permissionKey: "Attendance Summary",
      },
      {
        path: "summary",
        element: <AttendanceSummary />,
        permissionKey: "Attendance Summary",
      },
      {
        path: "emp-attendance",
        element: <EmployeeAttendance />,
        permissionKey: "My Attendance",
      },
      {
        path: "emp-attendance/all",
        element: <AllEmpAttendance />,
        permissionKey: "Team Attendance",
      },
      {
        path: "team-attendance",
        element: <TeamAttendance />,
        permissionKey: "Team Attendance",
      },
      {
        path: "attendance-request",
        element: <AttendanceRequest />,
        permissionKey: "My Requests",
      },
      {
        path: "team-attendance-requests",
        element: <TeamAttendanceDetails />,
        permissionKey: "Team Requests",
      },
      {
        path: "request-form",
        element: <AttendanceRequestFormRoute />,
        permissionKey: "Attendance Summary",
      },
      {
        path: "my-overtime-requests",
        element: <MyOvertimeRequests />,
        permissionKey: "Planned Overtime",
      },
      {
        path: "team-overtime-requests",
        element: <TeamOvertimeRequests />,
        permissionKey: "Team Overtime",
      },
      {
        path: "attendance-policies",
        element: <AttendancePolicies doctype_name="Attendance Policies" />,
        permissionKey: "Attendance Policies",
      },
      {
        path: "overtime-policies",
        element: <AttendancePolicies doctype_name="Overtime Policy" />,
        permissionKey: "Overtime Policies",
      },
    ],
  },
  {
    path: "/webapp/employees-directory",
    element: <EmployeesDirectory />,
    permissionKey: "Employee Directory",
  },
  //Leaves routes
  {
    path: "/webapp/leave-app",
    element: <LeaveApp />,
    permissionKey: "Leaves and Holidays",
    children: [
      {
        path: "leaves/leave-balance",
        element: <LeaveBalance />,
        permissionKey: "Leave Summary",
      },
      {
        path: "leaves/leave-requests",
        element: <LeaveRequestApp />,
        permissionKey: "Leaves and Holidays",
        children: [
          {
            path: "my",
            element: <MyLeaveRequest />,
            permissionKey: "My Requests",
          },
          {
            path: "team",
            element: <TeamLeaveRequest />,
            permissionKey: "Team Requests",
          },
        ],
      },
      {
        path: "leaves/holidays",
        element: <Holidays />,
        permissionKey: "Holidays",
      },
      {
        path: "compensatory-request",
        element: <CompensatoryRequest />,
        permissionKey: "Compensatory",
      },
      {
        path: "request",
        element: <></>, // important: render nothing
        permissionKey: "request-leave",
      },
    ],
  },

  //new recruitment routes
  {
    path: "/webapp/recruitment",
    element: <Recruitment />,
    permissionKey: "Recruitment",
    children: [
      {
        path: "overview",
        element: <RecruitmentOverview />,
        permissionKey: "Overview",
      },
      {
        path: "requisition",
        element: <Requisition />,
        permissionKey: "Requisitions",
      },
      {
        path: "requisition/new",
        element: <RequisitionForm />,
        permissionKey: "Requisitions",
      },
    ],
  },

  // New route for Expense Advance Form
  {
    path: "/webapp/expenses-app/new-expense-advance",
    element: <ExpenseAdvanceForm />,
    permissionKey: "My Advances",
  },

  //Policies routes
  {
    path: "/webapp/policies-app",
    element: <PoliciesApp />,
    permissionKey: "Policies",
    children: [
      { path: "", element: <PoliciesCategory />, permissionKey: "Policies" },
      {
        path: "policies-list",
        element: <PoliciesList />,
        permissionKey: "Policies",
      },
      {
        path: "view-policy/:policyName",
        element: <ViewPolicy />,
        permissionKey: "Policies",
      },
    ],
  },
  // Flow App Routes
  {
    path: "/webapp/flow-app",
    element: <FlowApp />,
    permissionKey: "HR Process",
    children: [
      {
        path: "flow-requests",
        element: <FlowRequests2 />,
        permissionKey: "Flow Requests",
      },
      {
        path: "separation",
        element: <Separation />,
        permissionKey: "Separation",
      },
      {
        path: "rejected-separation-request",
        element: <RejectedSeparationRequest />,
        permissionKey: "Rejected Separation Request",
      },
      {
        path: "separation-workflow",
        element: <SeparationWorkflow />,
        permissionKey: "Separation",
      },
      {
        path: "confirmation",
        element: <Confirmation />,
        permissionKey: "Confirmation",
      },
      {
        path: "initiate-flow",
        element: <InitiateFlow2 />,
        permissionKey: "Initiate Flow",
      },
      {
        path: "flow-request/:id",
        element: <RequestDetails />,
        permissionKey: "Flow Requests",
      },
    ],
  },
  {
    path: "/webapp/performance-app",
    element: <PerformanceApp />,
    permissionKey: "Performance",
    children: [
      { path: "overview", element: <Overview />, permissionKey: "Overview" },
      {
        path: "my-goals",
        element: <MyGoals />,
        permissionKey: "My Goals",
      },
      {
        path: "team-overview",
        element: <TeamOverview />,
        permissionKey: "Team Overview",
      },
      {
        path: "team-goals",
        element: <TeamGoals />,
        permissionKey: "Team Goals",
      },
      {
        path: "team-reviews",
        element: <TeamReviews />,
        permissionKey: "Team Reviews",
      },
      {
        path: "team-calibration",
        element: <TeamCalibration />,
        permissionKey: "Team Calibration",
      },
      {
        path: "team-check-ins",
        element: <TeamCheckIns />,
        permissionKey: "Team Check-Ins",
      },
      {
        path: "team-notes",
        element: <TeamNotes />,
        permissionKey: "Team Notes",
      },
      {
        path: "my-goals/:id",
        element: <GoalDetails />,
        permissionKey: "My Goals",
      },
      {
        path: "review",
        element: <Review />,
        permissionKey: "Review",
      },
      {
        path: "review/peer-nomination",
        element: <PeerNominationPage />,
        permissionKey: "Review",
      },
      {
        path: "feedback",
        element: <Feedback />,
        permissionKey: "Feedback",
      },

      {
        path: "new-goal-plan",
        element: <NewGoalPlan />,
        permissionKey: "New Goal",
      },
      {
        path: "my-goals/new-goal",
        element: <NewGoal />,
        permissionKey: "New Goal Plan",
      },
      {
        path: "skills",
        element: <SkillsAndProficiency />,
        permissionKey: "Skills And Proficiency",
      },
      {
        path: "performance-review",
        element: <PerformanceReviewApp />,
        permissionKey: "Performance Review",
      },
      {
        path: "appraisal-cycle-wizard",
        element: <AppraisalCycleWizard />,
        permissionKey: "Performance Admin",
      },
      {
        path: "appraisal-cycle-wizard/eligibility",
        element: <Eligibility />,
        permissionKey: "Performance Admin",
      },
      {
        path: "appraisal-cycle-wizard/stages",
        element: <Stages />,
        permissionKey: "Performance Admin",
      },
      {
        path: "appraisal-cycle-wizard/form-builder",
        element: <FormBuilder />,
        permissionKey: "Performance Admin",
      },
      {
        path: "appraisal-cycle-wizard/goal-pull-in",
        element: <GoalPullIn />,
        permissionKey: "Performance Admin",
      },
    ],
  },

  {
    path: "/webapp/organizational-chart",
    element: <OrganizationChart />,
    permissionKey: "Employee Directory",
  },
  {
    path: "/webapp/organizational-chart-two-level",
    element: <OrganizationCharttooo />,
    permissionKey: "Employee Directory",
  },
  {
    path: "/webapp/password-reset",
    element: <PasswordReset />,
    permissionKey: "Dashboard",
  },
  {
    path: "/webapp/helpdesk",
    element: <HelpDeskApp />,
    permissionKey: "Help Desk",
  },
  {
    path: "/work-connect",
    element: <Navigate to="/work-connect" replace />,
    permissionKey: "Work Connect",
  },

  {
    path: "/webapp/helpdesk/my-tickets",
    element: <HelpDeskApp />,
    permissionKey: "Help Desk My Tickets",
  },
  {
    path: "/webapp/helpdesk/assigned",
    element: <HelpDeskApp />,
    permissionKey: "Help Desk Assigned",
  },
  {
    path: "/webapp/helpdesk/faq",
    element: <FAQPage />,
    permissionKey: "Help Desk FAQ",
  },
  {
    path: "/webapp/helpdesk/ticket/:ticketId",
    element: <TicketDetailView />,
    permissionKey: "Help Desk Ticket",
  },
  {
    path: "/webapp/employee-onboarding",
    element: <Onboarding />,
    permissionKey: "Employee Onboarding",
    children: [
      {
        path: "onboarding-field-approval/:onboardingId",
        element: <OnboardingFieldApproval />,
        permissionKey: "Employee Onboarding",
      },
    ],
  },
  {
    path: "/webapp/todo-app",
    element: <TodoPage />,
    permissionKey: "Todo",
  },
  {
    path: "/webapp/recognition",
    element: <RecognitionPage />,
    permissionKey: "Recognition",
  },
  {
    path: "/webapp/recognition/hall-of-fame",
    element: <HallOfFamePage />,
    permissionKey: "Recognition",
  },
  {
    path: "/webapp/recognition/leaderboard",
    element: <LeaderboardPage />,
    permissionKey: "Recognition",
  },
];

// Export lazy loading utility for potential use elsewhere
export { withLazyLoading };
