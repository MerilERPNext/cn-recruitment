import { useLocation } from 'react-router-dom';
import SearchMembers from '../components/SearchMembers';
import IdCard from '../components/IdCard';
import NoticesLayout from '../components/Notices/NoticesLayout';

// Custom hook to get current path
export const useCurrentPath = () => {
  const location = useLocation();
  return location.pathname;
};

// Custom hook for path-based component rendering
export const usePathBasedComponent = () => {
  const currentPath = useCurrentPath();
  
  const componentMap: { [key: string]: React.ComponentType } = {
    '/search-members': SearchMembers,
    '/notices': NoticesLayout,
    '/id-card': IdCard,
  };
  
  return componentMap[currentPath] || null;
};

// Hook to extract route parameters and query params
export const useRouteInfo = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  
  return {
    pathname: location.pathname,
    search: location.search,
    hash: location.hash,
    state: location.state,
    queryParams: Object.fromEntries(searchParams.entries()),
  };
};

// Hook to check if current path matches a pattern
export const usePathMatcher = (pattern: string | RegExp) => {
  const currentPath = useCurrentPath();
  
  if (typeof pattern === 'string') {
    return currentPath === pattern;
  }
  
  return pattern.test(currentPath);
};