import { UiPermissionPage as Page } from "../services/permissionService";

interface AppPermission {
  app_name: string;
  enabled: boolean;
  pages: Page[];
}

// Return type for the helper function
interface ActionWithStatus {
  action_name: string;
  enabled: boolean;
}

export function getAllActions(
  userUiPermission: AppPermission[] | undefined,
  pageName?: string
): ActionWithStatus[] {
  if (!userUiPermission) {
    return [];
  }

  return userUiPermission.flatMap((app) =>
    app.pages
      .filter((page) => !pageName || page.page_name === pageName)
      .flatMap((page) => page.actions)
  );
}

// Check if a specific action is enabled
export function isActionEnabled(
  userUiPermission: AppPermission[] | undefined,
  actionName: string,
  pageName?: string
): boolean {
  const actions = getAllActions(userUiPermission, pageName);
  const action = actions.find((a) => a.action_name === actionName);
  return action?.enabled ?? false;
}


export function getActionsEnabled<T extends string>(
  userUiPermission: AppPermission[] | undefined,
  actionNames: T[],
  pageName?: string
): Record<T, boolean> {
  const actions = getAllActions(userUiPermission, pageName);
  return actionNames.reduce((acc, name) => {
    acc[name] = actions.find((a) => a.action_name === name)?.enabled ?? false;
    return acc;
  }, {} as Record<T, boolean>);
}

// Check if a page (by page_name) is enabled, across all apps in the response
// (or within a single app's permission entry).
export function isPageEnabled(
  userUiPermission: AppPermission[] | AppPermission | undefined,
  pageName: string
): boolean {
  if (!userUiPermission) return false;
  const apps = Array.isArray(userUiPermission) ? userUiPermission : [userUiPermission];
  return apps.some((app) =>
    app.pages.some((page) => page.page_name === pageName && page.enabled)
  );
}

