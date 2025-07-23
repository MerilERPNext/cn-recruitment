import { ReactElement } from "react";
import SearchMembers from "./components/SearchMembers";
import Notices from "./components/Notices";
import IdCard from "./components/IdCard";
import RecruitmentApp from "./components/RecruitmentApp";
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
import SalarySlip from "./components/SalarySlip/SalaryDetails";
import SalarySlipApp from "./components/SalarySlip/SalarySlipApp";
import SalarySlipsList from "./components/SalarySlip/SalarySlipList";
import SalarySlipDetails from "./components/SalarySlip/SalaryDetails";
import ShiftRequestApp from "./components/ShiftRequest/ShiftRequestApp";
import TeamShift from "./components/ShiftRequest/TeamShift";
import MyShiftAssignment from "./components/ShiftRequest/MyShiftAssignment";
import ShiftChangeForm from "./components/ShiftRequest/AddRequestForm";
import ShiftRequestList from "./components/ShiftRequest/MyShiftList";
import ShiftChangeRequest from "./components/ShiftRequest/ShiftChangeRequest";

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
  {
    path: "/webapp/recruitment-app/salary-slip-details/:id",
    element: <SalarySlip />,
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
    path: "/webapp/salary-slip-app",
    element: <SalarySlipApp />,
    children: [
      { path: "salary-slip-list", element: <SalarySlipsList /> },
    ],
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
    path: "/webapp/salary-slip-app/salary-slip-list/:salaryId",
    element: <SalarySlipDetails />,
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
];
