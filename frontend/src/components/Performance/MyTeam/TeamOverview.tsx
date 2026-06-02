import React from "react";
import { useScreenSize } from "../../../hooks/useScreenSize";
import HeroCard from "./components/TeamOverview/HeroCard";
import OverviewStats from "./components/TeamOverview/OverviewStats";
import TeamTable from "./components/TeamOverview/TeamTable";
import { OVERVIEW_STATS, OVERVIEW_TEAM_MEMBERS } from "./mockData";

const TeamOverview: React.FC = () => {
  const { isMobile, isTablet } = useScreenSize();
  const isCompact = isMobile || isTablet;

  return (
    <main
      className={`min-h-full overflow-y-auto overflow-x-hidden bg-[#f6f8fb] font-sans ${isMobile ? "px-3 py-4" : isTablet ? "px-4 py-5" : "p-8"}`}
    >
      <div className="mx-auto w-full  space-y-4 sm:space-y-5">
        <HeroCard isCompact={isCompact} />
        <OverviewStats isCompact={isCompact} stats={OVERVIEW_STATS} />
        <TeamTable isCompact={isCompact} members={OVERVIEW_TEAM_MEMBERS} />
      </div>
    </main>
  );
};

export default TeamOverview;
