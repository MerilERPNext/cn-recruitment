import { ReactElement } from 'react';
import SearchMembers from './components/SearchMembers';
import IdCard from './components/IdCard';
import RecruitmentApp from './components/RecruitmentApp';
import InterviewPage from './components/InterviewDetails';
import InterviewList from './components/interview';
import AddNewReferral from './components/AddNewReferral';
import ReferralDetails from './components/ReferralDetails';
import InterviewFeedbackForm from './components/Feedback';
import AddRequisition from './components/AddRequisition';
import JobRequisition from './components/JobRequisition';
import RequisitionDetails from './components/RequisitionDetails';
import ReferralList from './components/ReferralList';
import NoticeDetails from './components/Notices/NoticeDetails';
import NoticesLayout from './components/Notices/NoticesLayout';
import NoticesTab from './components/Notices/NoticesTab';

export interface AppRoute {
  path: string;
  element: ReactElement;
  children?: AppRoute[];
}

export const routesConfig: AppRoute[] = [

  // Standalone Routes
  { path: '/webapp/search-members', element: <SearchMembers /> },
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
  // { path: '/webapp/notices/:id', element: <NoticeDetails /> },

];
