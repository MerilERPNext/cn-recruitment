import { FlowRequestStage, WorkflowStage } from "../types/flows";

export const extractRolesAndUsers = (stage : FlowRequestStage | WorkflowStage )=>{
    const roles = stage?.todo?.custom_assigned_to_roles.map(role => role.role);
    const users = stage?.todo?.custom_allocated_to_users.map(user => user.user);

    return { roles, users };
}