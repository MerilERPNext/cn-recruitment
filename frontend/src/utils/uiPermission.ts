// Define interfaces for the nested structure
interface Action {
  action_name: string;
  enabled: boolean;
}

interface Page {
  page_name: string;
  enabled: boolean;
  actions: Action[];
}

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
  if (!userUiPermission || userUiPermission.length === 0) {
    return [];
  }

  return userUiPermission.reduce<ActionWithStatus[]>((allActions, app) => {
    const appActions = app.pages
      .filter((page) => !pageName || page.page_name === pageName)
      .reduce<ActionWithStatus[]>((pageActions, page) => {
        return [...pageActions, ...page.actions];
      }, []);
    return [...allActions, ...appActions];
  }, []);
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
