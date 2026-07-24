import Badge from '../../../../shared/Badge';
import { Card } from '../../../../shared/atoms/Card';
import { Typography } from '../../../../shared/atoms/Typography';
import type { KeyResult } from '../DefineGoal';

interface LivePreviewCardProps {
    weightage: number;
    keyResults: KeyResult[];
}

export const LivePreviewCard = ({
    weightage,
    keyResults,
}: LivePreviewCardProps) => {
    return (
        <aside className="space-y-4">
            <Card className="overflow-hidden border border-gray-800 bg-gray-950 p-0 text-white shadow-sm" radius="xl" padding="none">
                <div className="border-b border-white/10 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    Live Preview - how your manager will see it
                </div>
                <div className="p-4">
                    <div className="rounded-xl bg-white p-4 text-gray-900">
                        <div className="mb-3 flex flex-wrap gap-2">
                            <Badge label="OKR" variant="purple" size="sm" />
                            <Badge label="Individual" variant="default" size="sm" />
                            <Badge label="Draft" variant="default" size="sm" />
                        </div>

                        <Typography variant="bodyMedium" className="text-sm font-semibold text-gray-900">
                            Ship Oxygen 2.0 dashboard to 100% of PW employees
                        </Typography>

                        <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-gray-500">
                            <span>{weightage}% weight</span>
                            <span>Q1-Q3 FY26</span>
                            <span>{keyResults.length} KRs</span>
                        </div>

                        <div className="mt-3 space-y-2">
                            {keyResults.map((result, index) => (
                                <div key={result.id} className="grid grid-cols-[auto_1fr_52px] items-center gap-2 text-[11px]">
                                    <Badge label={result.id} variant="purple" size="sm" />
                                    <span className="truncate text-gray-600">{result.title}</span>
                                    <div className="h-1 rounded-md bg-gray-200">
                                        <div className="h-full rounded-md bg-blue-500" style={{ width: `${index === 0 ? 72 : index === 1 ? 28 : 0}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <Typography variant="caption" className="mt-3 block text-gray-400">
                        Updates as you type - approval required from Rohit Khanna
                    </Typography>
                </div>
            </Card>

            <Card className="border bg-[#fffdf1] p-4 shadow-sm" radius="xl" padding="none">
                <Typography variant="bodyMedium" className="font-semibold text-amber-800">
                    3 KRs is the minimum for OKR
                </Typography>
                <Typography variant="caption" className="mt-1 block text-amber-700">
                    Most high-performing PW OKRs have 3-4 KRs. More than 5 dilutes focus.
                </Typography>
            </Card>
        </aside>
    );
};
