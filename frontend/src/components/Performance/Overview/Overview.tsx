import React from 'react';
import OverviewHeader from './component/OverviewHeader';
import OverviewStats from './component/OverviewStats';
import OverviewGoals from './component/OverviewGoals';
import OverviewSidebar from './component/OverviewSidebar';

const Overview: React.FC = () => {

  return (
    <main aria-label="Performance Overview" className="min-h-full overflow-y-auto overflow-x-hidden bg-[#f8fafc] px-3 py-4 font-sans sm:px-4 sm:py-5 lg:px-6 lg:py-6">
      <div className="mx-auto w-full  min-w-0 space-y-4 sm:space-y-6">

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
    </main>
  );
};

export default Overview;
