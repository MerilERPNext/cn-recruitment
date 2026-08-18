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
    <div className="space-y-4 sm:space-y-5">
      <HeroCard isCompact={isCompact} />
      <OverviewStats isCompact={isCompact} stats={OVERVIEW_STATS} />
      <TeamTable isCompact={isCompact} members={OVERVIEW_TEAM_MEMBERS} />
    </div>
  );
};

export default TeamOverview;
