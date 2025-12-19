import React, { useMemo } from 'react'
import { RawPermission, PermissionCheckArgs } from './permission/types'
import { normalizePermissions, hasPermission } from './permission/utils'
import { PermissionContext } from './permission/context'

type PermissionProviderProps = {
    permissions: RawPermission[]
    children: React.ReactNode
}

const PermissionProvider: React.FC<PermissionProviderProps> = ({
    permissions,
    children
}) => {
    const normalizedPermissions = useMemo(
        () => normalizePermissions(permissions),
        [permissions]
    )
    const can = useMemo(
        () => (args: PermissionCheckArgs) =>
            hasPermission(args, normalizedPermissions),
        [normalizedPermissions]
    )

    return (
        <PermissionContext.Provider value={{ can }}>
            {children}
        </PermissionContext.Provider>
    )
}

export { PermissionProvider }
