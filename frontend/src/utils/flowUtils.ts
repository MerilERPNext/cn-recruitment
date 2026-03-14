import { FlowRequestStage, WorkflowStage } from "../types/flows";

export const extractRolesAndUsers = (stage: FlowRequestStage | WorkflowStage) => {
  const roles = stage?.todo?.custom_assigned_to_roles?.map(role => role.role) ?? [];
  const users = stage?.todo?.custom_allocated_to_users?.map(user => user.user) ?? [];

    const allocatedTo = stage?.todo?.allocated_to;
    if (allocatedTo && typeof allocatedTo === "string") {
      users.push(allocatedTo);
    }

  const role = stage?.todo?.role;
    if (role && typeof role === "string") {
      roles.push(role);
    }

  return {
    roles: [...new Set(roles)],
    users: [...new Set(users)],
  };
};