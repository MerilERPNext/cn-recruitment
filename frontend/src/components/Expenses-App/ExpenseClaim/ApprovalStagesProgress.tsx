import React from "react";
import { ApprovalStage } from "../../../types/expenseAdvance";
import Tooltip from "../../shared/Tooltip";
import { Check, X, Clock } from "lucide-react";
import formatToIndianDate from "../../../utils/formatToIndianDate";

interface ApprovalStagesProgressProps {
  stages: ApprovalStage[];
}

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

  const ALIGNMENT_OFFSET_PX = 30;

  const MAX_LABEL_WIDTH = totalStages > 5 ? 80 : 100;

  return (
    <div className="flex flex-col space-y-2 w-full px-2 pt-2">
      <div className="flex w-full items-center relative h-2">
        <div className="absolute top-1/2 left-4 right-4 h-1 bg-gray-300 transform -translate-y-1/2 rounded-full"></div>

        {stages.map((stage, index) => {
          const isCompleted =
            index < activeIndex && stage.status === "Approved";
          const isCurrent =
            index === activeIndex && stage.status !== "Rejected";
          const isFailed = stage.status === "Rejected";

          let circleBgClass = "bg-gray-300";
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

          let segmentColor = "bg-gray-300";
          if (index > 0) {
            const previousStage = stages[index - 1];
            if (previousStage.status === "Approved") {
              segmentColor = getStageColor("Approved");
            }
          }

          const leftPosition =
            totalStages === 1 ? 50 : (index / (totalStages - 1)) * 100;

          const tooltipPosition =
            index === 0 ? "tl" : index === totalStages - 1 ? "tr" : undefined;

          return (
            <React.Fragment key={index}>
              {index > 0 && (
                <div
                  className={`absolute top-1/2 h-1 transform -translate-y-1/2 transition-colors duration-300 z-0 ${segmentColor}`}
                  style={{
                    left: `calc(${((index - 1) / (totalStages - 1)) * 100
                      }% + 16px)`,
                    width: `calc(${(1 / (totalStages - 1)) * 100}% - 4px)`,
                  }}
                />
              )}

              <div
                className="absolute top-1/2 transform -translate-x-1/2 -translate-y-1/2"
                style={{ left: `calc(${leftPosition}% + 4px)` }}
              >
                <Tooltip
                  {...(tooltipPosition
                    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    { position: tooltipPosition as any }
                    : {})}
                  content={
                    <div className="flex flex-col text-left text-xs space-y-1 p-1">
                      <p>
                        <strong>Stage:</strong> {stage.stage_name || "—"}
                      </p>
                      {!stage.role &&
                        <p>
                          <strong>User:</strong> {stage.user || "—"} ({stage.employee_id || "—"})
                        </p>
                      }
                      <p>
                        <strong>Role:</strong> {stage?.role || stage?.designation_name || "—"}
                      </p>
                      {stage.status !== "Pending" && (
                        <p>
                          <strong>{stage.status} on: </strong> {formatToIndianDate(stage.approval_time || "—")}
                        </p>
                      )}
                    </div>
                  }
                >
                  <div
                    className={`w-8 h-8 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-full border-4 border-white shadow-md transition-colors duration-300 z-20 box-border ${circleBgClass}`}
                  >
                    {circleIconContent}
                  </div>
                </Tooltip>
              </div>
            </React.Fragment>
          );
        })}
      </div>

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

          let alignmentStyle: React.CSSProperties = {};

          if (totalStages > 1) {
            if (index === 0) {
              alignmentStyle = {
                left: `-${ALIGNMENT_OFFSET_PX - 10}px`,
                transform: "translateX(0%)",
              };
            } else if (index === totalStages - 1) {
              alignmentStyle = {
                right: `${ALIGNMENT_OFFSET_PX}px`,
                transform: "translateX(100%)",
              };
            } else {
              alignmentStyle = {
                left: `${leftPosition}%`,
                transform: "translateX(-50%)",
              };
            }
          } else {
            alignmentStyle = { left: `50%`, transform: "translateX(-50%)" };
          }

          return (
            <div
              key={index}
              className="absolute text-center min-w-0 px-1"
              style={{
                ...alignmentStyle,
                maxWidth:
                  index > 0 && index < totalStages - 1
                    ? `${MAX_LABEL_WIDTH}px`
                    : "none",
                minWidth: "50px",
              }}
            >
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
