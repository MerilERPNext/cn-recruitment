import React from 'react';
import { Card } from './atoms/Card';
import { Typography } from './atoms/Typography';
import { Switch } from './atoms/Switch';
import type { AutoPullSource } from '../Performance/GoalCreation/Type';

export interface AutoPullSourceCardProps {
    source: AutoPullSource;
    isEnabled: boolean;
    onToggle: (sourceId: string) => void;
}

export const AutoPullSourceCard: React.FC<AutoPullSourceCardProps> = ({
    source,
    isEnabled,
    onToggle,
}) => {
    const Icon = source.icon;

    return (
        <Card className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2">
            <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-500">
                    <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                    <Typography variant="bodySmall" className="truncate font-semibold text-gray-900">
                        {source.label}
                    </Typography>
                    <Typography variant="caption" className="block truncate text-gray-500">
                        {source.description}
                    </Typography>
                </div>
            </div>
            <Switch
                checked={isEnabled}
                onCheckedChange={() => onToggle(source.id)}
            />
        </Card>
    );
};

export default React.memo(AutoPullSourceCard);
