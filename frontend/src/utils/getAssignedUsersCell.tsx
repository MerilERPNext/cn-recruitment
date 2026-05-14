/* eslint-disable @typescript-eslint/no-explicit-any */
import { ReactNode } from "react";
import AllocatedToTooltip from "../components/shared/AllocatedToTooltip";

export const getStageAssignedUsersCell = (
  stage: any,
  roleAssignedUsers: any[] = [],
  position: "left" | "right" | "top" | "bottom" = "left",
  textWrapper?: (text: string) => ReactNode
) => {
  if (!stage) return textWrapper ? textWrapper("—") : <span>—</span>;

  if (stage.role) {
    const totalUsers =
      roleAssignedUsers?.reduce(
        (acc: number, r: any) => acc + (r.users?.length || r.user?.length || 0),
        0,
      ) ?? 0;

    const text = `Assign(${totalUsers})`;
    return (
      <AllocatedToTooltip
        title="Assigned To"
        RoleAssignedUsers={roleAssignedUsers}
        roles={stage.role.split(',').map((r: string) => r.trim())}
        position={position}
      >
        {textWrapper ? textWrapper(text) : <span>{text}</span>}
      </AllocatedToTooltip>
    );
  }

  const label = `${stage?.designation_name || stage?.stage_name || "-"}(1) `;
  const users = stage.allocated_to?.length
    ? stage.allocated_to
    : stage.user
      ? [{ name: stage.user, employee: stage.employee_id, designation_name: stage.designation_name }]
      : [];

  return (
    <AllocatedToTooltip
      title="Assigned To"
      users={users}
      position={position}
    >
      {textWrapper ? textWrapper(label) : <span>{label}</span>}
    </AllocatedToTooltip>
  );
};

export const getAssignedUsersCell = (item: any) => {
  const stages: any[] = item?.approval_stages_status ?? [];
  const fallback = stages[stages.length - 1];

  // The active stage is the first one that is not "Approved"
  const activeStage =
    stages.find((s) => s.status?.toLowerCase() !== "approved") ?? fallback;

  return getStageAssignedUsersCell(
    activeStage,
    item?.role_assigned_users,
    "left"
  );
};
