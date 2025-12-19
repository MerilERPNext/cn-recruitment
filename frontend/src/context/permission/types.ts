import { UiPermissionModule } from "../../services/permissionService";

export type RawPermission = UiPermissionModule;

export type PermissionMap = {
    [app: string]: {
        enabled: boolean
        pages: {
            [page: string]: {
                enabled: boolean
                actions: {
                    [action: string]: boolean
                }
            }
        }
    }
}

export type PermissionCheckArgs = {
    app: string
    page?: string
    action?: string
}
