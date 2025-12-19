import React from 'react';
import { PermissionCheckArgs } from './types';

export type PermissionContextValue = {
    can: (args: PermissionCheckArgs) => boolean
}

export const PermissionContext = React.createContext<PermissionContextValue | null>(null);
