import React, { useMemo } from "react";
import { Check, Clock, X, User } from "lucide-react";
import StatusBadge from "../../shared/atoms/statusBadge";
import { FlowRequestStage } from "../../../types/flows";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import { useApprovalAction } from "../../../hooks/userApprovalList";
import useCurrentUser from "../../../hooks/useCurrentUser";
import TeamApprovalActionPill from "../../shared/atoms/TeamApprovalActionPill";

  const getIcon = (status: string) => {
    const iconProps = { size: 20, strokeWidth: 3, className: "text-white" };

    switch (status) {
      case "Completed":
      case "Approved":
        return <Check {...iconProps} />;
      case "In Progress":
      case "Pending":
        return <Clock {...iconProps} />;
      case "Failed":
      case "Rejected":
        return <X {...iconProps} />;
      default:
        return <User {...iconProps} />;
    }
  };

  const getBgColor = (status: string) => {
    switch (status) {
      case "Completed":
      case "Approved":
        return "bg-green-500";
      case "In Progress":
        return "bg-yellow-500";
      case "Failed":
      case "Rejected":
        return "bg-red-500";
      case "Pending":
      default:
        return "bg-gray-400";
    }
  };

interface RequestTimelineProps {
  stages: FlowRequestStage[];
}

const RequestTimeline: React.FC<RequestTimelineProps> = ({ stages }) => {
  return (
    <div className="relative flex flex-col items-start px-4 py-6">
      {stages.map((stage, index) => 
      <RequestDetailCard stage={stage} index={index} stages={stages} />
      )}

      {/* RequestDetailsCard End Indicator */}
      <div className="flex items-center gap-2 text-green-600 text-sm font-medium mt-2 ml-7">
        <Check size={18} strokeWidth={3} /> TimeLine up to date
      </div>
    </div>
  );
};

interface RequestDetailCardProps{
  stage: FlowRequestStage;
  index: number;
  stages: FlowRequestStage[];
};


const RequestDetailCard = ({stage, index, stages } : RequestDetailCardProps) =>{
     const isCompleted = stage.status === "Completed" || stage.status === "Approved";
        const nextStage = stages[index + 1];
        const lineColor =
          isCompleted && nextStage?.status !== "Failed" && nextStage?.status !== "Rejected"
            ? "bg-green-500"
            : "bg-gray-300";

            const actions = stage?.todo?.custom_doctype_actions
          ? JSON.parse(stage?.todo?.custom_doctype_actions)
          : [];
      const actionsWithForm = stage?.todo?.custom_doctype_actions_with_form
          ? JSON.parse(stage?.todo?.custom_doctype_actions_with_form.replace(/'/g, '"'))
          : [];


     
      const isActive = useMemo(()=>{
         const activeStageIndex = stages.findIndex((stage) => stage.status === "Pending");
         return activeStageIndex === index;
      },[index, stages]); 
  
      const { handleAction } = useApprovalAction();
  
      const onAction = (action: string, data: any) => {
          handleAction(
              action,
              {
                  todo_id: data.name,
                  custom_approval_type: data.custom_approval_type,
                  custom_open_chatnext_assistant_on_action: actionsWithForm.includes(action)
              });
      };
      const { data: currentUser } = useCurrentUser();
  
      const canPerformActions = useMemo(() => {
          if (!isActive) return false;
          let actionPermission = false;
  
          if (stage?.todo?.custom_allocated_to_users && currentUser?.name)
              actionPermission = stage?.todo?.custom_allocated_to_users.includes(currentUser?.name);
  
          if (currentUser?.roles && stage?.todo?.custom_assigned_to_roles)
              actionPermission ||= currentUser.roles.some(
                  (role) => stage?.todo?.custom_assigned_to_roles?.includes(role.role),
              );
  
          return actionPermission;
      }, [currentUser, stage, isActive]);
  

  return (
          <div
            key={`${stage.stage_name}-${index}`}
            className="relative flex gap-4 w-full last:mb-0 mb-10"
          >
            {/* RequestDetailsCard Left Column */}
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
                    canPerformActions ? "In Progress" : stage.status
                  )}`}
                >
                  {getIcon(canPerformActions ? "In Progress" : stage.status)}
                </div>
              </div>
            </div>

            {/* Stage Card */}
            <div className="flex-1 min-w-0">
              <div className="bg-white shadow-sm border border-gray-200 rounded-xl px-4 py-4 hover:shadow-md transition-all">

                {/* Header: Stage Info & Status */}
                <div className="flex justify-between items-start gap-3 mb-3">
                  <div className="flex flex-col gap-1">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Stage {index + 1}
                    </div>
                    <h3 className="font-semibold text-gray-900 text-base leading-tight break-words">
                      {stage.stage_name}
                    </h3>
                  </div>
                  <div className="flex-shrink-0">
                    <StatusBadge status={stage.status} />
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-gray-100 w-full mb-3" />

                {/* Body: Details */}
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Assigned To</span>
                    <span className="font-medium text-gray-900 text-right truncate pl-2 max-w-[60%]">
                      {stage.todo.custom_allocated_to_users || stage.todo.custom_assigned_to_roles || "-"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Action By</span>
                    <span className="font-medium text-gray-900 text-right truncate pl-2 max-w-[60%]">
                      {stage.approval_time ? (stage.user || "-") : "-"}
                    </span>
                  </div>

                  {stage.approval_time && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Date</span>
                      <span className="font-medium text-gray-900 text-right">
                        {formatToIndianDate(stage.approval_time)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              {canPerformActions &&
                    <TeamApprovalActionPill
                        actions={actions}
                        status={stage?.todo?.status}
                        recordId={stage?.todo?.name}
                        // loadingAction={loadingAction}
                        onAction={(action) => onAction(action, stage?.todo)}
                        variant="buttons"
                    /> 
                }
            </div>
          </div>
        );
}

export default RequestTimeline;
