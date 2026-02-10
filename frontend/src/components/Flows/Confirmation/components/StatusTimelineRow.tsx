import React from "react";
import StatusTimelineItem from "./StatusTimelineItem";

type timelineDataType = {
  isLast: boolean;
  status: "completed" | "pending" | "action_required" | "rejected" | "default";
};
interface StatusTimelineRowProps {
  gridStyle?: string;
  children: React.ReactNode;
  timelineData: timelineDataType;
}

const StatusTimelineRow: React.FC<StatusTimelineRowProps> = ({
  gridStyle = "grid lg:grid-cols-[60px_1fr] grid-cols-[40px_1fr]",
  children,
  timelineData,
}) => {
  return (
    <div className={`${gridStyle}`}>
      <StatusTimelineItem
        isLast={timelineData.isLast}
        status={timelineData.status}
      />
      {children}
    </div>
  );
};

export default StatusTimelineRow;
