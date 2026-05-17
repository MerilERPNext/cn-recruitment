import React from 'react';
import OverviewHeader from './component/OverviewHeader';
import OverviewStats from './component/OverviewStats';
import OverviewGoals from './component/OverviewGoals';
import OverviewSidebar from './component/OverviewSidebar';
import { useScreenSize } from '../../../hooks/useScreenSize';

const Overview: React.FC = () => {
  const { isMobile, isDesktop } = useScreenSize();

  return (
    <div className={`min-h-full bg-[#f8fafc] overflow-y-scroll ${isMobile ? 'p-4' : 'p-6'} font-sans`}>
      <div className="max-w-[1200px] mx-auto space-y-6">

        {/* Header Section */}
        <OverviewHeader />
        
        {/* Stats Row */}
        <OverviewStats />

        {/* Main Content Grid */}
        <div className={`grid ${!isDesktop ? 'grid-cols-1' : 'grid-cols-[1fr,0.6fr]'} gap-6`}>
          <OverviewGoals />

          <OverviewSidebar />
        </div>
      </div>
    </div>
  );
};

export default Overview;