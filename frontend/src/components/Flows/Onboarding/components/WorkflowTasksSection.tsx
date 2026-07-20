/* eslint-disable @typescript-eslint/no-explicit-any */
import { memo, useMemo, useCallback } from "react";
import CardTable from "../../../shared/CardTable";
import { Typography } from "../../../shared/atoms/Typography";
import SearchInput from "./SearchInput";
import type { WorkflowStage } from "../../../../types/flows";
import { useQueryClient } from "@tanstack/react-query";
import useCurrentUser from "../../../../hooks/useCurrentUser";
import { useApprovalAction } from "../../../../hooks/userApprovalList";
import { extractRolesAndUsers } from "../../../../utils/flowUtils";
import { getStageAssignedUsersCell } from "../../../../utils/getAssignedUsersCell";
import MobileAllocatedTo from "../../../shared/MobileAllocatedTo";
import AllocatedToTooltip from "../../../shared/AllocatedToTooltip";
import StatusBadge from "../../../shared/atoms/statusBadge";
import WorkflowStageActions from "../../FlowRequests/FlowDetails/WorkflowStageActions";

interface WorkflowTasksSectionProps {
  tasks: WorkflowStage[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
  isDesktop: boolean;
}

/**
 * Calculates human-readable time difference between now and a creation date.
 * creation format from API: "2026-07-20 18:01:12.108193"
 */
const getTimeSinceTrigger = (creation: string | undefined): string => {
  if (!creation) return "—";

  try {
    // Normalise Frappe timestamp → ISO-compatible
    const normalized = creation.replace(" ", "T");
    const createdAt = new Date(normalized);

    if (isNaN(createdAt.getTime())) return "-";

    const now = new Date();
    const diffMs = now.getTime() - createdAt.getTime();

    if (diffMs < 0) return "-";

    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays > 0) return `${diffDays}d ${diffHours % 24}h ago`;
    if (diffHours > 0) return `${diffHours}h ${diffMins % 60}m ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return "Just now";
  } catch {
    return "—";
  }
};

const WorkflowTasksSection = ({
  tasks,
  searchQuery,
  onSearchChange,
  isDesktop,
}: WorkflowTasksSectionProps) => {
  const queryClient = useQueryClient();

  const triggerRefetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["onboarding-funnel-activity-details"] });
  }, [queryClient]);

  const { handleAction } = useApprovalAction(triggerRefetch);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <SearchInput value={searchQuery} onChange={onSearchChange} />

        <a href="#" className="shrink-0 text-blue-500 hover:text-blue-700 font-semibold text-sm transition-colors">
          View Detailed Task
        </a>
      </div>

      <CardTable
        titles={[
          "Task Name & Category",
          "Status",
          "Assignee",
          "Time Since Trigger",
          "Actions",
        ]}
        columnWidths={["2fr", "1fr", "1fr", "1fr", "1fr"]}
      >
        {tasks.length > 0 ? (
          tasks.map((task, index) =>
            isDesktop ? (
              <WorkflowDesktopRow key={task.funnel_task || index} task={task} idx={index} handleAction={handleAction} />
            ) : (
              <WorkflowMobileRow key={task.funnel_task || index} task={task} idx={index} handleAction={handleAction} />
            )
          )
        ) : (
          <div className="p-8 text-center text-slate-400 text-sm">
            No tasks found
          </div>
        )}
      </CardTable>
    </div>
  );
};

const WorkflowDesktopRow = memo(({ task, idx, handleAction }: { task: WorkflowStage, idx: number, handleAction: any }) => {
  const { data: currentUser } = useCurrentUser();

  const stageForExtract = useMemo(
    () => ({
      ...task,
      role:
        task.todo?.custom_assigned_to_roles
          ?.map((r: any) => r.role)
          .join(",") ||
        task.role ||
        null,
      role_assigned_users:
        task.role_assigned_users ?? task.todo?.role_assigned_users ?? [],
      allocated_to:
        task.allocated_to ?? task.todo?.allocated_to_details ?? [],
    }),
    [task],
  );

  const allocatedTo = useMemo(
    () => extractRolesAndUsers(stageForExtract),
    [stageForExtract],
  );

  const canPerformActions = useMemo(() => {
    if (task.status !== "Pending" || !task.can_act) return false;
    let actionPermission = false;

    if (allocatedTo?.users && currentUser?.name)
      actionPermission = allocatedTo.users.includes(currentUser?.name);

    if (currentUser?.roles && allocatedTo?.roles)
      actionPermission ||= currentUser.roles.some((role: any) =>
        allocatedTo.roles.includes(role.role),
      );

    return actionPermission;
  }, [currentUser, task.status, allocatedTo, task.can_act]);

  return (
    <div
      className="grid gap-4 px-6 py-4 border-b border-slate-100 items-center hover:bg-slate-50/50 transition-colors text-sm"
      style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr" }}
    >
      <div className="flex flex-col justify-center items-center min-w-0 px-2">
        <Typography variant="bodySmall" className="font-medium text-center truncate w-full block text-slate-800">
          {task.trigger_title || "-"}
        </Typography>
      </div>
      <div className="flex justify-center items-center">
        <AllocatedToTooltip
          position="right"
          users={stageForExtract.allocated_to}
          roles={allocatedTo.roles}
          RoleAssignedUsers={stageForExtract.role_assigned_users}
        >
          <StatusBadge status={task.status || "—"} />
        </AllocatedToTooltip>
      </div>
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
      <div className="flex justify-center items-center">
        <Typography variant="bodySmall" className="font-medium text-center text-slate-600">
          {getTimeSinceTrigger(task.todo?.creation)}
        </Typography>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <WorkflowStageActions
          stage={task}
          handleAction={handleAction}
          variant="pill"
          canAct={canPerformActions}
          idx={idx}
        />
      </div>
    </div>
  );
});

const WorkflowMobileRow = memo(({ task, idx, handleAction }: { task: WorkflowStage, idx: number, handleAction: any }) => {
  const { data: currentUser } = useCurrentUser();

  const stageForExtract = useMemo(
    () => ({
      ...task,
      role:
        task.todo?.custom_assigned_to_roles
          ?.map((r: any) => r.role)
          .join(",") ||
        task.role ||
        null,
      role_assigned_users:
        task.role_assigned_users ?? task.todo?.role_assigned_users ?? [],
      allocated_to:
        task.allocated_to ?? task.todo?.allocated_to_details ?? [],
    }),
    [task],
  );

  const allocatedTo = useMemo(
    () => extractRolesAndUsers(stageForExtract),
    [stageForExtract],
  );

  const canPerformActions = useMemo(() => {
    if (task.status !== "Pending" || !task.can_act) return false;
    let actionPermission = false;

    if (allocatedTo?.users && currentUser?.name)
      actionPermission = allocatedTo.users.includes(currentUser?.name);

    if (currentUser?.roles && allocatedTo?.roles)
      actionPermission ||= currentUser.roles.some((role: any) =>
        allocatedTo.roles.includes(role.role),
      );

    return actionPermission;
  }, [currentUser, task.status, allocatedTo, task.can_act]);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 border-t-4 border-t-primary-500 shadow-sm p-4 sm:p-5 space-y-4 mb-4 transition-all">
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0 flex-1">
          <Typography variant="mobileCardTitle" className="font-medium text-slate-800 block break-words">
            {task.trigger_title || "-"}
          </Typography>
        </div>
        <div className="flex-shrink-0">
          <StatusBadge status={task.status || "—"} />
        </div>
      </div>
      <div className="space-y-2.5 mb-2">
        <div className="flex items-start text-sm gap-2">
          <Typography variant="mobileCardLabel" className="block text-gray-500 shrink-0 mt-0.5 whitespace-nowrap">
            Assignee
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
        <div className="flex justify-between items-start text-sm gap-4">
          <Typography variant="mobileCardLabel" className="block text-gray-500 shrink-0 mt-0.5 whitespace-nowrap">
            Time Since Trigger
          </Typography>
          <Typography variant="mobileCardValue" className="text-right flex-1 min-w-0 mt-0.5 text-slate-600">
            {getTimeSinceTrigger(task.todo?.creation)}
          </Typography>
        </div>
      </div>
      <WorkflowStageActions
        stage={task}
        handleAction={handleAction}
        variant="buttons"
        canAct={canPerformActions}
        idx={idx}
      />
    </div>
  );
});

export default memo(WorkflowTasksSection);
