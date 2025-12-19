import { RawPermission, PermissionMap, PermissionCheckArgs } from './types'

export function normalizePermissions(
    rawPermissions: RawPermission[]
): PermissionMap {
    const map: PermissionMap = {}

    rawPermissions.forEach(app => {
        map[app.app_name] = {
            enabled: app.enabled,
            pages: {}
        }

        app.pages.forEach(page => {
            map[app.app_name].pages[page.page_name] = {
                enabled: page.enabled,
                actions: {}
            }

            page.actions.forEach(action => {
                map[app.app_name].pages[page.page_name].actions[
                    action.action_name
                ] = action.enabled
            })
        })
    })

    return map
}

export function hasPermission(
    args: PermissionCheckArgs,
    permissions: PermissionMap
): boolean {
    const { app, page, action } = args

    const appPerm = permissions[app]
    if (!appPerm || !appPerm.enabled) return false

    if (!page) return true

    const pagePerm = appPerm.pages[page]
    if (!pagePerm || !pagePerm.enabled) return false

    if (!action) return true

    return !!pagePerm.actions[action]
}
