import { FlowRequestStage, WorkflowStage } from "../types/flows";
import { FormIOComponent } from "../types/formio";

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

export interface FormIOForm {
  display: string;
  components: FormIOComponent[];
}

export const buildFormFromSchemaAndAnswer = (
  schema?: FormIOComponent[],
  answer?: Record<string, any>
): FormIOForm => {
  if (!schema) return { display: "form", components: [] };

  const components = schema
    .filter((comp) => comp.key !== "submit")
    .map((component) => {
      const key = component?.key;

      if (key && answer && answer[key] !== undefined) {
        return {
          ...component,
          defaultValue: answer[key],
        };
      }

      return component;
    });

  return {
    display: "form",
    components,
  };
};