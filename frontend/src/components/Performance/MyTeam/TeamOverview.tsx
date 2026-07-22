import React, { useEffect, useState } from "react";
import { useScreenSize } from "../../../hooks/useScreenSize";
import HeroCard from "./components/TeamOverview/HeroCard";
import OverviewStats from "./components/TeamOverview/OverviewStats";
import TeamTable from "./components/TeamOverview/TeamTable";
import { OVERVIEW_STATS, OVERVIEW_TEAM_MEMBERS } from "./mockData";

import TeamGoals from "./TeamGoals";
import TeamReviews from "./TeamReviews";
import TeamCalibration from "./TeamCalibration";
import TeamCheckIns from "./TeamCheckIns";

const TeamOverviewContent: React.FC<{ isCompact: boolean, setActiveTab: React.Dispatch<React.SetStateAction<"overview" | "goals" | "reviews" | "calibration" | "check-ins">> }> = ({ isCompact, setActiveTab }) => {
  return (
    <div className="space-y-4 sm:space-y-5">
      <HeroCard setActiveTab={setActiveTab} isCompact={isCompact} />
      <OverviewStats isCompact={isCompact} stats={OVERVIEW_STATS} />
      <TeamTable isCompact={isCompact} members={OVERVIEW_TEAM_MEMBERS} />
    </div>
  );
};

const TeamOverview: React.FC = () => {
  const { isMobile, isTablet } = useScreenSize();
  const isCompact = isMobile || isTablet;
  const [activeTab, setActiveTab] = useState<'overview' | 'goals' | 'reviews' | 'calibration' | 'check-ins'>('overview');
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
  }, [activeTab]);

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <TeamOverviewContent setActiveTab={setActiveTab} isCompact={isCompact} />;
      case 'goals':
        return <TeamGoals />;
      case 'reviews':
        return <TeamReviews />;
      case 'calibration':
        return <TeamCalibration />;
      case 'check-ins':
        return <TeamCheckIns />;
      default:
        return null;
    }
  };

  return (
    <main ref={topRef} className="min-h-full bg-[#f6f8fb] font-sans flex flex-col">
      <div className="w-full min-w-0 flex flex-col flex-1">
        
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 px-4 sm:px-10 bg-white flex-shrink-0 overflow-x-auto pb-1">
          <nav className="-mb-px flex space-x-8 min-w-max" aria-label="Team Tabs">
            {[
              { id: 'overview', name: 'Overview' },
              { id: 'goals', name: 'Team Goals' },
              { id: 'reviews', name: 'Reviews' },
              { id: 'calibration', name: 'Calibration' },
              { id: 'check-ins', name: 'Check-Ins' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
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
        <div className={`flex-1 overflow-y-auto ${isMobile ? "px-3 py-4" : isTablet ? "px-4 py-5" : "p-8"}`}>
          {renderActiveTabContent()}
        </div>

      </div>
    </main>
  );
};

export default TeamOverview;
