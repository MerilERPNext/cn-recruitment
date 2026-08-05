import React, { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useScreenSize } from "../../../hooks/useScreenSize";

const MyTeamLayout: React.FC = () => {
  const { isMobile, isTablet } = useScreenSize();
  const location = useLocation();
  const navigate = useNavigate();
  const topRef = React.useRef<HTMLDivElement>(null);

  // Extract active tab from the URL path
  let activeTab: 'overview' | 'goals' | 'reviews' | 'calibration' | 'check-ins' = 'overview';
  if (location.pathname.includes('/team-goals')) {
    activeTab = 'goals';
  } else if (location.pathname.includes('/team-reviews')) {
    activeTab = 'reviews';
  } else if (location.pathname.includes('/team-calibration')) {
    activeTab = 'calibration';
  } else if (location.pathname.includes('/team-check-ins')) {
    activeTab = 'check-ins';
  } else if (location.pathname.includes('/team-overview')) {
    activeTab = 'overview';
  }

  useEffect(() => {
    if (topRef.current) {
      let parent = topRef.current.parentElement;
      let scrolled = false;
      while (parent) {
        const overflowY = window.getComputedStyle(parent).overflowY;
        if ((overflowY === 'auto' || overflowY === 'scroll') && parent.scrollHeight > parent.clientHeight) {
          parent.scrollTo({ top: 0, behavior: 'smooth' });
          scrolled = true;
          break;
        }
        parent = parent.parentElement;
      }
      if (!scrolled) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, [location.pathname]);

  return (
    <main ref={topRef} className="min-h-full bg-[#f6f8fb] font-sans flex flex-col">
      <div className="w-full min-w-0 flex flex-col flex-1">
        
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 px-4 sm:px-6 bg-white flex-shrink-0 overflow-x-auto pb-1">
          <nav className="-mb-px flex space-x-8 min-w-max" aria-label="Team Tabs">
            {[
              { id: 'overview', name: 'Overview', path: '/webapp/performance-app/team-overview' },
              { id: 'goals', name: 'Team Goals', path: '/webapp/performance-app/team-goals' },
              { id: 'reviews', name: 'Reviews', path: '/webapp/performance-app/team-reviews' },
              { id: 'calibration', name: 'Calibration', path: '/webapp/performance-app/team-calibration' },
              { id: 'check-ins', name: 'Check-Ins', path: '/webapp/performance-app/team-check-ins' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => navigate(tab.path)}
                  className={`
                    whitespace-nowrap border-b-2 py-4 px-1 text-sm font-semibold transition-all duration-200
                    ${isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }
                  `}
                >
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className={`flex-1 overflow-y-auto ${isMobile ? "px-3 py-4" : isTablet ? "px-4 py-5" : "px-3 py-4 sm:px-4 sm:py-5 lg:px-6 lg:py-6 space-y-4 sm:space-y-6 flex-1 overflow-y-auto"}`}>
          <Outlet />
        </div>

      </div>
    </main>
  );
};

export default MyTeamLayout;
