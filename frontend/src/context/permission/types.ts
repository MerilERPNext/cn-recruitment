export type RawPermission = {
    app_name: string
    enabled: boolean
    pages: {
        page_name: string
        enabled: boolean
        actions: {
            action_name: string
            enabled: boolean
        }[]
    }[]
}

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
