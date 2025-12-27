import FrappeAPI from "../utils/frappeAPI";

export interface UiPermissionAction {
  enabled: boolean;
  action_name: string;
}
export interface UiPermissionPage {
  page_name: string;
  enabled: boolean;
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
