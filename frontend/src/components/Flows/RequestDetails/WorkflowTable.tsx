/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useMemo } from "react";
import { FlowRequestItem, WorkflowStage } from "../../../types/flows";
import CardTable from "../../shared/CardTable";
import { Typography } from "../../shared/atoms/Typography";
import { NoDataFound } from "../../shared/atoms/NoDataFound";
import StatusBadge from "../../shared/atoms/statusBadge";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import useCurrentUser from "../../../hooks/useCurrentUser";
import { useApprovalAction } from "../../../hooks/userApprovalList";
import { useScreenSize } from "../../../hooks/useScreenSize";
import Button from "../../shared/atoms/Button";
import { Check, Clock, User, X, Info } from "lucide-react";
import { extractRolesAndUsers } from "../../../utils/flowUtils";
import AllocatedToTooltip from "../../shared/AllocatedToTooltip";
import { useQueryClient } from "@tanstack/react-query";

interface WorkflowTableProps {
  data: FlowRequestItem;
}

const titles = ["Stage No.", "Status", "Due Date", "Actions"];

const WorkflowTable: React.FC<WorkflowTableProps> = ({ data }) => {
  const { isDesktop } = useScreenSize();
  const EmptyState = () => {
    return (
      <NoDataFound
        title="No Records Found"
        subtitle="No workflow records available."
      />
    );
  };

  const workflowPending = data?.workflow_status === "Pending";

  return (
    <div className="sm:px-7 px-4">
      <CardTable titles={titles}>
        {isDesktop ? (
          <div className="w-full overflow-x-auto rounded-lg  border border-gray-200 bg-white shadow-sm">
            <div className="w-full">
              {data.workflow_stages.length > 0 ? (
                data.workflow_stages.map((stage, idx) => (
                  <WorkflowCard
                    key={idx}
                    stage={stage}
                    idx={idx}
                    isActive={workflowPending && stage.status === "Pending"}
                    isLast={idx === data.workflow_stages.length - 1}
                  />
                ))
              ) : (
                <EmptyState />
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 py-2">
            {data.workflow_stages.length > 0 ? (
              data.workflow_stages.map((stage, idx) => (
                <WorkflowCard
                  key={idx}
                  stage={stage}
                  idx={idx}
                  isActive={workflowPending && stage.status === "Pending"}
                  isLast={idx === data.workflow_stages.length - 1}
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
}: {
  stage: WorkflowStage;
  idx: number;
  isActive: boolean;
  isLast: boolean;
}) => {
  const actions = stage?.todo?.custom_doctype_actions
    ? JSON.parse(stage?.todo?.custom_doctype_actions)
    : [];
  const actionsWithForm = stage?.todo?.custom_doctype_actions_with_form
    ? JSON.parse(
        stage?.todo?.custom_doctype_actions_with_form.replace(/'/g, '"'),
      )
    : [];

  const { isDesktop } = useScreenSize();

  const queryClient = useQueryClient();
  const triggerRefetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["employee-flow-requests"] });
    queryClient.invalidateQueries({ queryKey: ["separation-employee"] });
  }, [queryClient]);

  const { handleAction } = useApprovalAction(triggerRefetch);

  const onAction = (action: string, data: any) => {
    handleAction(
      action,
      {
        todo_id: data.name,
        custom_approval_type: data.custom_approval_type,
        custom_open_chatnext_assistant_on_action:
          !actionsWithForm.includes(action),
      },
      "Action Performed Successfully",
    );
  };
  const { data: currentUser } = useCurrentUser();

  const allocatedTo = useMemo(() => extractRolesAndUsers(stage), [stage]);

  const canPerformActions = useMemo(() => {
    if (!isActive) return false;
    let actionPermission = false;

    if (allocatedTo?.users && currentUser?.name)
      actionPermission = allocatedTo.users.includes(currentUser?.name);

    if (currentUser?.roles && allocatedTo?.roles)
      actionPermission ||= currentUser.roles.some((role) =>
        allocatedTo.roles.includes(role.role),
      );

    return actionPermission;
  }, [currentUser, isActive, allocatedTo]);

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

  return isDesktop ? (
    <div
      key={idx}
      className="hover:bg-gray-100 py-4 text-center grid grid-cols-4 cursor-pointer text-xs w-full border-b"
    >
      <div>
        {" "}
        <Typography variant="bodySmall" className="font-medium text-center">
          {idx + 1}
        </Typography>
      </div>

      <div>
        {" "}
        <AllocatedToTooltip
          position="right"
          users={allocatedTo.users}
          roles={allocatedTo.roles}
        >
          <StatusBadge status={stage.status || "-"} />
        </AllocatedToTooltip>
      </div>
      <div>
        {" "}
        <Typography variant="bodySmall" className="font-medium text-center">
          {formatToIndianDate(stage.todo.date) || "-"}
        </Typography>
      </div>

      <div>
        {" "}
        <Typography variant="bodySmall" className="font-medium text-center">
          {canPerformActions && actions.length > 0 && (
            <Button onClick={() => onAction(actions[0], stage?.todo)}>
              Act
            </Button>
          )}
        </Typography>
      </div>
    </div>
  ) : (
    <div key={idx} className="relative flex gap-4 w-full last:mb-0 mb-10 pl-2">
      {/* Connector and Icon (Timeline Left Column) */}
      <div className="relative flex flex-col items-center">
        {/* Connector Line */}
        {!isLast && (
          <div
            className={`absolute top-5 left-1/2 -translate-x-1/2 w-0.5 bg-gray-300  ${getBgColor(
              isActive ? "In Progress" : stage.status || "Pending",
            )}`}
            style={{ height: "calc(100% + 2.5rem)", zIndex: 0 }}
          ></div>
        )}

        <div className="relative flex items-center justify-center">
          {isActive && (
            <>
              <span className="absolute w-10 h-10 rounded-full bg-yellow-400/40 animate-pulse-wave"></span>
              <span className="absolute w-10 h-10 rounded-full bg-yellow-400/30 animate-pulse-wave delay-500"></span>
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
        <div className="bg-white rounded-2xl border-t-4 border-x-1 border-b-1 border-x-primary/20 border-b-primary/20 shadow-sm border-primary px-4 py-4 transition-all">
          <div className="flex justify-between items-start gap-3 mb-3">
            <div className="flex flex-col gap-1">
              <Typography
                variant="mobileCardLabel"
                className="block text-gray-500 uppercase tracking-wide"
              >
                Stage {idx + 1}
              </Typography>
              <Typography variant="mobileCardTitle" className="break-words">
                {stage.target_name || stage.target || "-"}
              </Typography>
            </div>
            <div className="flex-shrink-0">
              <StatusBadge status={stage.status || "-"} />
            </div>
          </div>

          <div className="h-px bg-gray-100 w-full mb-3" />

          <div className="space-y-2.5">
            {/* Assign To Users */}
            {allocatedTo.users.length > 0 && (
              <div className="flex justify-between items-start text-sm gap-4">
                <Typography
                  variant="mobileCardLabel"
                  className="block text-gray-500 shrink-0 mt-0.5"
                >
                  Assign To Users
                </Typography>
                <div className="flex-1 min-w-0 flex justify-end">
                  <AllocatedToTooltip
                    users={allocatedTo.users}
                    roles={allocatedTo.roles}
                    position="bottom"
                  >
                    <div className="flex items-center gap-1 cursor-pointer">
                      <Typography
                        variant="mobileCardValue"
                        className="text-right truncate mt-0.5"
                      >
                        {`${allocatedTo.users[0]}${allocatedTo.users.length > 1 ? ` (+${allocatedTo.users.length - 1})` : ""}`}
                      </Typography>
                      <Info className="w-3.5 h-3.5 text-primary-400 shrink-0" />
                    </div>
                  </AllocatedToTooltip>
                </div>
              </div>
            )}

            {/* Assign To Roles */}
            {allocatedTo.roles.length > 0 && (
              <div className="flex justify-between items-start text-sm gap-4">
                <Typography
                  variant="mobileCardLabel"
                  className="block text-gray-500 shrink-0 mt-0.5"
                >
                  Assign To Roles
                </Typography>
                <AllocatedToTooltip
                  users={allocatedTo.users}
                  roles={allocatedTo.roles}
                  position="bottom"
                >
                  <Typography
                    variant="mobileCardValue"
                    className="text-right flex-1 min-w-0 truncate mt-0.5 flex items-center gap-1"
                  >
                    {`${allocatedTo.roles[0]}${allocatedTo.roles.length > 1 ? ` (+${allocatedTo.roles.length - 1})` : ""}`}
                    <Info className="w-3.5 h-3.5 text-primary-400 shrink-0" />
                  </Typography>
                </AllocatedToTooltip>
              </div>
            )}

            {/* Fallback if neither users nor roles */}
            {allocatedTo.users.length === 0 &&
              allocatedTo.roles.length === 0 && (
                <div className="flex justify-between items-start text-sm gap-4">
                  <Typography
                    variant="mobileCardLabel"
                    className="block text-gray-500 shrink-0 mt-0.5"
                  >
                    Assigned To
                  </Typography>
                  <Typography
                    variant="mobileCardValue"
                    className="text-right flex-1 min-w-0 mt-0.5"
                  >
                    -
                  </Typography>
                </div>
              )}

            <div className="flex justify-between items-start text-sm gap-4">
              <Typography
                variant="mobileCardLabel"
                className="block text-gray-500 shrink-0 mt-0.5"
              >
                Date
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

        {canPerformActions && actions.length > 0 && (
          <div className="mt-3">
            <Button
              className="w-full"
              onClick={() => onAction(actions[0], stage?.todo)}
            >
              Act
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkflowTable;
