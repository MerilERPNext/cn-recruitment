// import React from 'react';
// import { HashRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
// // import Navigation from './components/Navigation';
// import SearchMembers from './components/SearchMembers';
// import Notices from './components/Notices';
// import IdCard from './components/IdCard';
// import { useCurrentPath, useRouteInfo } from './hooks/useRouter';
// import { QueryProvider } from './providers/QueryProvider';
// import './App.css';
// import RecruitmentApp from './components/RecruitmentApp';

// // Home/Dashboard component
// const Dashboard: React.FC = () => {
//   const routeInfo = useRouteInfo();
  
//   return (
//     <div className="min-h-screen bg-gray-50 p-6">
//       <div className="max-w-4xl mx-auto">
//         <div className="mb-8">
//           <h1 className="text-3xl font-bold text-gray-900 mb-2">
//             Recruitment Portal Dashboard
//           </h1>
//           <p className="text-gray-600">Current path: {routeInfo.pathname}</p>
//         </div>
        
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//         <div className="bg-white rounded-lg shadow-md p-6">
//             <h2 className="text-xl font-semibold mb-4">Recruitment</h2>
//             <p className="text-gray-600 mb-4">
             
//             </p>
//             <Link
//               to="/recruitment"
//               className="inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
//             >
//               Recruitment
//             </Link>
//           </div>
//           <div className="bg-white rounded-lg shadow-md p-6">
//             <h2 className="text-xl font-semibold mb-4">Search Members</h2>
//             <p className="text-gray-600 mb-4">
//               Find and manage employee information quickly and efficiently.
//             </p>
//             <Link
//               to="/search-members"
//               className="inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
//             >
//               Go to Search
//             </Link>
//           </div>
          
//           <div className="bg-white rounded-lg shadow-md p-6">
//             <h2 className="text-xl font-semibold mb-4">Notices</h2>
//             <p className="text-gray-600 mb-4">
//               View and manage company announcements and important notices.
//             </p>
//             <Link
//               to="/notices"
//               className="inline-block bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
//             >
//               View Notices
//             </Link>
//           </div>
          
//           <div className="bg-white rounded-lg shadow-md p-6">
//             <h2 className="text-xl font-semibold mb-4">ID Cards</h2>
//             <p className="text-gray-600 mb-4">
//               Generate, view, and manage employee identification cards.
//             </p>
//             <Link
//               to="/id-card"
//               className="inline-block bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
//             >
//               Manage ID Cards
//             </Link>
//           </div>
//         </div>
        

//       </div>
//     </div>
//   );
// };

// // Dynamic component renderer based on path (alternative approach)
// const DynamicPathRenderer: React.FC = () => {
//   const currentPath = useCurrentPath();
  
//   const renderComponentByPath = () => {
//     switch (currentPath) {
//       case '/recruitment':
//         return <RecruitmentApp />;
//       case '/search-members':
//         return <SearchMembers />;
//       case '/notices':
//         return <Notices />;
//       case '/id-card':
//         return <IdCard />;
//       default:
//         return <Dashboard />;
//     }
//   };

//   return (
//     <div>
//       {/* <Navigation /> */}
//       {renderComponentByPath()}
//     </div>
//   );
// };

// // Main App component with React Router
// const App: React.FC = () => {
//   return (
//     <QueryProvider>
//       <Router>
//         <div className="min-h-screen bg-gray-50">
//           {/* <Navigation /> */}
//           <Routes>
//             {/* Default route redirects to dashboard */}
//             <Route path="/" element={<Dashboard />} />
            
//             {/* Specific routes for each page */}
//             <Route path="/search-members" element={<SearchMembers />} />
//             <Route path="/notices" element={<Notices />} />
//             <Route path="/id-card" element={<IdCard />} />
//             <Route path="/id-card/:employeeId" element={<IdCard />} />
            
//             {/* Alternative: Dynamic path renderer */}
//             <Route path="/dynamic/*" element={<DynamicPathRenderer />} />
//             <Route path="/recruitment/*" element={< RecruitmentApp/>} />
           
//             {/* Catch-all route for 404 */}
//             <Route path="*" element={<Navigate to="/" replace />} />
//           </Routes>
//         </div>
//       </Router>
//     </QueryProvider>
//   );
// };

// export default App;




import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
// import Navigation from './components/Navigation';
import SearchMembers from './components/SearchMembers';
import Notices from './components/Notices';
import IdCard from './components/IdCard';
import { useCurrentPath, useRouteInfo } from './hooks/useRouter';
import { QueryProvider } from './providers/QueryProvider';
import './App.css';
import RecruitmentApp from './components/RecruitmentApp';
import ReferralDetails from './components/ReferralDetails';
import AddNewReferral from './components/AddNewReferral';
import JobRequisition from './components/JobRequisition';

const Dashboard: React.FC = () => {
  const routeInfo = useRouteInfo();
  
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Recruitment Portal Dashboard
          </h1>
          <p className="text-gray-600">Current path: {routeInfo.pathname}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Existing Cards */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Recruitment</h2>
            <Link
              to="/recruitment"
              className="inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Recruitment
            </Link>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Search Members</h2>
            <p className="text-gray-600 mb-4">
              Find and manage employee information quickly and efficiently.
            </p>
            <Link
              to="/search-members"
              className="inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Go to Search
            </Link>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Notices</h2>
            <p className="text-gray-600 mb-4">
              View and manage company announcements and important notices.
            </p>
            <Link
              to="/notices"
              className="inline-block bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
            >
              View Notices
            </Link>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">ID Cards</h2>
            <p className="text-gray-600 mb-4">
              Generate, view, and manage employee identification cards.
            </p>
            <Link
              to="/id-card"
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

const DynamicPathRenderer: React.FC = () => {
  const currentPath = useCurrentPath();
  
  const renderComponentByPath = () => {
    switch (currentPath) {
      case '/recruitment':
        return <RecruitmentApp />;
      case '/search-members':
        return <SearchMembers />;
      case '/notices':
        return <Notices />;
      case '/id-card':
        return <IdCard />;
      default:
        return <Dashboard />;
    }
  };

  return <div>{renderComponentByPath()}</div>;
};

const App: React.FC = () => {
  return (
    <QueryProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/search-members" element={<SearchMembers />} />
            <Route path="/notices" element={<Notices />} />
            <Route path="/id-card" element={<IdCard />} />
            <Route path="/id-card/:employeeId" element={<IdCard />} />
            <Route path="/recruitment/*" element={<RecruitmentApp />} />
            <Route path="/referral-details" element={<ReferralDetails />} />
            <Route path="/add-new-referral" element={<AddNewReferral />} /> {/* ✅ ✅ ✅ JUST THIS LINE */}
            <Route path="/dynamic/*" element={<DynamicPathRenderer />} />
            <Route path="*" element={<Navigate to="/" replace />} />

           <Route path="/job-requisition" element={<JobRequisition />} />
          </Routes>
        </div>
      </Router>
    </QueryProvider>
  );
};

export default App;
