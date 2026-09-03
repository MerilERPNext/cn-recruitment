/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useMemo } from "react";
import {
  FlowRequestItem,
  WorkflowStage,
} from "../../../../types/flows";

import { useQueryClient } from "@tanstack/react-query";
import { Check, Clock, User, X } from "lucide-react";
import useCurrentUser from "../../../../hooks/useCurrentUser";
import {
  handleActionType,
  useApprovalAction,
} from "../../../../hooks/userApprovalList";
import { useScreenSize } from "../../../../hooks/useScreenSize";
import {
  extractRolesAndUsers,
} from "../../../../utils/flowUtils";
import formatToIndianDate from "../../../../utils/formatToIndianDate";
import { getStageAssignedUsersCell } from "../../../../utils/getAssignedUsersCell";
import AllocatedToTooltip from "../../../shared/AllocatedToTooltip";
import { NoDataFound } from "../../../shared/atoms/NoDataFound";
import StatusBadge from "../../../shared/atoms/statusBadge";
import { Typography } from "../../../shared/atoms/Typography";
import CardTable from "../../../shared/CardTable";
import MobileAllocatedTo from "../../../shared/MobileAllocatedTo";
import Tooltip from "../../../shared/Tooltip";
import WorkflowStageActions from "./WorkflowStageActions";

interface WorkflowTableProps {
  data: FlowRequestItem;
  noPadding?: boolean;
}

const titles = [
  "Stage Name",
  "Assigned To",
  "Action Taken By",
  "Status",
  "Actual Trigger Date",
  "Due Date",
  "Last Retriggered On",
  "Actions",
];

const columnWidths = ["1fr", "150px", "250px", "150px", "150px", "150px", "150px", "150px"];
const gridTemplate = columnWidths.join(" ");

const WorkflowTable: React.FC<WorkflowTableProps> = ({ data, noPadding = false }) => {
  const { isDesktop } = useScreenSize();
  const queryClient = useQueryClient();

  const triggerRefetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["employee-flow-requests"] });
    queryClient.invalidateQueries({
      queryKey: ["employee-flow-request-details"],
    });
    queryClient.invalidateQueries({ queryKey: ["separation-employee"] });
  }, [queryClient]);

  const { handleAction } = useApprovalAction(triggerRefetch);

  const EmptyState = () => (
    <NoDataFound
      title="No Records Found"
      subtitle="No workflow records available."
    />
  );

  const workflowPending = data?.workflow_status === "Pending";

  return (
    <div className={noPadding ? "px-4 sm:px-0" : "sm:px-7 px-4"}>
      <CardTable
        titles={titles}
        columnWidths={columnWidths}
        noBorder={noPadding}
        noShadow={noPadding}
        noRound={noPadding}
      >
        {isDesktop ? (
          <div className={noPadding ? "w-full overflow-x-auto bg-white" : "w-full overflow-x-auto rounded-lg border border-border bg-white shadow-sm"}>
            <div className="w-full">
              {data.workflow_stages.length > 0 ? (
                data.workflow_stages.map((stage, idx) => (
                  <WorkflowCard
                    key={idx}
                    stage={stage}
                    idx={idx}
                    isActive={workflowPending && stage.status === "Pending"}
                    isLast={idx === data.workflow_stages.length - 1}
                    handleAction={handleAction}
                  />
                ))
              ) : (
                <EmptyState />
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 py-2 px-2">
            {data.workflow_stages.length > 0 ? (
              data.workflow_stages.map((stage, idx) => (
                <WorkflowCard
                  key={idx}
                  stage={stage}
                  idx={idx}
                  isActive={workflowPending && stage.status === "Pending"}
                  isLast={idx === data.workflow_stages.length - 1}
                  handleAction={handleAction}
                />
              ))
            ) : (
              <EmptyState />
            )}
          </div>
        )}
      </CardTable>
    </div>
  );
};

const WorkflowCard = ({
  stage,
  idx,
  isActive,
  isLast,
  handleAction,
}: {
  stage: WorkflowStage;
  idx: number;
  isActive: boolean;
  isLast: boolean;
  handleAction: handleActionType;
}) => {
  const { isDesktop } = useScreenSize();
  const { data: currentUser } = useCurrentUser();

  // Build allocatedTo from todo's custom_assigned_to_roles + role_assigned_users
  // mirroring how approval_stages uses stage.role + stage.role_assigned_users
  const stageForExtract = useMemo(
    () => ({
      ...stage,
      // workflow stages carry role info inside todo, expose it at stage level for extractRolesAndUsers
      role:
        stage.todo?.custom_assigned_to_roles
          ?.map((r: any) => r.role)
          .join(",") ||
        stage.role ||
        null,
      role_assigned_users:
        stage.role_assigned_users ?? stage.todo?.role_assigned_users ?? [],
      allocated_to:
        stage.allocated_to ?? stage.todo?.allocated_to_details ?? [],
    }),
    [stage],
  );

  const allocatedTo = useMemo(
    () => extractRolesAndUsers(stageForExtract),
    [stageForExtract],
  );

  const canPerformActions = useMemo(() => {
    if (!isActive || !stage.can_act) return false;
    let actionPermission = false;

    if (allocatedTo?.users && currentUser?.name)
      actionPermission = allocatedTo.users.includes(currentUser?.name);

    if (currentUser?.roles && allocatedTo?.roles)
      actionPermission ||= currentUser.roles.some((role) =>
        allocatedTo.roles.includes(role.role),
      );

    return actionPermission;
  }, [currentUser, isActive, allocatedTo, stage.can_act]);

  // Actual Trigger Date — the todo creation timestamp is when the stage was actually triggered
  const actualTriggerDate = stage.todo?.creation ?? null;

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

  return (
    <>
      {isDesktop ? (
        <div
          key={idx}
          className="hover:bg-gray-50 py-4 px-6 text-center grid cursor-pointer text-xs w-full border-b border-border gap-4 transition-colors"
          style={{ gridTemplateColumns: gridTemplate }}
        >
          {/* Stage Name */}
          <div className="flex justify-center items-center min-w-0 px-2">
            <Tooltip content={stage.trigger_title || "-"} position="top">
              <Typography
                variant="bodySmall"
                className="font-medium text-center truncate max-w-[350px] block cursor-pointer"
              >
                {stage.trigger_title || "-"}
              </Typography>
            </Tooltip>
          </div>

          {/* Assigned To */}
          <div className="flex justify-center items-center">
            {getStageAssignedUsersCell(
              stageForExtract,
              stageForExtract.role_assigned_users,
              "right",
              (text) => (
                <Typography
                  variant="bodySmall"
                  className="font-medium text-center text-primary-600 cursor-pointer underline"
                >
                  {text}
                </Typography>
              ),
            )}
          </div>

          {/* Action Taken By */}
          <div className="flex justify-center items-center overflow-hidden">
            {stage?.action_taken_by ? (
              <Tooltip
                content={stage?.action_taken_by}
              >
                <Typography
                  variant="bodySmall"
                  className="font-medium truncate text-center cursor-pointer text-primary-600 hover:underline"
                >
                  {stage?.action_taken_by_name}
                </Typography>
              </Tooltip>
            ) : (
              <Typography
                variant="bodySmall"
                className="font-medium text-center"
              >
                -
              </Typography>
            )}
          </div>

          {/* Status */}
          <div className="flex justify-center items-center">
            <AllocatedToTooltip
              position="right"
              users={stageForExtract.allocated_to}
              roles={allocatedTo.roles}
              RoleAssignedUsers={stageForExtract.role_assigned_users}
            >
              <StatusBadge status={stage.status || "-"} />
            </AllocatedToTooltip>
          </div>

          {/* Actual Trigger Date */}
          <div className="flex justify-center items-center">
            <Typography variant="bodySmall" className="font-medium text-center">
              {formatToIndianDate(actualTriggerDate) || "-"}
            </Typography>
          </div>

          {/* Due Date */}
          <div className="flex justify-center items-center">
            <Typography variant="bodySmall" className="font-medium text-center">
              {formatToIndianDate(stage.todo?.date) || "-"}
            </Typography>
          </div>

          {/* Last Retriggered On */}
          <div className="flex justify-center items-center">
            <Typography variant="bodySmall" className="font-medium text-center">
              {stage.reinitiated_on ? formatToIndianDate(stage.reinitiated_on) : "-"}
            </Typography>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <WorkflowStageActions
              stage={stage}
              handleAction={handleAction}
              variant="pill"
              canAct={canPerformActions}
              idx={idx}
            />
          </div>
        </div>
      ) : (
        <div
          key={idx}
          className="relative flex gap-4 w-full last:mb-0 mb-10 pl-2"
        >
          {/* Timeline connector */}
          <div className="relative flex flex-col items-center">
            {!isLast && (
              <div
                className={`absolute top-5 left-1/2 -translate-x-1/2 w-0.5 bg-gray-300 ${getBgColor(
                  isActive ? "In Progress" : stage.status || "Pending",
                )}`}
                style={{ height: "calc(100% + 2.5rem)", zIndex: 0 }}
              />
            )}
            <div className="relative flex items-center justify-center">
              {isActive && (
                <>
                  <span className="absolute w-10 h-10 rounded-full bg-yellow-400/40 animate-pulse-wave" />
                  <span className="absolute w-10 h-10 rounded-full bg-yellow-400/30 animate-pulse-wave delay-500" />
                </>
              )}
              <div
                className={`z-10 rounded-full p-2.5 shadow-md flex items-center justify-center ${getBgColor(
                  isActive ? "In Progress" : stage.status || "Pending",
                )}`}
              >
                {getIcon(isActive ? "In Progress" : stage.status || "Pending")}
              </div>
            </div>
          </div>

          {/* Stage Card */}
          <div className="flex-1 min-w-0 pr-2 pb-2">
            <div className="bg-white rounded-2xl border-t-4 border-x-1 border-b-1 border-x-primary/20 border-b-primary/20 shadow-sm border-primary px-4 py-4 transition-all overflow-hidden">
              <div className="flex justify-between items-start gap-3 mb-3">
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <Typography
                    variant="mobileCardLabel"
                    className="block text-gray-500 uppercase tracking-wide"
                  >
                    Stage {idx + 1}
                  </Typography>
                  <Typography
                    variant="mobileCardTitle"
                    className="cursor-pointer max-w-[240px] block"
                  >
                    <Tooltip
                      content={stage.trigger_title || "-"}
                      position="bottom"
                    >
                      {stage.trigger_title || "-"}
                    </Tooltip>
                  </Typography>
                </div>
                <div className="flex-shrink-0">
                  <StatusBadge status={stage.status || "-"} />
                </div>
              </div>

              <div className="h-px bg-gray-100 w-full mb-3" />

              <div className="space-y-2.5">
                {/* Assigned To */}
                <div className="flex items-start text-sm gap-2">
                  <Typography
                    variant="mobileCardLabel"
                    className="block text-gray-500 shrink-0 mt-0.5 whitespace-nowrap"
                  >
                    Assigned To
                  </Typography>
                  <div className="flex-1 min-w-0 overflow-hidden flex justify-end">
                    <MobileAllocatedTo
                      users={stageForExtract.allocated_to}
                      roles={allocatedTo.roles}
                      showLabel={false}
                      RoleAssignedUsers={stageForExtract.role_assigned_users}
                    />
                  </div>
                </div>

                {/* Action Taken By */}
                {stage?.action_taken_by_name && (
                  <div className="flex justify-between items-start text-sm gap-4">
                    <Typography
                      variant="mobileCardLabel"
                      className="block text-gray-500 shrink-0 mt-0.5 whitespace-nowrap"
                    >
                      Action Taken By
                    </Typography>
                    <Tooltip
                      content={stage?.action_taken_by}
                    >
                      <Typography
                        variant="mobileCardValue"
                        className="text-right flex-1 min-w-0 mt-0.5 text-primary-600"
                      >
                        {stage?.action_taken_by_name}
                      </Typography>
                    </Tooltip>
                  </div>
                )}

                {/* Actual Trigger Date */}
                <div className="flex justify-between items-start text-sm gap-4">
                  <Typography
                    variant="mobileCardLabel"
                    className="block text-gray-500 shrink-0 mt-0.5 whitespace-nowrap"
                  >
                    Trigger Date
                  </Typography>
                  <Typography
                    variant="mobileCardValue"
                    className="text-right flex-1 min-w-0 mt-0.5"
                  >
                    {formatToIndianDate(actualTriggerDate) || "-"}
                  </Typography>
                </div>

                {/* Due Date */}
                <div className="flex justify-between items-start text-sm gap-4">
                  <Typography
                    variant="mobileCardLabel"
                    className="block text-gray-500 shrink-0 mt-0.5"
                  >
                    Due Date
                  </Typography>
                  <Typography
                    variant="mobileCardValue"
                    className="text-right flex-1 min-w-0 mt-0.5"
                  >
                    {formatToIndianDate(stage.todo?.date) || "-"}
                  </Typography>
                </div>
              </div>
            </div>

            <WorkflowStageActions
              stage={stage}
              handleAction={handleAction}
              variant="buttons"
              canAct={canPerformActions}
              idx={idx}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default WorkflowTable;
