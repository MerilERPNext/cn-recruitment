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

import LeaveBalance from "./components/Leaves/LeaveBalance";
import LeaveRequestApp from "./components/Leaves/LeaveRequestApp";
import MyLeaveRequest from "./components/Leaves/MyLeaveRequest";
import TeamLeaveRequest from "./components/Leaves/TeamLeaveRequest";
import LeaveApp from "./components/Leaves/LeaveApp";
import Holidays from "./components/Leaves/Holidays";
import HolidaysFull from "./components/Leaves/HolidaysFull";
import LeaveRequestDetails from "./components/Leaves/LeaveRequestDetails";

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
      { path: "leaves/leave-requests/:id", element: <LeaveRequestDetails /> },

    ],
  },
];
