import React from "react";
import { ApprovalStage } from "../../../types/expenseAdvance";
import Tooltip from "../../shared/Tooltip";
import { Check, X, Clock } from "lucide-react";

interface ApprovalStagesProgressProps {
  stages: ApprovalStage[];
}

// --- Utility Functions for Status Visuals (Unchanged) ---
const getStageColor = (status: ApprovalStage["status"]) => {
  switch (status) {
    case "Approved":
      return "bg-green-500";
    case "Rejected":
      return "bg-red-500";
    case "Pending":
    case "Draft":
    default:
      return "bg-yellow-400";
  }
};

const getStatusIcon = (status: ApprovalStage["status"]) => {
  switch (status) {
    case "Approved":
      return <Check size={14} className="text-white" />;
    case "Rejected":
      return <X size={14} className="text-white" />;
    case "Pending":
    case "Draft":
    default:
      return <Clock size={14} className="text-gray-900" />;
  }
};

// --- ApprovalStagesProgress Component (Horizontal Layout) ---

const ApprovalStagesProgress: React.FC<ApprovalStagesProgressProps> = ({
  stages,
}) => {
  if (!stages || stages.length === 0) {
    return (
      <p className="text-sm text-gray-500 italic">
        No approval stages defined.
      </p>
    );
  }

  const totalStages = stages.length;

  let activeIndex = stages.findIndex(
    (stage) => stage.status === "Pending" || stage.status === "Rejected"
  );

  if (activeIndex === -1) {
    activeIndex = totalStages;
  }

  // FIX: Use a consistent pixel offset for alignment.
  // 16px aligns with the circle center (size-8 circle = 32px diameter, radius = 16px).
  const ALIGNMENT_OFFSET_PX = 16;
  const MAX_LABEL_WIDTH = totalStages > 5 ? 80 : 100;

  return (
    <div className="flex flex-col space-y-2 w-full px-2 pt-2">
      {/* 1. Progress Bar / Connector Lines */}
      <div className="flex w-full items-center relative h-2">
        {/* Full gray background bar */}
        <div className="absolute top-1/2 left-4 right-4 h-1 bg-gray-300 transform -translate-y-1/2 rounded-full"></div>

        {stages.map((stage, index) => {
          const isCompleted =
            index < activeIndex && stage.status === "Approved";
          const isCurrent =
            index === activeIndex && stage.status !== "Rejected";
          const isFailed = stage.status === "Rejected";

          let circleBgClass = "bg-gray-300";
          // FIX: Revert logic to show number for inactive/future stages
          let circleIconContent: React.ReactNode = (
            <span className="text-gray-900 text-sm font-semibold">
              {index + 1}
            </span>
          );

          if (isFailed) {
            circleBgClass = "bg-red-500";
            circleIconContent = getStatusIcon(stage.status);
          } else if (isCompleted) {
            circleBgClass = "bg-green-500";
            circleIconContent = getStatusIcon(stage.status);
          } else if (isCurrent) {
            circleBgClass = getStageColor(stage.status);
            circleIconContent = getStatusIcon(stage.status);
          }

          // Line segment coloring logic
          let segmentColor = "bg-gray-300";
          if (index > 0) {
            const previousStage = stages[index - 1];
            if (previousStage.status === "Approved") {
              segmentColor = getStageColor("Approved"); // Green
            }
          }

          const leftPosition =
            totalStages === 1 ? 50 : (index / (totalStages - 1)) * 100;

          return (
            <React.Fragment key={index}>
              {/* Colored segment leading up to this circle (if not the first one) */}
              {index > 0 && (
                <div
                  className={`absolute top-1/2 h-1 transform -translate-y-1/2 transition-colors duration-300 ${segmentColor}`}
                  style={{
                    left: `${((index - 1) / (totalStages - 1)) * 100}%`,
                    width: `${(1 / (totalStages - 1)) * 100}%`,
                    padding: "0 16px",
                    boxSizing: "border-box",
                  }}
                />
              )}

              <div
                className="absolute top-1/2 transform -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${leftPosition}%` }}
              >
                <Tooltip
                  content={
                    <div className="flex flex-col text-left text-xs space-y-1 p-1">
                      <p>
                        <strong>Status:</strong> {stage.status}
                      </p>
                      <p>
                        <strong>Stage:</strong> {stage.stage_name || "—"}
                      </p>
                      <p>
                        <strong>Role:</strong> {stage.role || "—"}
                      </p>
                      <p>
                        <strong>User:</strong> {stage.user || "—"}
                      </p>
                    </div>
                  }
                >
                  {/* Stage Circle */}
                  <div
                    className={`flex size-8 items-center justify-center rounded-full border-4 border-white shadow-md transition-colors duration-300 ${circleBgClass}`}
                  >
                    {circleIconContent}
                  </div>
                </Tooltip>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* 2. Labels below the Circles */}
      <div
        className="flex w-full justify-start relative pt-4"
        style={{ height: "24px" }}
      >
        {stages.map((stage, index) => {
          const isCompleted = index < activeIndex;
          const isCurrent =
            index === activeIndex && stage.status !== "Rejected";
          const isFailed = stage.status === "Rejected";

          let labelColorClass = "text-gray-500";

          if (isFailed) {
            labelColorClass = "text-red-600 font-bold";
          } else if (isCompleted) {
            labelColorClass = "text-gray-900 font-semibold";
          } else if (isCurrent) {
            labelColorClass = "text-yellow-600 font-bold";
          }

          const leftPosition =
            totalStages === 1 ? 50 : (index / (totalStages - 1)) * 100;

          // FIX: Recalculate transform based on the stage index to force boundary alignment.
          let alignmentStyle: React.CSSProperties = {};

          if (totalStages > 1) {
            if (index === 0) {
              // First label: Align left edge to the center of the first circle (0% + 16px)
              alignmentStyle = {
                left: `${ALIGNMENT_OFFSET_PX}px`,
                transform: "translateX(0%)",
              };
            } else if (index === totalStages - 1) {
              // Last label: Align right edge to the center of the last circle (100% - 16px)
              alignmentStyle = {
                right: `${ALIGNMENT_OFFSET_PX}px`,
                transform: "translateX(100%)",
              };
            } else {
              // Middle labels: Center aligned to the circle
              alignmentStyle = {
                left: `${leftPosition}%`,
                transform: "translateX(-50%)",
              };
            }
          } else {
            // Single stage: Center alignment
            alignmentStyle = { left: `50%`, transform: "translateX(-50%)" };
          }

          return (
            <div
              key={index}
              className="absolute text-center min-w-0 px-1"
              style={{
                ...alignmentStyle,
                // Apply max width for middle items, allowing boundary items more freedom
                maxWidth:
                  index > 0 && index < totalStages - 1
                    ? `${MAX_LABEL_WIDTH}px`
                    : "none",
                minWidth: "50px",
              }}
            >
              {/* Status Label */}
              <p
                className={`text-xs whitespace-nowrap overflow-hidden text-ellipsis ${labelColorClass}`}
              >
                {stage.status === "Draft" ? "Pending" : stage.status}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ApprovalStagesProgress;
