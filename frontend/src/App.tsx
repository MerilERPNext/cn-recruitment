import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navigation from './components/Navigation';
import SearchMembers from './components/SearchMembers';
import Notices from './components/Notices';
import IdCard from './components/IdCard';
import { useCurrentPath, useRouteInfo } from './hooks/useRouter';
import './App.css';

// Home/Dashboard component
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
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Search Members</h2>
            <p className="text-gray-600 mb-4">
              Find and manage employee information quickly and efficiently.
            </p>
            <a
              href="/search-members"
              className="inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Go to Search
            </a>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Notices</h2>
            <p className="text-gray-600 mb-4">
              View and manage company announcements and important notices.
            </p>
            <a
              href="/notices"
              className="inline-block bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
            >
              View Notices
            </a>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">ID Cards</h2>
            <p className="text-gray-600 mb-4">
              Generate, view, and manage employee identification cards.
            </p>
            <a
              href="/id-card"
              className="inline-block bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
            >
              Manage ID Cards
            </a>
          </div>
        </div>
        
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          <div className="space-y-3">
            <div className="border-l-4 border-blue-500 pl-4">
              <p className="text-sm text-gray-600">Today, 2:30 PM</p>
              <p className="text-gray-900">New employee John Doe added to system</p>
            </div>
            <div className="border-l-4 border-green-500 pl-4">
              <p className="text-sm text-gray-600">Today, 1:15 PM</p>
              <p className="text-gray-900">Notice "System Maintenance" published</p>
            </div>
            <div className="border-l-4 border-purple-500 pl-4">
              <p className="text-sm text-gray-600">Today, 11:45 AM</p>
              <p className="text-gray-900">ID card generated for employee EMP001</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Dynamic component renderer based on path (alternative approach)
const DynamicPathRenderer: React.FC = () => {
  const currentPath = useCurrentPath();
  
  const renderComponentByPath = () => {
    switch (currentPath) {
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

  return (
    <div>
      <Navigation />
      {renderComponentByPath()}
    </div>
  );
};

// Main App component with React Router
const App: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <Routes>
          {/* Default route redirects to dashboard */}
          <Route path="/" element={<Dashboard />} />
          
          {/* Specific routes for each page */}
          <Route path="/search-members" element={<SearchMembers />} />
          <Route path="/notices" element={<Notices />} />
          <Route path="/id-card" element={<IdCard />} />
          <Route path="/id-card/:id" element={<IdCard />} />
          
          {/* Alternative: Dynamic path renderer */}
          <Route path="/dynamic/*" element={<DynamicPathRenderer />} />
          
          {/* Catch-all route for 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;