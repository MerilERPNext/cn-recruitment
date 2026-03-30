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

/**
 * Normalize file URLs for Form.io preview
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
const normalizeFileValue = (files: any[]): any[] => {
  if (!Array.isArray(files)) return [];

  return files.map((file) => {
    const baseUrl = file?.data?.baseUrl || "";

    // actual stored file path (correct one)
    const filePath =
      file?.data?.message?.file_url ||
      file?.file_url ||
      file?.url ||
      "";

    // build full URL
    const fullUrl = filePath.startsWith("http")
      ? filePath
      : `${baseUrl}${filePath}`;

    // detect doc types that browsers can't preview
    const isDocFile = /\.(doc|docx)$/i.test(fullUrl);

    return {
      ...file,
      name: file?.originalName || file?.name || "file",
      url: isDocFile
        ? `https://docs.google.com/gview?url=${encodeURIComponent(
          fullUrl
        )}&embedded=true`
        : fullUrl,
      originalUrl: fullUrl, // keep original for download if needed
    };
  });
};

/**
 * Build Form.io form with prefilled answers (READ ONLY PREVIEW MODE)
 */
export const buildFormFromSchemaAndAnswer = (
  schema?: FormIOComponent[],
  answer?: Record<string, unknown>
): FormIOForm => {
  if (!schema) {
    return { display: "form", components: [] };
  }

  const components = schema
    .filter((comp) => comp.key !== "submit")
    .map((component) => {
      const key = component?.key;
      const value = key ? answer?.[key] : undefined;

      if (key && value !== undefined) {
        // ✅ Handle FILE component
        if (component.type === "file" && Array.isArray(value)) {
          return {
            ...component,
            defaultValue: normalizeFileValue(value),
            disabled: true, // read-only
          };
        }

        // ✅ Handle normal fields
        return {
          ...component,
          defaultValue: value,
          disabled: true, // read-only mode
        };
      }

      // no answer → still make read-only
      return {
        ...component,
        disabled: true,
      };
    });

  return {
    display: "form",
    components,
  };
};