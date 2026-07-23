import { memo } from 'react';
import { Card } from '../../../../shared/atoms/Card';
import { Typography } from '../../../../shared/atoms/Typography';
import { AutoPullSourceCard } from '../../../../shared/AutoPullSourceCard';
import type { AutoPullSource } from '../../Type';

interface AutoPullCardProps {
    autoPullSources: AutoPullSource[];
    sourceStates: Record<string, boolean>;
    toggleSource: (sourceId: string) => void;
}

export const AutoPullCard = memo(({
    autoPullSources,
    sourceStates,
    toggleSource,
}: AutoPullCardProps) => {
    return (
        <Card className="border border-gray-200 bg-white p-5 shadow-sm" radius="xl" padding="none">
            <div className="mb-4">
                <Typography variant="subheading" className="text-gray-900">
                    Auto-pull progress
                </Typography>
                <Typography variant="caption" className="text-gray-500">
                    Connect a source-of-record to auto-update Current values
                </Typography>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {autoPullSources.map((source) => (
                    <AutoPullSourceCard
                        key={source.id}
                        source={source}
                        isEnabled={!!sourceStates[source.id]}
                        onToggle={toggleSource}
                    />
                ))}
            </div>
        </Card>
    );
});
