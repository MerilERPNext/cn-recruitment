import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
// import Navigation from './components/Navigation';
import SearchMembers from './components/SearchMembers';
import Notices from './components/Notices';
import IdCard from './components/IdCard';
import { useRouteInfo } from './hooks/useRouter';
import { QueryProvider } from './providers/QueryProvider';
import RequisitionDetails from './components/RequisitionDetails';
import './App.css';
import RecruitmentApp from './components/RecruitmentApp';
import InterviewPage from './components/InterveiwDetails';
import AddNewReferral from './components/AddNewReferral';
import ReferralDetails from './components/ReferralDetails';
import InterviewFeedbackForm from './components/Feedback';
import AddRequisition from './components/AddRequistion';
import JobApplicantDetail from './components/JobApplicantDetail';
import JobApplicantFilterList from './components/jobApplicantFilterList';

// Home/Dashboard component
const Dashboard: React.FC = () => {
  const routeInfo = useRouteInfo();

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--background-medium)' }}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            Recruitment Portal Dashboard
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Current path: {routeInfo.pathname}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-lg shadow-md p-6" style={{ backgroundColor: 'var(--background-light)' }}>
            <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Search Members</h2>
            <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>
              Streamline your recruitment process and manage job applicants with ease.
            </p>
            <Link
              to="/webapp/recruitment-app"
              className="inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Recruitment-app
            </Link>
          </div>
          <div className="rounded-lg shadow-md p-6" style={{ backgroundColor: 'var(--background-light)' }}>
            <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Search Members</h2>
            <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>
              Find and manage employee information quickly and efficiently.
            </p>
            <Link
              to="/webapp/search-members"
              className="inline-block text-white px-4 py-2 rounded-md transition-colors"
              style={{ backgroundColor: 'var(--primary-color)' }}
            >
              Go to Search
            </Link>
          </div>

          <div className="rounded-lg shadow-md p-6" style={{ backgroundColor: 'var(--background-light)' }}>
            <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Notices</h2>
            <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>
              View and manage company announcements and important notices.
            </p>
            <Link
              to="/webapp/notices"
              className="inline-block bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
            >
              View Notices
            </Link>
          </div>

          <div className="rounded-lg shadow-md p-6" style={{ backgroundColor: 'var(--background-light)' }}>
            <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>ID Cards</h2>
            <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>
              Generate, view, and manage employee identification cards.
            </p>
            <Link
              to="/webapp/id-card"
              className="inline-block bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
            >
              Manage ID Cards
            </Link>
          </div>
        </div>


      </div>
    </div>
  );
};


const App: React.FC = () => {
  return (
    <QueryProvider>
      <Router>
        <div className="min-h-screen" style={{ backgroundColor: 'var(--background-medium)' }}>
          <Routes>

            {/* Default route */}
            <Route path="/webapp/" element={<Dashboard />} />

            {/* Specific routes for each page */}

            <Route path="/webapp/search-members" element={<SearchMembers />} />
            <Route path="/webapp/notices" element={<Notices />} />
            <Route path="/webapp/id-card" element={<IdCard />} />
            <Route path="/webapp/id-card/:employeeId" element={<IdCard />} />
            <Route path="/webapp/requisitions/:requisitionId" element={<RequisitionDetails />} />
            {/* Catch-all route for 404 */}
            <Route path="/webapp/recruitment-app/*" element={<RecruitmentApp />} />
            <Route path="/webapp/recruitment-app/interview-details/:id*" element={<InterviewPage />} />
            <Route path="/webapp/recruitment-app/add-new-referral/*" element={<AddNewReferral />} />
            <Route path="/webapp/recruitment-app/referral-details/*" element={<ReferralDetails />} />
            <Route path="/webapp/recruitment-app/add-requisition/*" element={<AddRequisition />} />
            <Route path="/webapp/recruitment-app/interview-feedback/:id" element={<InterviewFeedbackForm />} />
            <Route path="/webapp/recruitment-app/job-applicant/" element={<JobApplicantFilterList />} />


            <Route path="/webapp/recruitment-app/referral-details/:id" element={<ReferralDetails />} />
            <Route path="/webapp/recruitment-app/job-applicant-list" element={<JobApplicantList />} />
            <Route path="/webapp/recruitment-app/job-applicant-detail/:id" element={<JobApplicantDetail />} />


            {/* Redirect any unmatched routes to the home page */}
            <Route path="*" element={<Navigate to="/webapp/" replace />} />
          </Routes>
        </div>
      </Router>
    </QueryProvider>
  );
};

export default App;