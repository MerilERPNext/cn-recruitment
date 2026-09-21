import FrappeAPI from "../utils/frappeAPI";

export interface UiPermissionAction {
  enabled: boolean;
  action_name: string;
  /** User-facing display name (falls back to action_name if absent). */
  label?: string;
  /** Route path for actions that navigate, e.g. /webapp/expenses-app/add-expense */
  url?: string;
  /** Modal identifier for actions that open a modal, e.g. "request-leave" */
  modal_key?: string;
}
export interface UiPermissionPage {
  page_name: string;
  enabled: boolean;
  /** User-facing display name (falls back to page_name if absent). */
  label?: string;
  /** Frontend route path for this page, e.g. /webapp/expenses-app/expenses-list */
  url?: string;
  /** Modal identifier if this page opens a popup modal, e.g. "request-leave" */
  modal_key?: string;
  actions: UiPermissionAction[];
}

export interface UiPermissionModule {
  app_name: string;
  enabled: boolean;
  pages: UiPermissionPage[];
}

export type UiPermissionResponse = UiPermissionModule[];

export const permissionService = {
  getUiPermission: async (appName?: string): Promise<UiPermissionResponse> => {
    const response = await FrappeAPI.callMethod(
      "nextai.api.permission.moduler_ui_perm.get_list",
      {
        ...(appName ? { app_name: appName } : {}),
      }
    );

    return response as UiPermissionResponse;
  },
};