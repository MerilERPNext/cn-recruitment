import { JSX } from "react";
import { TeamTrackingView } from "./TeamTrackingView";

const TeamTracking = (): JSX.Element => {
  return <TeamTrackingView title="Team Tracking" showHeader={true} />;
};

export { TeamTrackingView };
export default TeamTracking;

