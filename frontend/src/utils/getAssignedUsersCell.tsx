/* eslint-disable @typescript-eslint/no-explicit-any */
import { ReactNode } from "react";
import AllocatedToTooltip from "../components/shared/AllocatedToTooltip";
import { RoleAssignedUsersType } from "../types/flows";
import { Typography } from "../components/shared/atoms/Typography";

export const getStageAssignedUsersCell = (
  stage: any,
  roleAssignedUsers: RoleAssignedUsersType[] = [],
  position: "left" | "right" | "top" | "bottom" = "left",
  textWrapper?: (text: string) => ReactNode
) => {
  if (!stage) return textWrapper ? textWrapper("—") : <span>—</span>;
  const totalUsers = stage?.assigned_users_count ?? stage?.todo?.assigned_users_count;;
  if (roleAssignedUsers.length > 0) {

    const roles = stage.role ? stage.role.split(',').map((r: string) => r.trim()) : [];

    const text = totalUsers ? `Assign(${totalUsers})` : `AssignRole(${roleAssignedUsers.length})`;
    return (
      <AllocatedToTooltip
        title="Assigned To"
        RoleAssignedUsers={roleAssignedUsers}
        roles={roles}
        position={position}
      >
        {textWrapper ? textWrapper(text) : <Typography color="primary" className="underline">{text}</Typography>}
      </AllocatedToTooltip>
    );
  }

  const users = stage.allocated_to?.length
    ? stage.allocated_to
    : stage.user
      ? [{ name: stage.user, employee: stage.employee_id, designation_name: stage.designation_name }]
      : [];

  const label = (stage?.designation_name || stage?.stage_name || (totalUsers ? `Assign(${totalUsers})` : users.length ? `Assign(${users.length})` : "Not Assigned")) + " ";

  return (
    <AllocatedToTooltip
      title="Assigned To"
      users={users}
      position={position}
    >
      <Typography color="primary" className="underline">

        {textWrapper ? textWrapper(label) : <span>{label}</span>}
      </Typography>
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
