import { ReactElement } from "react";
import SearchMembers from "./components/SearchMembers";
import Notices from "./components/Notices";
import IdCard from "./components/IdCard";
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
import ExpensesApp from "./components/Expenses-App/ExpensesApp";
import ExpensesList from "./components/Expenses-App/ExpensesList";
import NewExpenseType from "./components/Expenses-App/NewExpenseType";
import GeneralExpenseClaim from "./components/Expenses-App/GeneralExpenseClaim";
import DailyAllowanceClaim from "./components/Expenses-App/DailyAllowanceClaim";
import MileageExpenseClaim from "./components/Expenses-App/MileageExpenseClaim";

export interface AppRoute {
  path: string;
  element: ReactElement;
  children?: AppRoute[];
}

export const routesConfig: AppRoute[] = [
  // Standalone Routes
  { path: "/webapp/search-members", element: <SearchMembers /> },
  { path: "/webapp/notices", element: <Notices /> },
  { path: "/webapp/id-card", element: <IdCard /> },
  { path: "/webapp/id-card/:employeeId", element: <IdCard /> },
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
