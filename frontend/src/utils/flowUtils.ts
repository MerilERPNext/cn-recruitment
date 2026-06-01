import { FlowRequestStage, WorkflowStage, RoleAssignedUsersType } from "../types/flows";
import { FormIOComponent } from "../types/formio";
import { allocatedToType } from "../types/allocatedToTooltip";

export const extractRolesAndUsers = (stage: FlowRequestStage | WorkflowStage) => {
  const roles = stage?.todo?.custom_assigned_to_roles?.map(role => role.role) ?? [];
  const users = stage?.todo?.custom_allocated_to_users?.map(user => user.user) ?? [];

  const allocatedTo = stage?.todo?.allocated_to;
  if (allocatedTo && typeof allocatedTo === "string") {
    users.push(allocatedTo);
  }

  if (stage?.todo?.role && typeof stage?.todo?.role === "string") {
    roles.push(...stage?.todo?.role?.split(",")?.map((role) => role.trim()) || []);
  }

  return {
    roles: [...new Set(roles)],
    users: [...new Set(users)],
  };
};

type mixUserStructure = string | { user: string };

export const extractAllocatedToUserArray = (users: mixUserStructure[]) => {
  return users
    .map((user) => {
      if (typeof user === "string") {
        return user;
      }
      return user?.user ?? "";
    })
    .filter((user) => Boolean(user));

}

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


export const getFileComponents = (components: FormIOComponent[]): FormIOComponent[] => {
  const result: FormIOComponent[] = [];

  const traverse = (comps: FormIOComponent[]) => {
    comps.forEach((comp) => {
      if (!comp) return;

      if (comp.type === "file" && comp.key) {
        result.push(comp);
      }

      if (Array.isArray(comp.components)) {
        traverse(comp.components);
      }

      if (Array.isArray(comp.columns)) {
        comp.columns.forEach((col: any) =>
          traverse(col.components || [])
        );
      }

      if (Array.isArray(comp.rows)) {
        comp.rows.forEach((row: any[]) =>
          row.forEach((col: any) =>
            traverse(col.components || [])
          )
        );
      }
    });
  };

  traverse(components);
  return result;
};

/**
 * Robustly matches an actor (by email/name/employee ID) against allocated users and role-assigned users
 * to retrieve their details (display name and employee ID).
 */
export const getStageActorDetails = (
  allocatedTo?: allocatedToType[],
  roleAssignedUsers?: RoleAssignedUsersType[],
  primaryId?: string | null,
  secondaryId?: string | null
): { name: string; employee: string } | null => {
  if (!primaryId && !secondaryId) return null;

  const idsToMatch = [primaryId, secondaryId].filter(Boolean) as string[];

  // 1. Try matching against allocated_to array
  if (allocatedTo && allocatedTo.length > 0) {
    for (const u of allocatedTo) {
      const match = idsToMatch.some(
        (id) =>
          u.name === id ||
          u.employee === id ||
          u.user_id === id ||
          u.email === id
      );
      if (match) {
        return {
          name: u.name || (primaryId ? primaryId.split("@")[0] : ""),
          employee: u.employee || "",
        };
      }
    }
  }

  // 2. Try matching against role_assigned_users
  if (roleAssignedUsers && roleAssignedUsers.length > 0) {
    for (const r of roleAssignedUsers) {
      const uList = r.users || r.user || [];
      for (const u of uList) {
        const match = idsToMatch.some(
          (id) =>
            u.user_id === id ||
            u.name === id ||
            u.employee === id
        );
        if (match) {
          return {
            name: u.name,
            employee: u.employee || "",
          };
        }
      }
    }
  }

  // 3. Fallback to extracting name from secondaryId or primaryId
  const fallbackName = secondaryId || (primaryId ? primaryId.split("@")[0] : "");
  return {
    name: fallbackName,
    employee: "",
  };
};