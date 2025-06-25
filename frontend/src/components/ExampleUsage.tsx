import React from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useCurrentPath, useRouteInfo, usePathMatcher } from '../hooks/useRouter';
import { getComponentByPath, getRouteConfig } from '../utils/routeUtils';

// Example: Advanced usage of React Router with path-based rendering
const ExampleUsage: React.FC = () => {
  // Get current path using custom hook
  const currentPath = useCurrentPath();
  
  // Get comprehensive route information
  const routeInfo = useRouteInfo();
  
  // Check if current path matches a pattern
  const isEmployeePage = usePathMatcher(/^\/id-card/);
  const isSearchPage = usePathMatcher('/search-members');
  
  // Get route configuration
  const routeConfig = getRouteConfig(currentPath);
  
  // Get component for current path
  const Component = getComponentByPath(currentPath);
  
  // React Router hooks
  const location = useLocation();
  const params = useParams();
  // const [searchParams] = useSearchParams();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">React Router Usage Examples</h1>
      
      {/* Path Information */}
      <div className="bg-gray-100 p-4 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-2">Current Path Information</h2>
        <div className="space-y-2 text-sm">
          <p><strong>Current Path:</strong> {currentPath}</p>
          <p><strong>Full Pathname:</strong> {location.pathname}</p>
          <p><strong>Search:</strong> {location.search || 'None'}</p>
          <p><strong>Hash:</strong> {location.hash || 'None'}</p>
          <p><strong>State:</strong> {JSON.stringify(location.state) || 'None'}</p>
        </div>
      </div>

      {/* Route Configuration */}
      {routeConfig && (
        <div className="bg-blue-100 p-4 rounded-lg mb-6">
          <h2 className="text-lg font-semibold mb-2">Route Configuration</h2>
          <div className="space-y-2 text-sm">
            <p><strong>Title:</strong> {routeConfig.title}</p>
            <p><strong>Description:</strong> {routeConfig.description}</p>
            <p><strong>Icon:</strong> {routeConfig.icon}</p>
          </div>
        </div>
      )}

      {/* URL Parameters */}
      {Object.keys(params).length > 0 && (
        <div className="bg-green-100 p-4 rounded-lg mb-6">
          <h2 className="text-lg font-semibold mb-2">URL Parameters</h2>
          <div className="space-y-2 text-sm">
            {Object.entries(params).map(([key, value]) => (
              <p key={key}><strong>{key}:</strong> {value}</p>
            ))}
          </div>
        </div>
      )}

      {/* Query Parameters */}
      {routeInfo.queryParams && Object.keys(routeInfo.queryParams).length > 0 && (
        <div className="bg-yellow-100 p-4 rounded-lg mb-6">
          <h2 className="text-lg font-semibold mb-2">Query Parameters</h2>
          <div className="space-y-2 text-sm">
            {Object.entries(routeInfo.queryParams).map(([key, value]) => (
              <p key={key}><strong>{key}:</strong> {value}</p>
            ))}
          </div>
        </div>
      )}

      {/* Pattern Matching */}
      <div className="bg-purple-100 p-4 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-2">Pattern Matching</h2>
        <div className="space-y-2 text-sm">
          <p><strong>Is Employee Page:</strong> {isEmployeePage ? 'Yes' : 'No'}</p>
          <p><strong>Is Search Page:</strong> {isSearchPage ? 'Yes' : 'No'}</p>
        </div>
      </div>

      {/* Dynamic Component Rendering */}
      <div className="bg-red-100 p-4 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-2">Dynamic Component</h2>
        <p className="text-sm mb-4">
          <strong>Component Found:</strong> {Component ? 'Yes' : 'No'}
        </p>
        
        {/* Render the component if found */}
        {Component && (
          <div className="border-2 border-red-300 p-4 rounded">
            <p className="text-sm font-medium mb-2">Rendering Component:</p>
            <Component />
          </div>
        )}
      </div>

      {/* Navigation Examples */}
      <div className="bg-indigo-100 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Navigation Examples</h2>
        <div className="space-x-2">
          <a href="/search-members" className="bg-blue-500 text-white px-3 py-1 rounded text-sm">
            Search Members
          </a>
          <a href="/notices" className="bg-green-500 text-white px-3 py-1 rounded text-sm">
            Notices
          </a>
          <a href="/id-card" className="bg-purple-500 text-white px-3 py-1 rounded text-sm">
            ID Card
          </a>
          <a href="/id-card/EMP001" className="bg-orange-500 text-white px-3 py-1 rounded text-sm">
            ID Card (EMP001)
          </a>
          <a href="/search-members?dept=engineering&status=active" className="bg-pink-500 text-white px-3 py-1 rounded text-sm">
            Search with Query
          </a>
        </div>
      </div>
    </div>
  );
};

export default ExampleUsage;