import { FlowRequestStage, WorkflowStage } from "../types/flows";

export const extractRolesAndUsers = (stage: FlowRequestStage | WorkflowStage) => {
  const roles = stage?.todo?.custom_assigned_to_roles?.map(role => role.role) ?? [];
  const users = stage?.todo?.custom_allocated_to_users?.map(user => user.user) ?? [];

  if (stage?.todo?.allocated_to && typeof stage.todo.allocated_to === "string") {
    users.push(stage.todo.allocated_to);
  }

  if (stage?.todo?.role && typeof stage.todo.role === "string") {
    roles.push(stage.todo.role);
  }

  return {
    roles: [...new Set(roles)],
    users: [...new Set(users)],
  };
};