import { Card } from '../../../../shared/atoms/Card';
import { Typography } from '../../../../shared/atoms/Typography';
import type { AutoPullSource } from '../../Type';

interface AutoPullCardProps {
    autoPullSources: AutoPullSource[];
    sourceStates: Record<string, boolean>;
    toggleSource: (sourceId: string) => void;
}

export const AutoPullCard = ({
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
                {autoPullSources.map((source) => {
                    const Icon = source.icon;
                    const isEnabled = sourceStates[source.id];

                    return (
                        <div key={source.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2">
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
                            <button
                                type="button"
                                aria-pressed={isEnabled}
                                aria-label={`${isEnabled ? 'Disable' : 'Enable'} ${source.label} auto-pull`}
                                onClick={() => toggleSource(source.id)}
                                className={`relative h-5 w-9 shrink-0 rounded-md transition-colors ${isEnabled ? 'bg-blue-500' : 'bg-gray-200'}`}
                            >
                                <span
                                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${isEnabled ? '-translate-x-4' : 'translate-x-0.5'}`}
                                />
                            </button>
                        </div>
                    );
                })}
            </div>
        </Card>
    );
};
