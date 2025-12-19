import { useContext } from 'react'
import { PermissionContext } from '../context/permission/context'

export default function usePermission() {
    const context = useContext(PermissionContext)

    if (!context) {
        throw new Error(
            'usePermission must be used inside PermissionProvider'
        )
    }

    return context.can
}
