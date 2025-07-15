import { ReactElement } from 'react';
import SearchMembers from './components/SearchMembers';
import Notices from './components/Notices';
import IdCard from './components/IdCard';
import RecruitmentApp from './components/RecruitmentApp';
import InterviewPage from './components/InterveiwDetails';
import InterviewList from './components/interview';
import AddNewReferral from './components/AddNewReferral';
import ReferralDetails from './components/ReferralDetails';
import InterviewFeedbackForm from './components/Feedback';
import AddRequisition from './components/AddRequistion';
import JobRequisition from './components/JobRequisition';
import RequisitionDetails from './components/RequisitionDetails';
import ReferralList from './components/RafarralList';

export interface AppRoute {
  path: string;
  element: ReactElement;
  children?: AppRoute[];
}

export const routesConfig: AppRoute[] = [

  // Standalone Routes
  { path: '/webapp/search-members', element: <SearchMembers /> },
  { path: '/webapp/notices', element: <Notices /> },
  { path: '/webapp/id-card', element: <IdCard /> },
  { path: '/webapp/id-card/:employeeId', element: <IdCard /> },

  // Nested Recruitment App Routes
  {
    path: '/webapp/recruitment-app',
    element: <RecruitmentApp />,
    children: [
      { path: 'requisitions', element: <JobRequisition /> },
      { path: 'referrals', element: <ReferralList /> },
      { path: 'interviews', element: <InterviewList /> },
    ],
  },

  // Flat Recruitment Routes
  {
    path: '/webapp/recruitment-app/referrals/add-new-referral',
    element: <AddNewReferral />,
  },
  {
    path: '/webapp/recruitment-app/referrals/:id',
    element: <ReferralDetails />,
  },
  {
    path: '/webapp/recruitment-app/requisitions/:requisitionId',
    element: <RequisitionDetails />,
  },
  {
    path: '/webapp/recruitment-app/interviews/:id',
    element: <InterviewPage />,
  },
  {
    path: '/webapp/recruitment-app/interviews/interview-feedback/:id',
    element: <InterviewFeedbackForm />,
  },
  {
    path: '/webapp/recruitment-app/requisitions/add-requisition/*',
    element: <AddRequisition />,
  },
];
