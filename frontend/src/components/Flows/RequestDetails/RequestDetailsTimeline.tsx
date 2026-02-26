/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo } from "react";
import { Check, Clock, X, User } from "lucide-react";
import StatusBadge from "../../shared/atoms/statusBadge";
import { FlowRequestStage } from "../../../types/flows";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import { useApprovalAction } from "../../../hooks/userApprovalList";
import useCurrentUser from "../../../hooks/useCurrentUser";
import TeamApprovalActionPill from "../../shared/atoms/TeamApprovalActionPill";
import { extractRolesAndUsers } from "../../../utils/flowUtils";
import AllocatedToTooltip from "../../shared/AllocatedToTooltip";
import { Typography } from "../../shared/atoms/Typography";

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
  activeStageIndex: number;
}

const RequestTimeline: React.FC<RequestTimelineProps> = ({ stages, activeStageIndex }) => {
  return (
    <div className="relative flex flex-col items-start px-4 py-6">
      {stages.map((stage, index) =>
        <RequestDetailCard stage={stage} index={index} stages={stages} isActive={index === activeStageIndex} />
      )}
    </div>
  );
};

interface RequestDetailCardProps {
  stage: FlowRequestStage;
  index: number;
  stages: FlowRequestStage[];
  isActive: boolean;
};


const RequestDetailCard = ({ stage, index, stages, isActive }: RequestDetailCardProps) => {
  const isCompleted = stage.status === "Completed" || stage.status === "Approved";
  const nextStage = stages[index + 1];

  const actions = stage?.todo?.custom_doctype_actions
    ? JSON.parse(stage?.todo?.custom_doctype_actions)
    : [];
  const actionsWithForm = stage?.todo?.custom_doctype_actions_with_form
    ? JSON.parse(stage?.todo?.custom_doctype_actions_with_form.replace(/'/g, '"'))
    : [];

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

  const allocatedTo = useMemo(() => extractRolesAndUsers(stage), [stage]);
  const canPerformActions = useMemo(() => {
    if (!isActive) return false;
    let actionPermission = false;

    if (allocatedTo?.users && currentUser?.name)
      actionPermission = allocatedTo.users.includes(currentUser?.name);

    if (currentUser?.roles && allocatedTo?.roles)
      actionPermission ||= currentUser.roles.some(
        (role) => allocatedTo.roles.includes(role.role),
      );

    return actionPermission;
  }, [currentUser, isActive, allocatedTo]);

  const lineColor =
    isCompleted && nextStage?.status !== "Failed" && nextStage?.status !== "Rejected"
      ? "bg-green-500"
      : "bg-gray-300";

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
          {canPerformActions && (
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
        <div className="bg-white rounded-2xl border-t-4 border-x-1 border-b-1 border-x-primary/20 border-b-primary/20 shadow-sm border-primary px-4 py-4 transition-all">

          {/* Header: Stage Info & Status */}
          <div className="flex justify-between items-start gap-3 mb-3">
            <div className="flex flex-col gap-1">
              <Typography variant="mobileCardLabel" className="block text-gray-500 uppercase tracking-wide">
                Stage {index + 1}
              </Typography>
              <Typography variant="mobileCardTitle" className="break-words">
                {stage.stage_name}
              </Typography>
            </div>
            <div className="flex-shrink-0">
              <StatusBadge status={stage.status} />
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-100 w-full mb-3" />

          {/* Body: Details */}
          <div className="space-y-2.5">
            <div className="flex justify-between items-start text-sm gap-4">
              <Typography variant="mobileCardLabel" className="block text-gray-500 shrink-0 mt-0.5">
                Assigned To
              </Typography>
              <div className="flex-1 min-w-0 flex justify-end">
                <AllocatedToTooltip
                  users={allocatedTo.users}
                  roles={allocatedTo.roles}
                  position="bottom"
                >
                  <Typography variant="mobileCardValue" className="text-right truncate cursor-pointer mt-0.5">
                    {allocatedTo.users.length > 0
                      ? `${allocatedTo.users[0]}${allocatedTo.users.length > 1 ? ` (+${allocatedTo.users.length - 1})` : ""}`
                      : allocatedTo.roles.length > 0
                        ? `${allocatedTo.roles[0]}${allocatedTo.roles.length > 1 ? ` (+${allocatedTo.roles.length - 1})` : ""}`
                        : "-"}
                  </Typography>
                </AllocatedToTooltip>
              </div>
            </div>

            <div className="flex justify-between items-start text-sm gap-4">
              <Typography variant="mobileCardLabel" className="block text-gray-500 shrink-0 mt-0.5">
                Action By
              </Typography>
              <Typography variant="mobileCardValue" className="text-right flex-1 min-w-0 truncate mt-0.5">
                {stage.approval_time ? (stage.user || "-") : "-"}
              </Typography>
            </div>

            {stage.approval_time && (
              <div className="flex justify-between items-start text-sm gap-4">
                <Typography variant="mobileCardLabel" className="block text-gray-500 shrink-0 mt-0.5">
                  Date
                </Typography>
                <Typography variant="mobileCardValue" className="text-right flex-1 min-w-0 mt-0.5">
                  {formatToIndianDate(stage.approval_time)}
                </Typography>
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
