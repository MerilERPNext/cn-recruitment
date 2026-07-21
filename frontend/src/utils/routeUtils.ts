import SearchMembers from '../components/SearchMembers';
import NoticesTabWrapper from '../components/Notices/NoticesTabWrapper';
import IdCard from '../components/IdCard';
import { AppRoute } from '../routesConfig';
import { matchPath } from 'react-router-dom';

// Component mapping for dynamic routing
export const componentMap: { [key: string]: React.ComponentType } = {
  '/search-members': SearchMembers,
  '/notices': NoticesTabWrapper,
  '/id-card': IdCard,
};

// Route configuration
export const routes = [
  {
    path: '/search-members',
    component: SearchMembers,
    title: 'Search Members',
    description: 'Find and manage employee information',
    icon: '🔍'
  },
  {
    path: '/notices',
    component: NoticesTabWrapper,
    title: 'Notices',
    description: 'View company announcements and notices',
    icon: '📢'
  },
  {
    path: '/id-card',
    component: IdCard,
    title: 'ID Card',
    description: 'Generate and manage employee ID cards',
    icon: '🆔'
  },
];

// Utility function to get component by path
export const getComponentByPath = (path: string): React.ComponentType | null => {
  return componentMap[path] || null;
};

// Utility function to check if path exists in routes
export const isValidRoute = (path: string): boolean => {
  return path in componentMap;
};

// Get route configuration by path
export const getRouteConfig = (path: string) => {
  return routes.find(route => route.path === path);
};

// Extract path segments for nested routing
export const getPathSegments = (path: string): string[] => {
  return path.split('/').filter(segment => segment.length > 0);
};

// Build breadcrumb from path
export const getBreadcrumb = (path: string): string[] => {
  const segments = getPathSegments(path);
  const breadcrumb: string[] = [];

  segments.forEach((segment, index) => {
    const currentPath = '/' + segments.slice(0, index + 1).join('/');
    const route = getRouteConfig(currentPath);
    breadcrumb.push(route?.title || segment);
  });

  return breadcrumb;
};

/**
 * Handles nested routes and path parameters.
 */
export const findRouteConfig = (
  routes: AppRoute[],
  currentPath: string,
  basePath: string = "",
): AppRoute | null => {
  for (const route of routes) {
    // Reconstruct the full path for this route
    let fullPath = route.path || "";

    // If it's a relative path (doesn't start with /), append to basePath
    if (fullPath && !fullPath.startsWith("/")) {
      fullPath = `${basePath}/${fullPath}`.replace(/\/+/g, "/");
    } else if (!fullPath && basePath) {
      fullPath = basePath;
    }

    // For leaf routes, we use exact matching. 
    // For layout routes (with children), we use prefix matching.
    const isLeaf = !route.children || route.children.length === 0;
    const match = matchPath(
      { path: fullPath, end: isLeaf && !fullPath.includes("*") },
      currentPath
    );

    if (match) {
      // If there are children, try to find a more specific match among them
      if (route.children) {
        const childMatch = findRouteConfig(route.children, currentPath, fullPath);
        if (childMatch) return childMatch;
      }
      return route;
    }
  }

  return null;
};