import React, { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

const Overview: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const topRef = React.useRef<HTMLDivElement>(null);

  // Extract active tab from the URL path
  let activeTab: 'overview' | 'my-goals' | 'skills' | 'review' | 'feedback' = 'overview';
  if (location.pathname.includes('/my-goals')) {
    activeTab = 'my-goals';
  } else if (location.pathname.includes('/skills')) {
    activeTab = 'skills';
  } else if (location.pathname.includes('/review') || location.pathname.includes('/performance-review')) {
    activeTab = 'review';
  } else if (location.pathname.includes('/feedback')) {
    activeTab = 'feedback';
  }

  // Extract active review sub-tab from the URL path
  let activeReviewTab: 'self' | 'peer' | 'final' = 'self';
  if (location.pathname.includes('/peer-nomination')) {
    activeReviewTab = 'peer';
  } else if (location.pathname.includes('/performance-review')) {
    activeReviewTab = 'final';
  }

  const isCreatingGoal = location.pathname.endsWith('/new-goal');
  const isGoalDetail = /^\/webapp\/performance-app\/my-goals\/[^/]+$/.test(location.pathname);
  const isGoalLayout = (isCreatingGoal || isGoalDetail) && activeTab === 'my-goals';

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
    <main ref={topRef} aria-label="Performance Overview" className="min-h-full bg-[#f8fafc] font-sans flex flex-col">
      <div className="mx-auto w-full min-w-0 flex flex-col flex-1">
        
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 px-4 sm:px-6 bg-white flex-shrink-0 overflow-x-auto pb-1">
          <nav className="-mb-px flex space-x-8 min-w-max" aria-label="Tabs">
            {[
              { id: 'overview', name: 'Overview', path: '/webapp/performance-app/overview' },
              { id: 'my-goals', name: 'My Goals', path: '/webapp/performance-app/my-goals' },
              { id: 'skills', name: 'Skills', path: '/webapp/performance-app/skills' },
              { id: 'review', name: 'Review', path: '/webapp/performance-app/review' },
              { id: 'feedback', name: 'Feedback', path: '/webapp/performance-app/feedback' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    navigate(tab.path);
                  }}
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
        <div className={isGoalLayout ? "flex-1 flex flex-col min-h-0" : "px-3 py-4 sm:px-4 sm:py-5 lg:px-6 lg:py-6 space-y-4 sm:space-y-6 flex-1 overflow-y-auto"}>
          {activeTab === 'review' ? (
            <div className="space-y-4">
              {/* Sub-tabs for Review */}
              <div className="border-b border-gray-200 flex justify-start sm:justify-center overflow-x-auto pb-1">
                <nav className="-mb-px flex space-x-8 min-w-max px-4 sm:px-0" aria-label="Review Tabs">
                  {[
                    { id: 'self', name: 'Self Review', path: '/webapp/performance-app/review' },
                    { id: 'peer', name: 'Peer Nomination', path: '/webapp/performance-app/review/peer-nomination' },
                    { id: 'final', name: 'Final Rating', path: '/webapp/performance-app/performance-review' },
                  ].map((subTab) => {
                    const isActive = activeReviewTab === subTab.id;
                    return (
                      <button
                        key={subTab.id}
                        onClick={() => navigate(subTab.path)}
                        className={`
                          whitespace-nowrap border-b-2 py-3 px-1 text-sm font-semibold transition-all duration-200
                          ${isActive
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                          }
                        `}
                      >
                        {subTab.name}
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Sub-tab content */}
              <div>
                <Outlet />
              </div>
            </div>
          ) : (
            <Outlet />
          )}
        </div>

      </div>
    </main>
  );
};

export default Overview;
