import React from "react";
import { useScreenSize } from "../../../hooks/useScreenSize";
import HeroCard from "./components/TeamOverview/HeroCard";
import TeamTable from "./components/TeamOverview/TeamTable";

const TeamOverview: React.FC = () => {
  const { isMobile, isTablet } = useScreenSize();
  const isCompact = isMobile || isTablet;

  return (
    <div className="space-y-4 sm:space-y-5">
      <HeroCard isCompact={isCompact} />
      <TeamTable isCompact={isCompact} />
    </div>
  );
};

export default TeamOverview;
