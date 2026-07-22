import React, { useEffect, useState } from 'react';
import OverviewHeader from './component/OverviewHeader';
import OverviewStats from './component/OverviewStats';
import OverviewGoals from './component/OverviewGoals';
import OverviewSidebar from './component/OverviewSidebar';

import MyGoals from '../MyGoals/MyGoals';
import SkillsAndProficiency from '../SkillsAndProficiency/SkillsAndProficiency';
import Feedback from '../Feedback/Feedback';
import SelfReview from '../Review/SelfReview';
import NewGoal from '../GoalCreation/NewGaol';
import PeerNominationPage from '../Review/PeerNominationPage';
import PerformanceReviewApp from '../PerformanceReview/PerformanceReviewApp';
import GoalDetails from '../MyGoals/components/GoalDetails';

const Overview: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'my-goals' | 'skills' | 'review' | 'feedback'>('overview');
  const [activeReviewTab, setActiveReviewTab] = useState<'self' | 'peer' | 'final'>('self');
  const [isCreatingGoal, setIsCreatingGoal] = useState(false);
  
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const topRef = React.useRef<HTMLDivElement>(null);
  
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
  }, [activeTab, isCreatingGoal, selectedGoalId]);
  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-4 sm:space-y-6">
            {/* Header Section */}
            <header aria-label="Overview Header">
              <OverviewHeader setActiveTab={setActiveTab}/>
            </header>
            
            {/* Stats Row */}
            <section aria-label="Overview Statistics">
              <OverviewStats />
            </section>

            {/* Main Content Grid */}
            <div aria-label="Main Content Grid" className="grid min-w-0 grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.55fr)]">
              <section aria-label="Overview Goals" className="min-w-0">
                <OverviewGoals />
              </section>

              <aside aria-label="Overview Sidebar" className="min-w-0">
                <OverviewSidebar />
              </aside>
            </div>
          </div>
        );
      case 'my-goals':
        if (isCreatingGoal) {
          return <NewGoal onClose={() => setIsCreatingGoal(false)} />;
        }
        if (selectedGoalId !== null) {
          return (
            <GoalDetails
              goalId={selectedGoalId}
              onBack={() => setSelectedGoalId(null)}
            />
          );
        }
        return (
          <MyGoals 
            onCreateGoal={() => setIsCreatingGoal(true)} 
            onSelectGoal={(index) => setSelectedGoalId(String(index))}
          />
        );
      case 'skills':
        return <SkillsAndProficiency />;
      case 'review':
        return (
          <div  className="space-y-4">
            {/* Sub-tabs for Review */}
            <div className="border-b border-gray-200 flex justify-start sm:justify-center overflow-x-auto pb-1">
              <nav className="-mb-px flex space-x-8 min-w-max px-4 sm:px-0" aria-label="Review Tabs">
                {[
                  { id: 'self', name: 'Self Review' },
                  { id: 'peer', name: 'Peer Nomination' },
                  { id: 'final', name: 'Final Rating' },
                ].map((subTab) => {
                  const isActive = activeReviewTab === subTab.id;
                  return (
                    <button
                      key={subTab.id}
                      onClick={() => setActiveReviewTab(subTab.id as any)}
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
              {activeReviewTab === 'self' ? (
                <SelfReview />
              ) : activeReviewTab === 'peer' ? (
                <PeerNominationPage />
              ) : (
                <PerformanceReviewApp />
              )}
            </div>
          </div>
        );
      case 'feedback':
        return <Feedback />;
      default:
        return null;
    }
  };

  return (
    <main ref={topRef} aria-label="Performance Overview" className="min-h-full bg-[#f8fafc] font-sans flex flex-col">
      <div className="mx-auto w-full min-w-0 flex flex-col flex-1">
        
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 px-4 sm:px-6 bg-white flex-shrink-0 overflow-x-auto pb-1">
          <nav className="-mb-px flex space-x-8 min-w-max" aria-label="Tabs">
            {[
              { id: 'overview', name: 'Overview' },
              { id: 'my-goals', name: 'My Goals' },
              { id: 'skills', name: 'Skills' },
              { id: 'review', name: 'Review' },
              { id: 'feedback', name: 'Feedback' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setIsCreatingGoal(false);
                    setSelectedGoalId(null);
                    setActiveTab(tab.id as any);
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
        <div className={(isCreatingGoal || selectedGoalId !== null) && activeTab === 'my-goals' ? "flex-1 flex flex-col min-h-0" : "px-3 py-4 sm:px-4 sm:py-5 lg:px-6 lg:py-6 space-y-4 sm:space-y-6 flex-1 overflow-y-auto"}>
          {renderActiveTabContent()}
        </div>

      </div>
    </main>
  );
};

export default Overview;
