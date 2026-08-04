import React from 'react';
import OverviewHeader from './OverviewHeader';
import OverviewStats from './OverviewStats';
import OverviewGoals from './OverviewGoals';
import OverviewSidebar from './OverviewSidebar';

const OverviewDashboard: React.FC = () => {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Section */}
      <header aria-label="Overview Header">
        <OverviewHeader />
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
};

export default OverviewDashboard;
