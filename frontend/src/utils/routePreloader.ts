/**
 * Route preloader to prevent race conditions by preloading critical routes
 * This ensures that commonly accessed routes are loaded before users navigate to them
 */

// Map of route patterns to their import functions
const routePreloadMap: Record<string, () => Promise<any>> = {
  '/webapp/attendance': () => import('../components/Attendance/AttendanceLayout'),
  '/webapp/leave-app': () => import('../components/Leaves/LeaveApp'),
  '/webapp/salary-slip-app': () => import('../components/Compansation/SalarySlipApp'),
  '/webapp/expenses-app': () => import('../components/Expenses-App/ExpensesApp'),
  '/webapp/recruitment-app': () => import('../components/RecruitmentApp'),
  '/webapp/shift-request': async () => {
    // Preload both the main app and the dynamic routes
    await Promise.all([
      import('../components/ShiftRequest/ShiftRequestApp'),
      import('../components/ShiftRequest/ShiftDynamicRoute')
    ]);
  },
  '/webapp/my-profile': () => import('../components/MyProfile/MyProfile'),
  '/webapp/policies-app': () => import('../components/Policies/PoliciesApp'),
  '/webapp/tracker-app': () => import('../components/ApprovalTracker/TrackerApp'),
};

/**
 * Preload a specific route
 */
export function preloadRoute(path: string): void {
  // Find matching route pattern
  const matchingPattern = Object.keys(routePreloadMap).find(pattern =>
    path.startsWith(pattern)
  );

  if (matchingPattern && routePreloadMap[matchingPattern]) {
    routePreloadMap[matchingPattern]().catch(error => {
      console.warn(`Failed to preload route ${path}:`, error);
    });
  }
}

/**
 * Preload critical routes based on priority
 * Call this after the initial app load
 */
export function preloadCriticalRoutes(): void {
  // High priority routes - preload immediately
  const highPriorityRoutes = [
    '/webapp/attendance',
    '/webapp/leave-app',
  ];

  // Medium priority routes - preload after 2 seconds
  const mediumPriorityRoutes = [
    '/webapp/salary-slip-app',
    '/webapp/my-profile',
    '/webapp/shift-request',
  ];

  // Low priority routes - preload after 5 seconds
  const lowPriorityRoutes = [
    '/webapp/expenses-app',
    '/webapp/recruitment-app',
    '/webapp/policies-app',
    '/webapp/tracker-app',
  ];

  // Preload high priority routes immediately
  highPriorityRoutes.forEach(route => preloadRoute(route));

  // Preload medium priority routes after a delay
  setTimeout(() => {
    mediumPriorityRoutes.forEach(route => preloadRoute(route));
  }, 2000);

  // Preload low priority routes after a longer delay
  setTimeout(() => {
    lowPriorityRoutes.forEach(route => preloadRoute(route));
  }, 5000);
}

/**
 * Intelligent preloading based on user navigation patterns
 * Call this on route changes to preload likely next destinations
 */
export function preloadAdjacentRoutes(currentPath: string): void {
  // Define route relationships for intelligent preloading
  const routeRelationships: Record<string, string[]> = {
    '/webapp/attendance': ['/webapp/leave-app', '/webapp/shift-request'],
    '/webapp/leave-app': ['/webapp/attendance', '/webapp/my-profile'],
    '/webapp/salary-slip-app': ['/webapp/expenses-app', '/webapp/my-profile'],
    '/webapp/my-profile': ['/webapp/leave-app', '/webapp/salary-slip-app'],
    '/webapp/shift-request': ['/webapp/attendance', '/webapp/leave-app'],
  };

  const relatedRoutes = routeRelationships[currentPath];
  if (relatedRoutes) {
    // Preload related routes after a small delay
    setTimeout(() => {
      relatedRoutes.forEach(route => preloadRoute(route));
    }, 1000);
  }
}

/**
 * Preload on link hover for instant navigation
 * Use this with onMouseEnter events on navigation links
 */
export function preloadOnHover(path: string): void {
  // Debounce preloading to avoid excessive requests
  const timeoutKey = `preload-hover-${path}`;

  // Clear any existing timeout
  if ((window as any)[timeoutKey]) {
    clearTimeout((window as any)[timeoutKey]);
  }

  // Set a new timeout for preloading
  (window as any)[timeoutKey] = setTimeout(() => {
    preloadRoute(path);
    delete (window as any)[timeoutKey];
  }, 100); // 100ms delay to ensure it's an intentional hover
}

/**
 * Clear preload hover timeout if mouse leaves quickly
 */
export function cancelPreloadOnHover(path: string): void {
  const timeoutKey = `preload-hover-${path}`;
  if ((window as any)[timeoutKey]) {
    clearTimeout((window as any)[timeoutKey]);
    delete (window as any)[timeoutKey];
  }
}