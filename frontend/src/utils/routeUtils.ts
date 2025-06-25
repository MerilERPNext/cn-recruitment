import SearchMembers from '../components/SearchMembers';
import Notices from '../components/Notices';
import IdCard from '../components/IdCard';

// Component mapping for dynamic routing
export const componentMap: { [key: string]: React.ComponentType } = {
  '/search-members': SearchMembers,
  '/notices': Notices,
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
    component: Notices,
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