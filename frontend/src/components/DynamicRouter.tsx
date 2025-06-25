import React from 'react';
import { useLocation, useParams, useSearchParams } from 'react-router-dom';
import { getComponentByPath, getBreadcrumb } from '../utils/routeUtils';

interface DynamicRouterProps {
  fallbackComponent?: React.ComponentType;
  showBreadcrumb?: boolean;
  showPathInfo?: boolean;
}

const DynamicRouter: React.FC<DynamicRouterProps> = ({
  fallbackComponent: FallbackComponent,
  showBreadcrumb = false,
  showPathInfo = false
}) => {
  const location = useLocation();
  const params = useParams();
  const [searchParams] = useSearchParams();
  
  const currentPath = location.pathname;
  const Component = getComponentByPath(currentPath);
  // const routeConfig = getRouteConfig(currentPath);
  const breadcrumb = getBreadcrumb(currentPath);

  // Convert search params to object
  const queryParams = Object.fromEntries(searchParams.entries());

  // If no component found, render fallback
  if (!Component) {
    if (FallbackComponent) {
      return <FallbackComponent />;
    }
    
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Page Not Found</h1>
          <p className="text-gray-600 mb-4">The path "{currentPath}" doesn't exist.</p>
          <a
            href="/"
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Breadcrumb */}
      {showBreadcrumb && breadcrumb.length > 0 && (
        <div className="bg-white border-b px-6 py-3">
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="inline-flex items-center space-x-1 md:space-x-3">
              <li className="inline-flex items-center">
                <a href="/" className="text-gray-700 hover:text-blue-600">
                  Home
                </a>
              </li>
              {breadcrumb.map((crumb, index) => (
                <li key={index}>
                  <div className="flex items-center">
                    <span className="mx-2 text-gray-400">/</span>
                    <span className="text-gray-500">{crumb}</span>
                  </div>
                </li>
              ))}
            </ol>
          </nav>
        </div>
      )}

      {/* Path information (for debugging) */}
      {showPathInfo && (
        <div className="bg-gray-100 border-b px-6 py-2 text-sm">
          <div className="max-w-6xl mx-auto">
            <strong>Path Info:</strong> {currentPath}
            {Object.keys(params).length > 0 && (
              <span className="ml-4">
                <strong>Params:</strong> {JSON.stringify(params)}
              </span>
            )}
            {Object.keys(queryParams).length > 0 && (
              <span className="ml-4">
                <strong>Query:</strong> {JSON.stringify(queryParams)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Render the component */}
      <Component />
    </div>
  );
};

export default DynamicRouter;