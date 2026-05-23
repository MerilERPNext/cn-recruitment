import React from 'react';
import OverviewHeader from './component/OverviewHeader';
import OverviewStats from './component/OverviewStats';
import OverviewGoals from './component/OverviewGoals';
import OverviewSidebar from './component/OverviewSidebar';
import { useScreenSize } from '../../../hooks/useScreenSize';

const Overview: React.FC = () => {
  const { isMobile, isDesktop } = useScreenSize();

  return (
    <main aria-label="Performance Overview" className={`min-h-full bg-[#f8fafc] overflow-y-auto ${isMobile ? 'p-3' : 'p-6'} font-sans`}>
      <div className="mx-auto max-w-screen space-y-4 sm:space-y-6">

        {/* Header Section */}
        <header aria-label="Overview Header">
          <OverviewHeader />
        </header>
        
        {/* Stats Row */}
        <section aria-label="Overview Statistics">
          <OverviewStats />
        </section>

        {/* Main Content Grid */}
        <div aria-label="Main Content Grid" className={`grid ${!isDesktop ? 'grid-cols-1' : 'grid-cols-[minmax(0,1fr),minmax(320px,0.6fr)]'} gap-4 sm:gap-6`}>
          <section aria-label="Overview Goals">
            <OverviewGoals />
          </section>

          <aside aria-label="Overview Sidebar">
            <OverviewSidebar />
          </aside>
        </div>
      </div>
    </main>
  );
};

export default Overview;
