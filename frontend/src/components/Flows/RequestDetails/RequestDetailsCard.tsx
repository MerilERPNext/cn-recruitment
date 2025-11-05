import React from "react";
import { Check, Clock, X, User } from "lucide-react";
import Badge from "../../shared/Badge";

type StageDataType = {
  stageNumber: number;
  stageName: string;
  assignedTo: string;
  actionTakenBy: string;
  status: string;
  triggerDate: string;
  dueDate: string;
  completedDate?: string | null;
  actions: string;
};

interface TimelineProps {
  stages: StageDataType[];
}

const Timeline: React.FC<TimelineProps> = ({ stages }) => {
  const getIcon = (status: string) => {
    const iconProps = { size: 20, strokeWidth: 3, className: "text-white" };

    switch (status) {
      case "Completed":
        return <Check {...iconProps} />;
      case "In Progress":
        return <Clock {...iconProps} />;
      case "Failed":
        return <X {...iconProps} />;
      case "Pending":
      default:
        return <User {...iconProps} />;
    }
  };

  const getBgColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-green-500";
      case "In Progress":
        return "bg-yellow-500";
      case "Failed":
        return "bg-red-500";
      case "Pending":
      default:
        return "bg-gray-400";
    }
  };

  return (
    <div className="relative flex flex-col items-start px-4 py-6">
      {stages.map((stage, index) => {
        const isCompleted = stage.status === "Completed";
        const nextStage = stages[index + 1];
        const lineColor =
          isCompleted && nextStage?.status !== "Failed"
            ? "bg-green-500"
            : "bg-gray-300";

        return (
          <div
            key={stage.stageNumber}
            className="relative flex gap-4 w-full last:mb-0 mb-10"
          >
            {/* Timeline Left Column */}
            <div className="relative flex flex-col items-center">
              {/* Connector Line */}
              {index !== stages.length - 1 && (
                <div
                  className={`absolute top-5 left-1/2 -translate-x-1/2 w-0.5 ${lineColor}`}
                  style={{
                    height: "calc(100% + 2.5rem)",
                    zIndex: 0,
                  }}
                ></div>
              )}

              {/* Circle Icon */}
              <div className="relative flex items-center justify-center">
                {stage.status === "In Progress" && (
                  <>
                    <span className="absolute w-10 h-10 rounded-full bg-yellow-400/40 animate-pulse-wave"></span>
                    <span className="absolute w-10 h-10 rounded-full bg-yellow-400/30 animate-pulse-wave delay-500"></span>
                  </>
                )}
                <div
                  className={`z-10 rounded-full p-2.5 shadow-md flex items-center justify-center ${getBgColor(
                    stage.status
                  )}`}
                >
                  {getIcon(stage.status)}
                </div>
              </div>
            </div>

            {/* Stage Card */}
            <div className="flex-1">
              <div className="bg-white shadow-sm border border-gray-200 rounded-xl px-4 py-3 hover:shadow-md transition-all">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-500">
                    {new Date(stage.triggerDate).toLocaleDateString()}
                  </span>
                  <Badge
                    backgroundColor={
                      stage.status === "Completed"
                        ? "bg-green-100 text-green-700"
                        : stage.status === "In Progress"
                        ? "bg-yellow-100 text-yellow-700"
                        : stage.status === "Failed"
                        ? "bg-red-100 text-red-700"
                        : "bg-gray-100 text-gray-600"
                    }
                    label={stage.status}
                    size="sm"
                  />
                </div>

                {/* Stage Number */}
                <div className="text-gray-500 text-sm font-semibold mb-0.5">
                  Stage {stage.stageNumber}
                </div>

                {/* Stage Name */}
                <h3 className="font-semibold text-gray-800 mt-0.5">
                  {stage.stageName}
                </h3>

                <p className="text-sm text-gray-600 mt-1">
                  Assigned to{" "}
                  <span className="font-medium">{stage.assignedTo}</span>{" "}
                  &nbsp;|&nbsp; Action taken by{" "}
                  <span className="font-medium">{stage.actionTakenBy}</span>
                </p>

                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>
                    Due: {new Date(stage.dueDate).toLocaleDateString()}
                  </span>
                  {stage.completedDate && (
                    <span>
                      Completed:{" "}
                      {new Date(stage.completedDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Timeline End Indicator */}
      <div className="flex items-center gap-2 text-green-600 text-sm font-medium mt-2 ml-7">
        <Check size={18} strokeWidth={3} /> Timeline up to date
      </div>
    </div>
  );
};

export default Timeline;
