/* eslint-disable @typescript-eslint/no-explicit-any */
import AllocatedToTooltip from "../components/shared/AllocatedToTooltip";

export const getAssignedUsersCell = (item: any) => {
  const stages: any[] = item?.approval_stages_status ?? [];
  const pendingStages = stages.filter((s) => s.status?.toLowerCase() === "pending");
  const pendingWithRole = stages.find((s) => !!s.role);
  const pendingAny = pendingStages[0];
  const fallback = stages[stages.length - 1];

  if (pendingWithRole) {
    const totalUsers =
      item?.role_assigned_users?.reduce(
        (acc: number, r: any) => acc + (r.users?.length || r.user?.length || 0),
        0,
      ) ?? 0;
    return (
      <AllocatedToTooltip
        title="Assigned To"
        RoleAssignedUsers={item?.role_assigned_users}
        roles={[pendingWithRole.role]}
        position="left"
      >
        <span>{`Assign(${totalUsers})`}</span>
      </AllocatedToTooltip>
    );
  }

  const activeStage = pendingAny ?? fallback;
  if (!activeStage) return <span>—</span>;

  const label = `${activeStage.stage_name}(1)`;
  const stageUser: string | undefined = activeStage.user;

  return (
    <AllocatedToTooltip
      title="Assigned To"
      users={stageUser ? [stageUser] : []}
      position="left"
    >
      <span>{label}</span>
    </AllocatedToTooltip>
  );
};
