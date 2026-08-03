import React from 'react';
import { Search } from 'lucide-react';
import TemplateCard from './TemplateCard';
import { GoalTemplate, TemplateListProps, getGoalKey } from './types';
import { Typography } from '../../../../shared/atoms/Typography';


interface RecommendedTemplatesProps extends TemplateListProps {
    recommendedTemplatesData?: GoalTemplate[];
}

const RecommendedTemplates = ({
    onUseTemplate,
    recommendedTemplatesData = [],
}: RecommendedTemplatesProps) => {
   

    if (recommendedTemplatesData.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-6">
                <Search className="h-8 w-8 text-gray-400 mb-2" />
                <Typography variant="bodyMedium" className="font-semibold text-gray-700">
                    No matching goals found
                </Typography>
                <Typography variant="caption" className="text-gray-500 mt-1">
                    Try refining your search keyword or clearing department/designation filters.
                </Typography>
            </div>
        );
    }

    return (
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
            {recommendedTemplatesData.map((template) => (
                <TemplateCard
                    key={getGoalKey(template)}
                    template={template}
                    onUseTemplate={(t) => {
                        if (t.repository_goals) {
                            onUseTemplate?.(t.repository_goals);
                        } else {
                            onUseTemplate?.(t);
                        }
                    }}
                />
            ))}
        </div>
    );
};

export default React.memo(RecommendedTemplates);

