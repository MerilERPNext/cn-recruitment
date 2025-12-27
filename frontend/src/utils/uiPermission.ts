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
